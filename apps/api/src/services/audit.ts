import { db } from "../db/client.js";
import { auditLog } from "../db/schema.js";

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
}

/** Grava um evento na trilha de auditoria. Nunca derruba o request se falhar. */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      payload: input.payload ?? null,
      ip: input.ip ?? null,
    });
  } catch (err) {
    console.error("audit_failed", input.action, err);
  }
}
