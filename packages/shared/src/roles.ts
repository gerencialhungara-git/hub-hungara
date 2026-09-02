import { z } from "zod";

/** Perfis de usuário do Hub. A ordem aqui é a ordem de exibição nas telas. */
export const ROLES = ["admin", "diretoria", "escritorio", "franqueado", "fabrica"] as const;
export type Role = (typeof ROLES)[number];
export const RoleSchema = z.enum(ROLES);

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  diretoria: "Diretoria",
  escritorio: "Escritório",
  franqueado: "Franqueado",
  fabrica: "Fábrica / Logística",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Gerencia usuários e implementações. Vê tudo.",
  diretoria: "Dono e CEO. Vê todas as implementações ativas.",
  escritorio: "Equipe administrativa do escritório.",
  franqueado: "Dono de franquia. Vê o que for liberado para franqueados.",
  fabrica: "Equipe da fábrica e da logística diária.",
};

/** Perfis que enxergam todo módulo ativo sem precisar de liberação explícita. */
export const ROLES_SEE_EVERYTHING: readonly Role[] = ["admin", "diretoria"];

export const USER_STATUSES = ["ativo", "desativado"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
export const UserStatusSchema = z.enum(USER_STATUSES);
