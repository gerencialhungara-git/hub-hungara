import { z } from "zod";
import { RoleSchema } from "./roles.js";

export const MODULE_TYPES = ["interna", "link", "embed"] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];
export const ModuleTypeSchema = z.enum(MODULE_TYPES);

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  interna: "Página interna",
  link: "Link externo",
  embed: "Embutido (iframe)",
};

export const SlugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens (ex.: royalties-mensais)");

const ModuleBase = z.object({
  slug: SlugSchema,
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(""),
  icon: z.string().trim().min(1).max(60).default("LayoutGrid"),
  type: ModuleTypeSchema,
  url: z.string().url().max(2000).nullable().default(null),
  category: z.string().trim().max(60).default("Geral"),
  sortOrder: z.number().int().min(0).max(100000).default(100),
  active: z.boolean().default(true),
});

/** Regra: link e embed exigem URL; interna ignora URL. */
export const ModuleCreateSchema = ModuleBase.extend({
  roles: z.array(RoleSchema).default([]),
}).superRefine((m, ctx) => {
  if (m.type !== "interna" && !m.url) {
    ctx.addIssue({ code: "custom", path: ["url"], message: "Link e embed precisam de URL" });
  }
});

export const ModuleUpdateSchema = ModuleBase.partial().extend({
  roles: z.array(RoleSchema).optional(),
});

export const OverrideEffectSchema = z.enum(["allow", "deny"]);
export type OverrideEffect = z.infer<typeof OverrideEffectSchema>;

/** Módulo como o catálogo enxerga (sem dados administrativos). */
export const ModuleSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  type: ModuleTypeSchema,
  url: z.string().nullable(),
  category: z.string(),
  sortOrder: z.number(),
});
export type ModuleSummary = z.infer<typeof ModuleSummarySchema>;

/** Módulo como o admin enxerga. */
export const ModuleAdminSchema = ModuleSummarySchema.extend({
  active: z.boolean(),
  roles: z.array(RoleSchema),
  overrides: z.array(
    z.object({
      userId: z.string().uuid(),
      email: z.string(),
      fullName: z.string(),
      effect: OverrideEffectSchema,
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ModuleAdmin = z.infer<typeof ModuleAdminSchema>;

export const ReorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1) });
