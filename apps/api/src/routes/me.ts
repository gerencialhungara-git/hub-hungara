import { Hono } from "hono";
import type { MeResponse } from "@hub/shared";
import { currentUser, requireAuth, type AuthVars } from "../auth/middleware.js";
import { toPublic } from "../services/users.js";
import { visibleModulesFor } from "../services/visibility.js";

export const me = new Hono<AuthVars>().use(requireAuth).get("/", async (c) => {
  const user = currentUser(c);
  const modules = user.mustChangePassword ? [] : await visibleModulesFor(user.id, user.role);
  const body: MeResponse = { user: toPublic(user), modules };
  return c.json(body);
});
