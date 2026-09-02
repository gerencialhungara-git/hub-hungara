import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { requireAuth, requirePasswordChanged, requireRole, type AuthVars } from "./auth/middleware.js";
import { allowedOrigins, env } from "./env.js";
import { HttpError } from "./lib/errors.js";
import { adminAudit } from "./routes/admin/audit.js";
import { adminModules } from "./routes/admin/modules.js";
import { adminUsers } from "./routes/admin/users.js";
import { auth } from "./routes/auth.js";
import { health } from "./routes/health.js";
import { me } from "./routes/me.js";
import { modulesRoutes } from "./routes/modules.js";

export function createApp() {
  const app = new Hono<AuthVars>();

  if (env().NODE_ENV === "development") app.use(logger());
  app.use(secureHeaders());
  app.use(
    cors({
      origin: allowedOrigins(),
      credentials: true,
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      maxAge: 86400,
    }),
  );

  app.route("/health", health);
  app.route("/auth", auth);
  app.route("/me", me);
  app.route("/modules", modulesRoutes);

  const admin = new Hono<AuthVars>().use(requireAuth, requirePasswordChanged, requireRole("admin"));
  admin.route("/users", adminUsers);
  admin.route("/modules", adminModules);
  admin.route("/audit", adminAudit);
  app.route("/admin", admin);

  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Rota não encontrada" } }, 404));

  app.onError((err, c) => {
    if (err instanceof HttpError) {
      return c.json({ error: { code: err.code, message: err.message, ...(err.issues ? { issues: err.issues } : {}) } }, err.status);
    }
    console.error("unhandled_error", err);
    return c.json({ error: { code: "INTERNAL", message: "Deu ruim aqui do nosso lado. Tenta de novo em instantes." } }, 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
