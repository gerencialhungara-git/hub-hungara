import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  ModuleCreateSchema,
  ModuleUpdateSchema,
  OverrideEffectSchema,
  ReorderSchema,
  RoleSchema,
  type ModuleAdmin,
} from "@hub/shared";
import { currentUser, type AuthVars } from "../../auth/middleware.js";
import { db } from "../../db/client.js";
import { moduleRoles, moduleUserOverrides, modules, users } from "../../db/schema.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { clientIp } from "../../lib/request.js";
import { audit } from "../../services/audit.js";
import { toSummary } from "../../services/visibility.js";

async function loadAdminModules(ids?: string[]): Promise<ModuleAdmin[]> {
  const rows = await db
    .select()
    .from(modules)
    .where(ids ? inArray(modules.id, ids) : undefined)
    .orderBy(asc(modules.sortOrder), asc(modules.title));
  if (rows.length === 0) return [];
  const moduleIds = rows.map((m) => m.id);
  const roles = await db.select().from(moduleRoles).where(inArray(moduleRoles.moduleId, moduleIds));
  const overrides = await db
    .select({
      moduleId: moduleUserOverrides.moduleId,
      userId: moduleUserOverrides.userId,
      effect: moduleUserOverrides.effect,
      email: users.email,
      fullName: users.fullName,
    })
    .from(moduleUserOverrides)
    .innerJoin(users, eq(users.id, moduleUserOverrides.userId))
    .where(inArray(moduleUserOverrides.moduleId, moduleIds));

  return rows.map((m) => ({
    ...toSummary(m),
    active: m.active,
    roles: roles.filter((r) => r.moduleId === m.id).map((r) => r.role),
    overrides: overrides
      .filter((o) => o.moduleId === m.id)
      .map((o) => ({ userId: o.userId, email: o.email, fullName: o.fullName, effect: o.effect })),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));
}

async function loadOne(id: string): Promise<ModuleAdmin> {
  const [m] = await loadAdminModules([id]);
  if (!m) throw notFound("Implementação não encontrada");
  return m;
}

export const adminModules = new Hono<AuthVars>()
  .get("/", async (c) => c.json({ modules: await loadAdminModules() }))
  .post("/", zValidator("json", ModuleCreateSchema), async (c) => {
    const input = c.req.valid("json");
    const [dup] = await db.select({ id: modules.id }).from(modules).where(eq(modules.slug, input.slug)).limit(1);
    if (dup) throw conflict("SLUG_TAKEN", "Já existe uma implementação com esse slug.");

    const created = await db.transaction(async (tx) => {
      const [m] = await tx
        .insert(modules)
        .values({
          slug: input.slug,
          title: input.title,
          description: input.description,
          icon: input.icon,
          type: input.type,
          url: input.type === "interna" ? null : input.url,
          category: input.category,
          sortOrder: input.sortOrder,
          active: input.active,
        })
        .returning();
      if (input.roles.length) {
        await tx.insert(moduleRoles).values(input.roles.map((role) => ({ moduleId: m!.id, role })));
      }
      return m!;
    });
    await audit({
      actorId: currentUser(c).id,
      action: "module.create",
      entity: "module",
      entityId: created.id,
      payload: { slug: input.slug, type: input.type, roles: input.roles },
      ip: clientIp(c),
    });
    return c.json({ module: await loadOne(created.id) }, 201);
  })
  .patch("/:id", zValidator("json", ModuleUpdateSchema), async (c) => {
    const id = c.req.param("id");
    const patch = c.req.valid("json");
    const [existing] = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
    if (!existing) throw notFound("Implementação não encontrada");

    const nextType = patch.type ?? existing.type;
    const nextUrl = patch.url !== undefined ? patch.url : existing.url;
    if (nextType !== "interna" && !nextUrl) throw badRequest("URL_REQUIRED", "Link e embed precisam de URL.");
    if (patch.slug && patch.slug !== existing.slug) {
      const [dup] = await db.select({ id: modules.id }).from(modules).where(eq(modules.slug, patch.slug)).limit(1);
      if (dup) throw conflict("SLUG_TAKEN", "Já existe uma implementação com esse slug.");
    }

    await db.transaction(async (tx) => {
      const { roles, ...fields } = patch;
      await tx
        .update(modules)
        .set({ ...fields, url: nextType === "interna" ? null : nextUrl, updatedAt: new Date() })
        .where(eq(modules.id, id));
      if (roles) {
        await tx.delete(moduleRoles).where(eq(moduleRoles.moduleId, id));
        if (roles.length) await tx.insert(moduleRoles).values(roles.map((role) => ({ moduleId: id, role })));
      }
    });
    await audit({
      actorId: currentUser(c).id,
      action: "module.update",
      entity: "module",
      entityId: id,
      payload: patch as Record<string, unknown>,
      ip: clientIp(c),
    });
    return c.json({ module: await loadOne(id) });
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const [deleted] = await db.delete(modules).where(eq(modules.id, id)).returning({ slug: modules.slug });
    if (!deleted) throw notFound("Implementação não encontrada");
    await audit({
      actorId: currentUser(c).id,
      action: "module.delete",
      entity: "module",
      entityId: id,
      payload: { slug: deleted.slug },
      ip: clientIp(c),
    });
    return c.json({ ok: true });
  })
  .put("/:id/roles", zValidator("json", z.object({ roles: z.array(RoleSchema) })), async (c) => {
    const id = c.req.param("id");
    const { roles } = c.req.valid("json");
    await loadOne(id);
    await db.transaction(async (tx) => {
      await tx.delete(moduleRoles).where(eq(moduleRoles.moduleId, id));
      if (roles.length) await tx.insert(moduleRoles).values(roles.map((role) => ({ moduleId: id, role })));
    });
    await audit({ actorId: currentUser(c).id, action: "module.set_roles", entity: "module", entityId: id, payload: { roles }, ip: clientIp(c) });
    return c.json({ module: await loadOne(id) });
  })
  .put("/:id/overrides/:userId", zValidator("json", z.object({ effect: OverrideEffectSchema })), async (c) => {
    const { id, userId } = c.req.param();
    const { effect } = c.req.valid("json");
    await loadOne(id);
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw notFound("Usuário não encontrado");
    await db
      .insert(moduleUserOverrides)
      .values({ moduleId: id, userId, effect, createdBy: currentUser(c).id })
      .onConflictDoUpdate({ target: [moduleUserOverrides.moduleId, moduleUserOverrides.userId], set: { effect } });
    await audit({ actorId: currentUser(c).id, action: "module.set_override", entity: "module", entityId: id, payload: { userId, effect }, ip: clientIp(c) });
    return c.json({ module: await loadOne(id) });
  })
  .delete("/:id/overrides/:userId", async (c) => {
    const { id, userId } = c.req.param();
    await db
      .delete(moduleUserOverrides)
      .where(eq(moduleUserOverrides.moduleId, id))
      .then(() => undefined);
    await audit({ actorId: currentUser(c).id, action: "module.remove_override", entity: "module", entityId: id, payload: { userId }, ip: clientIp(c) });
    return c.json({ module: await loadOne(id) });
  })
  .post("/reorder", zValidator("json", ReorderSchema), async (c) => {
    const { ids } = c.req.valid("json");
    await db.transaction(async (tx) => {
      for (const [index, id] of ids.entries()) {
        await tx.update(modules).set({ sortOrder: index * 10, updatedAt: new Date() }).where(eq(modules.id, id));
      }
    });
    await audit({ actorId: currentUser(c).id, action: "module.reorder", entity: "module", payload: { ids }, ip: clientIp(c) });
    return c.json({ modules: await loadAdminModules() });
  });
