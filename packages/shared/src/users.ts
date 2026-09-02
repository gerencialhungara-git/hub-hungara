import { z } from "zod";
import { RoleSchema, UserStatusSchema } from "./roles.js";

export const EmailSchema = z.string().trim().toLowerCase().email().max(254);
export const PasswordSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128);

export const UserCreateSchema = z.object({
  email: EmailSchema,
  fullName: z.string().trim().min(2).max(120),
  role: RoleSchema,
  password: PasswordSchema,
});

export const UserUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    role: RoleSchema,
    status: UserStatusSchema,
  })
  .partial();

export const ResetPasswordSchema = z.object({ password: PasswordSchema });

export const UserPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  fullName: z.string(),
  role: RoleSchema,
  status: UserStatusSchema,
  mustChangePassword: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type UserPublic = z.infer<typeof UserPublicSchema>;
