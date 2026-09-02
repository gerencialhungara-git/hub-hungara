import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { ChevronDown, KeyRound, LogOut, Shield } from "lucide-react";
import { ROLE_LABELS } from "@hub/shared";
import { useAuth } from "@/lib/auth";
import { Badge, cx } from "@/components/ui";

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-red text-brand-cream shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/brand/logo-hungara.png" alt="Hungara Lanches" className="h-11 w-11 rounded-full bg-brand-cream object-contain p-0.5" />
            <span className="font-display text-2xl tracking-wide">Hub Hungara</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <TopLink to="/">Catálogo</TopLink>
            {isAdmin && <TopLink to="/admin/usuarios">Usuários</TopLink>}
            {isAdmin && <TopLink to="/admin/implementacoes">Implementações</TopLink>}
            {isAdmin && <TopLink to="/admin/auditoria">Auditoria</TopLink>}
          </nav>

          <div className="ml-auto relative">
            <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 rounded-full py-1 pl-3 pr-2 hover:bg-white/10">
              <div className="text-right leading-tight">
                <div className="text-sm font-semibold">{user?.fullName}</div>
                <div className="font-label text-[11px] uppercase tracking-wider opacity-80">{user ? ROLE_LABELS[user.role] : ""}</div>
              </div>
              <ChevronDown className="size-4 opacity-80" />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white p-2 text-brand-brown shadow-xl" onMouseLeave={() => setOpen(false)}>
                <div className="px-3 py-2 text-xs text-brand-brown/60 break-all">{user?.email}</div>
                {isAdmin && (
                  <div className="px-3 pb-2">
                    <Badge tone="red"><Shield className="mr-1 size-3" /> admin</Badge>
                  </div>
                )}
                <MenuItem onClick={() => { setOpen(false); navigate("/trocar-senha"); }}>
                  <KeyRound className="size-4" /> Trocar senha
                </MenuItem>
                <MenuItem onClick={() => void signOut().then(() => navigate("/login"))}>
                  <LogOut className="size-4" /> Sair
                </MenuItem>
              </div>
            )}
          </div>
        </div>
        {isAdmin && (
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
            <TopLink to="/">Catálogo</TopLink>
            <TopLink to="/admin/usuarios">Usuários</TopLink>
            <TopLink to="/admin/implementacoes">Implementações</TopLink>
            <TopLink to="/admin/auditoria">Auditoria</TopLink>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="px-6 py-6 text-center font-label text-[11px] uppercase tracking-wider text-brand-brown/50">
        Hungara Lanches · desde 1983 · Niterói
      </footer>
    </div>
  );
}

function TopLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cx("rounded-full px-4 py-1.5 font-label text-xs uppercase tracking-wider transition", isActive ? "bg-brand-cream text-brand-red" : "hover:bg-white/15")
      }
    >
      {children}
    </NavLink>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-brand-cream">
      {children}
    </button>
  );
}
