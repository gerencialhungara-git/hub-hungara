import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: createApp().fetch, port }, () => {
  console.log(`API do Hub Hungara em http://localhost:${port}  (health: /health)`);
});
