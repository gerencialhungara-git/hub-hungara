import { Hono } from "hono";
import { sql as pg } from "../db/client.js";
import { env } from "../env.js";

export const health = new Hono().get("/", async (c) => {
  let dbStatus: "up" | "down" = "down";
  try {
    await pg`select 1`;
    dbStatus = "up";
  } catch (err) {
    console.error("health_db_failed", err);
  }
  return c.json({ ok: dbStatus === "up", version: env().APP_VERSION, db: dbStatus }, dbStatus === "up" ? 200 : 503);
});
