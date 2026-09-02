import type { UserPublic } from "@hub/shared";
import type { UserRow } from "../db/schema.js";

export function toPublic(u: UserRow): UserPublic {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
    mustChangePassword: u.mustChangePassword,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}
