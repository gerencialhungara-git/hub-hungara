import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import type { AuditEntry } from "@hub/shared";
import type { AuthVars } from "../../auth/middleware.js";
import { db } from "../../db/client.js";
import { auditLog, users } from "../../db/schema.js";

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  before: z.coerce.number().int().positive().optional(),
});

export const adminAudit = new Hono<AuthVars>().get("/", zValidator("query", Query), async (c) => {
  const { limit, before } = c.req.valid("query");
  const rows = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      actorEmail: users.email,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      payload: auditLog.payload,
      ip: auditLog.ip,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(before ? lt(auditLog.id, before) : undefined)
    .orderBy(desc(auditLog.id))
    .limit(limit);

  const entries: AuditEntry[] = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  return c.json({ entries, nextBefore: entries.length === limit ? entries[entries.length - 1]!.id : null });
});
