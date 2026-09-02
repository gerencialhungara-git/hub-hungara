import { z } from "zod";
import { EmailSchema, PasswordSchema } from "./users.js";

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});

export const ChangePasswordSchema = z.object({
  current: z.string().min(1).max(128),
  next: PasswordSchema,
});
