import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { env } from "../env.js";

export const REFRESH_COOKIE = "hub_rt";

function baseOptions() {
  const e = env();
  return {
    httpOnly: true,
    secure: e.NODE_ENV === "production",
    sameSite: "Strict" as const,
    path: "/auth",
    ...(e.COOKIE_DOMAIN ? { domain: e.COOKIE_DOMAIN } : {}),
  };
}

export function setRefreshCookie(c: Context, raw: string, expiresAt: Date): void {
  setCookie(c, REFRESH_COOKIE, raw, { ...baseOptions(), expires: expiresAt });
}

export function clearRefreshCookie(c: Context): void {
  deleteCookie(c, REFRESH_COOKIE, baseOptions());
}

export function readRefreshCookie(c: Context): string | undefined {
  return getCookie(c, REFRESH_COOKIE);
}
