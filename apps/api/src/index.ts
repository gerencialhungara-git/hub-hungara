import { handle } from "hono/aws-lambda";
import type { Context } from "aws-lambda";
import { createApp } from "./app.js";
import { sql } from "./db/client.js";

const app = createApp();
const honoHandler = handle(app);

interface KeepaliveEvent {
  source?: string;
}

/**
 * Entrada da Lambda. Dois caminhos:
 *  - evento HTTP do API Gateway → Hono;
 *  - evento agendado `{ "source": "hub.keepalive" }` → `select 1` para o Supabase
 *    free tier não pausar o projeto por inatividade.
 */
export const handler = async (event: unknown, context: Context) => {
  if ((event as KeepaliveEvent)?.source === "hub.keepalive") {
    await sql`select 1`;
    console.log("keepalive ok");
    return { ok: true };
  }
  return honoHandler(event as never, context);
};
