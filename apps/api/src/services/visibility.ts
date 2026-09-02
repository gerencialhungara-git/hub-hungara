import { and, asc, eq, exists, inArray, not, or, sql } from "drizzle-orm";
import { ROLES_SEE_EVERYTHING, type ModuleSummary, type Role } from "@hub/shared";
import { db } from "../db/client.js";
import { moduleRoles, moduleUserOverrides, modules, type ModuleRow } from "../db/schema.js";

export function toSummary(m: ModuleRow): ModuleSummary {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    description: m.description,
    icon: m.icon,
    type: m.type,
    url: m.url,
    category: m.category,
    sortOrder: m.sortOrder,
  };
}

/**
 * Regra de visibilidade, em uma frase: módulo ativo E (papel vê tudo OU papel liberado
 * OU exceção "allow" para o usuário) E sem exceção "deny" para o usuário.
 */
export async function visibleModulesFor(userId: string, role: Role): Promise<ModuleSummary[]> {
  const seesEverything = ROLES_SEE_EVERYTHING.includes(role);

  const allowedByRole = exists(
    db
      .select({ one: sql`1` })
      .from(moduleRoles)
      .where(and(eq(moduleRoles.moduleId, modules.id), eq(moduleRoles.role, role))),
  );
  const allowedByOverride = exists(
    db
      .select({ one: sql`1` })
      .from(moduleUserOverrides)
      .where(
        and(
          eq(moduleUserOverrides.moduleId, modules.id),
          eq(moduleUserOverrides.userId, userId),
          eq(moduleUserOverrides.effect, "allow"),
        ),
      ),
  );
  const deniedByOverride = exists(
    db
      .select({ one: sql`1` })
      .from(moduleUserOverrides)
      .where(
        and(
          eq(moduleUserOverrides.moduleId, modules.id),
          eq(moduleUserOverrides.userId, userId),
          eq(moduleUserOverrides.effect, "deny"),
        ),
      ),
  );

  const rows = await db
    .select()
    .from(modules)
    .where(
      and(
        eq(modules.active, true),
        seesEverything ? sql`true` : or(allowedByRole, allowedByOverride),
        not(deniedByOverride),
      ),
    )
    .orderBy(asc(modules.sortOrder), asc(modules.title));

  return rows.map(toSummary);
}

export async function canSeeModule(userId: string, role: Role, slug: string): Promise<ModuleSummary | null> {
  const all = await visibleModulesFor(userId, role);
  return all.find((m) => m.slug === slug) ?? null;
}

export async function modulesByIds(ids: string[]): Promise<ModuleRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(modules).where(inArray(modules.id, ids));
}
