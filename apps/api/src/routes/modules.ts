import { Hono } from "hono";
import { currentUser, requireAuth, requirePasswordChanged, type AuthVars } from "../auth/middleware.js";
import { notFound } from "../lib/errors.js";
import { canSeeModule, visibleModulesFor } from "../services/visibility.js";

export const modulesRoutes = new Hono<AuthVars>()
  .use(requireAuth, requirePasswordChanged)
  .get("/", async (c) => {
    const user = currentUser(c);
    return c.json({ modules: await visibleModulesFor(user.id, user.role) });
  })
  .get("/:slug", async (c) => {
    const user = currentUser(c);
    const mod = await canSeeModule(user.id, user.role, c.req.param("slug"));
    if (!mod) throw notFound("Implementação não encontrada");
    return c.json({ module: mod });
  });
