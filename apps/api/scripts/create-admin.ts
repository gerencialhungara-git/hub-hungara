/**
 * Cria (ou promove) o primeiro administrador.
 *   npm run create-admin -w apps/api -- gerencial.hungara@gmail.com "Nome Completo" [senha]
 * Sem senha, gera uma temporária e imprime. O usuário é obrigado a trocar no primeiro login.
 */
import { eq } from "drizzle-orm";
import { EmailSchema } from "@hub/shared";
import { generatePassword, hashPassword } from "../src/auth/password.js";
import { db, sql } from "../src/db/client.js";
import { users } from "../src/db/schema.js";

const [emailArg, nameArg, passwordArg] = process.argv.slice(2);
if (!emailArg) {
  console.error('Uso: npm run create-admin -w apps/api -- <email> "<nome>" [senha]');
  process.exit(1);
}
const email = EmailSchema.parse(emailArg);
const fullName = nameArg ?? "Administrador";
const password = passwordArg ?? generatePassword(12);
const passwordHash = await hashPassword(password);

const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
if (existing) {
  await db
    .update(users)
    .set({ role: "admin", status: "ativo", passwordHash, mustChangePassword: true, tokenVersion: existing.tokenVersion + 1, updatedAt: new Date() })
    .where(eq(users.id, existing.id));
  console.log(`Usuário ${email} já existia: promovido a admin e senha redefinida.`);
} else {
  await db.insert(users).values({ email, fullName, role: "admin", passwordHash, mustChangePassword: true });
  console.log(`Admin ${email} criado.`);
}
console.log("");
console.log("  E-mail: " + email);
console.log("  Senha temporária: " + password);
console.log("");
console.log("Passe a senha fora do sistema. Vai ser pedida a troca no primeiro login.");
await sql.end();
