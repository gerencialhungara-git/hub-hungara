import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../env.js";
import * as schema from "./schema.js";

/**
 * Conexão única por container da Lambda. `prepare: false` é obrigatório no pooler
 * do Supabase em transaction mode (porta 6543). `max: 1` porque cada invocação da
 * Lambda atende um request por vez.
 */
export const sql = postgres(env().DATABASE_URL, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });
export type Db = typeof db;
