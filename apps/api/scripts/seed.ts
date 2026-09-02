/**
 * Cria os módulos iniciais. Idempotente: roda quantas vezes quiser.
 *   npm run db:seed -w apps/api
 */
import { eq } from "drizzle-orm";
import { ROLES } from "@hub/shared";
import { db, sql } from "../src/db/client.js";
import { moduleRoles, modules } from "../src/db/schema.js";

const SEED = [
  {
    slug: "documentacao",
    title: "Documentação do Hub",
    description: "Como o Hub funciona, quem vê o quê e como subir uma implementação nova.",
    icon: "BookOpen",
    type: "interna" as const,
    url: null,
    category: "Hub",
    sortOrder: 10,
    roles: [...ROLES],
  },
  {
    slug: "exemplo-boas-vindas",
    title: "Boas-vindas",
    description: "Módulo de exemplo. Copie esta pasta para começar uma implementação nova.",
    icon: "PartyPopper",
    type: "interna" as const,
    url: null,
    category: "Hub",
    sortOrder: 20,
    roles: [...ROLES],
  },
  {
    slug: "painel-tv-lojas",
    title: "Painel TV — Vendas das Lojas",
    description: "Painel de vendas diárias da rede, atualizado a cada 2 horas. Abre em nova aba e pede a senha do painel.",
    icon: "Tv",
    type: "link" as const,
    url: "https://painel-tv-lojas.hungaralanches.com.br",
    category: "Vendas",
    sortOrder: 100,
    roles: ["escritorio"] as const,
  },
];

for (const m of SEED) {
  const { roles, ...fields } = m;
  const [row] = await db
    .insert(modules)
    .values(fields)
    .onConflictDoUpdate({
      target: modules.slug,
      set: { title: fields.title, description: fields.description, icon: fields.icon, updatedAt: new Date() },
    })
    .returning();
  await db.delete(moduleRoles).where(eq(moduleRoles.moduleId, row!.id));
  if (roles.length) await db.insert(moduleRoles).values(roles.map((role) => ({ moduleId: row!.id, role })));
  console.log(`✓ ${m.slug} (${m.type}) → ${roles.join(", ") || "só admin/diretoria"}`);
}

await sql.end();
