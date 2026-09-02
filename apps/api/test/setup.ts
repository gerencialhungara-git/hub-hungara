/**
 * Testes de integração rodam contra um Postgres real (docker local ou service do CI).
 * Banco: hub_test. As tabelas são recriadas pelas migrations antes da suíte.
 */
import { execSync } from "node:child_process";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach } from "vitest";

const BASE = process.env.TEST_DATABASE_BASE_URL ?? "postgres://hub:hub@localhost:5433/hub";
const TEST_DB = "hub_test";
const TEST_URL = BASE.replace(/\/[^/]+$/, `/${TEST_DB}`);

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = TEST_URL;
process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres-ok";
process.env.ALLOWED_ORIGINS = "http://localhost:5173";
process.env.ACCESS_TOKEN_TTL_SECONDS = "900";

beforeAll(async () => {
  const admin = postgres(BASE, { max: 1 });
  const exists = await admin`select 1 from pg_database where datname = ${TEST_DB}`;
  if (exists.length === 0) await admin.unsafe(`create database ${TEST_DB}`);
  await admin.end();
  execSync("npx drizzle-kit migrate", {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL_MIGRATE: TEST_URL },
    stdio: "pipe",
  });
});

beforeEach(async () => {
  const c = postgres(TEST_URL, { max: 1 });
  await c.unsafe("truncate audit_log, module_user_overrides, module_roles, modules, sessions, users restart identity cascade");
  await c.end();
});

afterAll(async () => {
  const { sql } = await import("../src/db/client.js");
  await sql.end();
});
