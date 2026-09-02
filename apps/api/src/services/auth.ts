import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { sessions, users, type UserRow } from "../db/schema.js";
import { HttpError, unauthorized } from "../lib/errors.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { hashToken, newRefreshToken, refreshExpiry, signAccessToken } from "../auth/tokens.js";
import { audit } from "./audit.js";

const MAX_FAILED_ATTEMPTS = 10;
const LOCK_MINUTES = 15;

/** Hash fantasma: mantém o tempo de resposta parecido quando o e-mail não existe. */
const GHOST_HASH = "$2b$10$C6UzMDM.H6dfI/f/IKcEeO5DZk1Xw4l6bLm4b7Wlq5X0wCJbGgqmO";

export interface RequestMeta {
  ip: string;
  userAgent: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshRaw: string;
  refreshExpiresAt: Date;
}

const invalidCredentials = () =>
  new HttpError(401, "INVALID_CREDENTIALS", "E-mail ou senha não batem. Confere e tenta de novo.");

export async function login(email: string, password: string, meta: RequestMeta) {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

  if (!user) {
    await verifyPassword(password, GHOST_HASH);
    await audit({ action: "auth.login_failed", payload: { email, reason: "unknown_email" }, ip: meta.ip });
    throw invalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await audit({ actorId: user.id, action: "auth.login_locked", ip: meta.ip });
    throw new HttpError(
      423,
      "ACCOUNT_LOCKED",
      `Muitas tentativas. Espera ${LOCK_MINUTES} minutos ou fala com o admin.`,
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS;
    await db
      .update(users)
      .set({
        failedAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(users.id, user.id));
    await audit({
      actorId: user.id,
      action: lock ? "auth.lockout" : "auth.login_failed",
      payload: { attempts },
      ip: meta.ip,
    });
    throw invalidCredentials();
  }

  if (user.status !== "ativo") {
    await audit({ actorId: user.id, action: "auth.login_inactive", ip: meta.ip });
    throw new HttpError(403, "USER_INACTIVE", "Seu acesso está desativado. Fala com o admin do Hub.");
  }

  await db
    .update(users)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const tokens = await issueSession(user, randomUUID(), meta);
  await audit({ actorId: user.id, action: "auth.login", ip: meta.ip });
  return { user, tokens };
}

async function issueSession(user: UserRow, familyId: string, meta: RequestMeta): Promise<IssuedTokens> {
  const { raw, hash } = newRefreshToken();
  const expiresAt = refreshExpiry();
  await db.insert(sessions).values({
    userId: user.id,
    refreshHash: hash,
    familyId,
    expiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
  const accessToken = await signAccessToken({ sub: user.id, role: user.role, ver: user.tokenVersion });
  return { accessToken, refreshRaw: raw, refreshExpiresAt: expiresAt };
}

/**
 * Rotação: o refresh usado é revogado e um novo é emitido na mesma família.
 * Se chegar um refresh já revogado, alguém está reusando token → revoga a família toda.
 */
export async function refresh(rawToken: string, meta: RequestMeta) {
  const hash = hashToken(rawToken);
  const [session] = await db.select().from(sessions).where(eq(sessions.refreshHash, hash)).limit(1);
  if (!session) throw unauthorized("INVALID_REFRESH", "Sessão inválida. Faça login de novo.");

  if (session.revokedAt) {
    await db
      .update(sessions)
      .set({ revokedAt: sql`coalesce(${sessions.revokedAt}, now())` })
      .where(eq(sessions.familyId, session.familyId));
    await audit({ actorId: session.userId, action: "auth.refresh_reuse_detected", ip: meta.ip });
    throw unauthorized("SESSION_REVOKED", "Sessão encerrada por segurança. Faça login de novo.");
  }
  if (session.expiresAt <= new Date()) {
    throw unauthorized("SESSION_EXPIRED", "Sua sessão expirou. Faça login de novo.");
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.status !== "ativo") {
    throw unauthorized("USER_INACTIVE", "Seu acesso está desativado. Fala com o admin do Hub.");
  }

  const tokens = await issueSession(user, session.familyId, meta);
  const [replacement] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.refreshHash, hashToken(tokens.refreshRaw)))
    .limit(1);
  await db
    .update(sessions)
    .set({ revokedAt: new Date(), replacedBy: replacement?.id ?? null })
    .where(eq(sessions.id, session.id));

  return { user, tokens };
}

export async function logout(rawToken: string | undefined, actorId: string | null, meta: RequestMeta) {
  if (rawToken) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.refreshHash, hashToken(rawToken)), isNull(sessions.revokedAt)));
  }
  await audit({ actorId, action: "auth.logout", ip: meta.ip });
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const rows = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .returning({ id: sessions.id });
  return rows.length;
}

export async function changeOwnPassword(user: UserRow, current: string, next: string, meta: RequestMeta) {
  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) throw new HttpError(400, "WRONG_CURRENT_PASSWORD", "A senha atual não bate.");
  if (current === next) throw new HttpError(400, "SAME_PASSWORD", "A nova senha precisa ser diferente da atual.");

  const [updated] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(next),
      mustChangePassword: false,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();
  await revokeAllSessions(user.id);
  await audit({ actorId: user.id, action: "auth.password_changed", ip: meta.ip });

  // Emite uma sessão nova para o usuário não ser deslogado logo depois de trocar a senha.
  const tokens = await issueSession(updated!, randomUUID(), meta);
  return { user: updated!, tokens };
}
