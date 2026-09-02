import type { Context } from "hono";

/** IP do cliente: API Gateway coloca em x-forwarded-for; local cai em "local". */
export function clientIp(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "local";
}

export function userAgent(c: Context): string {
  return (c.req.header("user-agent") ?? "").slice(0, 300);
}
