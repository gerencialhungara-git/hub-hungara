import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ChangePasswordSchema, LoginSchema, type LoginResponse, type RefreshResponse } from "@hub/shared";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "../auth/cookies.js";
import { currentUser, requireAuth, type AuthVars } from "../auth/middleware.js";
import { unauthorized } from "../lib/errors.js";
import { clientIp, userAgent } from "../lib/request.js";
import * as authService from "../services/auth.js";
import { toPublic } from "../services/users.js";

export const auth = new Hono<AuthVars>()
  .post("/login", zValidator("json", LoginSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const { user, tokens } = await authService.login(email, password, { ip: clientIp(c), userAgent: userAgent(c) });
    setRefreshCookie(c, tokens.refreshRaw, tokens.refreshExpiresAt);
    const body: LoginResponse = {
      accessToken: tokens.accessToken,
      user: toPublic(user),
      mustChangePassword: user.mustChangePassword,
    };
    return c.json(body);
  })
  .post("/refresh", async (c) => {
    const raw = readRefreshCookie(c);
    if (!raw) throw unauthorized("NO_SESSION", "Sem sessão ativa");
    try {
      const { user, tokens } = await authService.refresh(raw, { ip: clientIp(c), userAgent: userAgent(c) });
      setRefreshCookie(c, tokens.refreshRaw, tokens.refreshExpiresAt);
      const body: RefreshResponse = { accessToken: tokens.accessToken, user: toPublic(user) };
      return c.json(body);
    } catch (err) {
      clearRefreshCookie(c);
      throw err;
    }
  })
  .post("/logout", async (c) => {
    const raw = readRefreshCookie(c);
    await authService.logout(raw, null, { ip: clientIp(c), userAgent: userAgent(c) });
    clearRefreshCookie(c);
    return c.json({ ok: true });
  })
  .post("/logout-all", requireAuth, async (c) => {
    const user = currentUser(c);
    const count = await authService.revokeAllSessions(user.id);
    clearRefreshCookie(c);
    return c.json({ ok: true, revoked: count });
  })
  .patch("/password", requireAuth, zValidator("json", ChangePasswordSchema), async (c) => {
    const { current, next } = c.req.valid("json");
    const { user, tokens } = await authService.changeOwnPassword(currentUser(c), current, next, {
      ip: clientIp(c),
      userAgent: userAgent(c),
    });
    setRefreshCookie(c, tokens.refreshRaw, tokens.refreshExpiresAt);
    const body: LoginResponse = { accessToken: tokens.accessToken, user: toPublic(user), mustChangePassword: false };
    return c.json(body);
  });
