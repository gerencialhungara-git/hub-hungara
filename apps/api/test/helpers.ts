import type { Role } from "@hub/shared";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/auth/password.js";
import { db } from "../src/db/client.js";
import { moduleRoles, modules, users } from "../src/db/schema.js";

export const app = createApp();

export async function createUser(opts: {
  email: string;
  password?: string;
  role?: Role;
  mustChangePassword?: boolean;
  status?: "ativo" | "desativado";
}) {
  const [u] = await db
    .insert(users)
    .values({
      email: opts.email,
      fullName: opts.email.split("@")[0]!,
      role: opts.role ?? "escritorio",
      status: opts.status ?? "ativo",
      passwordHash: await hashPassword(opts.password ?? "senha-forte-123"),
      mustChangePassword: opts.mustChangePassword ?? false,
    })
    .returning();
  return u!;
}

export async function createModule(slug: string, roles: Role[], extra: Partial<typeof modules.$inferInsert> = {}) {
  const [m] = await db
    .insert(modules)
    .values({ slug, title: slug, type: "interna", ...extra })
    .returning();
  if (roles.length) await db.insert(moduleRoles).values(roles.map((role) => ({ moduleId: m!.id, role })));
  return m!;
}

export function json(body: unknown, headers: Record<string, string> = {}) {
  return { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) };
}

export async function login(email: string, password = "senha-forte-123") {
  const res = await app.request("/auth/login", json({ email, password }));
  const body = (await res.json()) as { accessToken: string };
  const cookie = res.headers.get("set-cookie") ?? "";
  const refreshCookie = cookie.split(";")[0] ?? "";
  return { res, accessToken: body.accessToken, refreshCookie };
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
