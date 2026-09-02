import type { Context, MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import type { ModuleSummary, Role } from "@hub/shared";
import { db } from "../db/client.js";
import { users, type UserRow } from "../db/schema.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { canSeeModule } from "../services/visibility.js";
import { verifyAccessToken } from "./tokens.js";

export type AuthVars = {
  Variables: {
    user: UserRow;
    module: ModuleSummary;
  };
};

export function currentUser(c: Context<AuthVars>): UserRow {
  return c.get("user");
}

/**
 * Exige um access token válido. Além da assinatura, confere no banco se o usuário
 * continua ativo e se a versão do token ainda vale (troca de senha/papel/desativação
 * invalidam tokens antigos imediatamente).
 */
export const requireAuth: MiddlewareHandler<AuthVars> = createMiddleware<AuthVars>(async (c, next) => {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw unauthorized();

  const claims = await verifyAccessToken(token);
  if (!claims) throw unauthorized("INVALID_TOKEN", "Sessão inválida ou expirada");

  const [user] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
  if (!user) throw unauthorized("INVALID_TOKEN", "Sessão inválida");
  if (user.status !== "ativo") throw forbidden("USER_INACTIVE", "Seu acesso está desativado. Fala com o admin do Hub.");
  if (user.tokenVersion !== claims.ver) throw unauthorized("STALE_TOKEN", "Sua sessão foi renovada. Entre de novo.");

  c.set("user", user);
  await next();
});

/** Bloqueia tudo que não seja trocar a própria senha enquanto a troca for obrigatória. */
export const requirePasswordChanged: MiddlewareHandler<AuthVars> = createMiddleware<AuthVars>(async (c, next) => {
  if (currentUser(c).mustChangePassword) {
    throw forbidden("PASSWORD_CHANGE_REQUIRED", "Troque sua senha antes de continuar.");
  }
  await next();
});

export function requireRole(...roles: Role[]): MiddlewareHandler<AuthVars> {
  return createMiddleware<AuthVars>(async (c, next) => {
    if (!roles.includes(currentUser(c).role)) throw forbidden();
    await next();
  });
}

/** Para rotas de dados de um módulo: só passa quem enxerga aquele módulo no catálogo. */
export function requireModule(slug: string): MiddlewareHandler<AuthVars> {
  return createMiddleware<AuthVars>(async (c, next) => {
    const user = currentUser(c);
    const mod = await canSeeModule(user.id, user.role, slug);
    if (!mod) throw forbidden("MODULE_FORBIDDEN", "Essa implementação não está liberada para você.");
    c.set("module", mod);
    await next();
  });
}
