import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, asc, count, eq, ilike, ne, or } from "drizzle-orm";
import { z } from "zod";
import { ResetPasswordSchema, RoleSchema, UserCreateSchema, UserUpdateSchema } from "@hub/shared";
import { currentUser, type AuthVars } from "../../auth/middleware.js";
import { hashPassword } from "../../auth/password.js";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { conflict, notFound, badRequest } from "../../lib/errors.js";
import { clientIp } from "../../lib/request.js";
import { audit } from "../../services/audit.js";
import { revokeAllSessions } from "../../services/auth.js";
import { toPublic } from "../../services/users.js";

const ListQuery = z.object({
  q: z.string().trim().max(120).optional(),
  role: RoleSchema.optional(),
});

async function otherActiveAdmins(excludingUserId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "ativo"), ne(users.id, excludingUserId)));
  return row?.n ?? 0;
}

export const adminUsers = new Hono<AuthVars>()
  .get("/", zValidator("query", ListQuery), async (c) => {
    const { q, role } = c.req.valid("query");
    const filters = [];
    if (q) filters.push(or(ilike(users.email, `%${q}%`), ilike(users.fullName, `%${q}%`)));
    if (role) filters.push(eq(users.role, role));
    const rows = await db
      .select()
      .from(users)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(users.fullName));
    return c.json({ users: rows.map(toPublic) });
  })
  .post("/", zValidator("json", UserCreateSchema), async (c) => {
    const input = c.req.valid("json");
    const actor = currentUser(c);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (existing) throw conflict("EMAIL_TAKEN", "Já existe um usuário com esse e-mail.");

    const [created] = await db
      .insert(users)
      .values({
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        passwordHash: await hashPassword(input.password),
        mustChangePassword: true,
        createdBy: actor.id,
      })
      .returning();
    await audit({
      actorId: actor.id,
      action: "user.create",
      entity: "user",
      entityId: created!.id,
      payload: { email: input.email, role: input.role },
      ip: clientIp(c),
    });
    return c.json({ user: toPublic(created!) }, 201);
  })
  .patch("/:id", zValidator("json", UserUpdateSchema), async (c) => {
    const id = c.req.param("id");
    const patch = c.req.valid("json");
    const actor = currentUser(c);
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw notFound("Usuário não encontrado");

    const losesAdmin =
      target.role === "admin" &&
      target.status === "ativo" &&
      ((patch.role && patch.role !== "admin") || patch.status === "desativado");
    if (losesAdmin && (await otherActiveAdmins(target.id)) === 0) {
      throw badRequest("LAST_ADMIN", "Esse é o último admin ativo. Crie outro admin antes.");
    }

    const securityChange =
      (patch.role !== undefined && patch.role !== target.role) ||
      (patch.status !== undefined && patch.status !== target.status);

    const [updated] = await db
      .update(users)
      .set({
        ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
        ...(patch.role !== undefined ? { role: patch.role } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(securityChange ? { tokenVersion: target.tokenVersion + 1 } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    if (securityChange) await revokeAllSessions(id);

    await audit({
      actorId: actor.id,
      action: patch.status ? "user.set_status" : patch.role ? "user.set_role" : "user.update",
      entity: "user",
      entityId: id,
      payload: patch as Record<string, unknown>,
      ip: clientIp(c),
    });
    return c.json({ user: toPublic(updated!) });
  })
  .post("/:id/reset-password", zValidator("json", ResetPasswordSchema), async (c) => {
    const id = c.req.param("id");
    const actor = currentUser(c);
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw notFound("Usuário não encontrado");

    const [updated] = await db
      .update(users)
      .set({
        passwordHash: await hashPassword(c.req.valid("json").password),
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: null,
        tokenVersion: target.tokenVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    await revokeAllSessions(id);
    await audit({ actorId: actor.id, action: "user.reset_password", entity: "user", entityId: id, ip: clientIp(c) });
    return c.json({ user: toPublic(updated!) });
  })
  .post("/:id/logout-all", async (c) => {
    const id = c.req.param("id");
    const revoked = await revokeAllSessions(id);
    await audit({ actorId: currentUser(c).id, action: "user.logout_all", entity: "user", entityId: id, ip: clientIp(c) });
    return c.json({ ok: true, revoked });
  });
