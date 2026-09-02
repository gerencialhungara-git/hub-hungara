import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import type { Role } from "@hub/shared";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <Splash />;
  if (status === "anon") return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

/** Enquanto a troca de senha for obrigatória, só a tela de trocar senha é acessível. */
export function RequirePasswordChanged({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.mustChangePassword) return <Navigate to="/trocar-senha" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/?negado=1" replace />;
  return <>{children}</>;
}

export function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-cream">
      <img src="/brand/logo-hungara.png" alt="Hungara Lanches" className="h-28 animate-pulse" />
      <Spinner label="Abrindo o Hub…" />
    </div>
  );
}
