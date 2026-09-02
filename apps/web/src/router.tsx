import { createBrowserRouter, Outlet } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth, RequirePasswordChanged, RequireRole } from "@/components/guards";
import { LoginPage } from "@/pages/auth/LoginPage";
import { EsqueciSenhaPage } from "@/pages/auth/EsqueciSenhaPage";
import { TrocarSenhaPage } from "@/pages/auth/TrocarSenhaPage";
import { CatalogoPage } from "@/pages/CatalogoPage";
import { ModuleHostPage } from "@/pages/ModuleHostPage";
import { UsuariosPage } from "@/pages/admin/UsuariosPage";
import { ImplementacoesPage } from "@/pages/admin/ImplementacoesPage";
import { AuditoriaPage } from "@/pages/admin/AuditoriaPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/esqueci-senha", element: <EsqueciSenhaPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: "/trocar-senha", element: <TrocarSenhaPage /> },
      {
        element: (
          <RequirePasswordChanged>
            <Outlet />
          </RequirePasswordChanged>
        ),
        children: [
          { index: true, element: <CatalogoPage /> },
          { path: "/m/:slug", element: <ModuleHostPage /> },
          {
            element: (
              <RequireRole roles={["admin"]}>
                <Outlet />
              </RequireRole>
            ),
            children: [
              { path: "/admin/usuarios", element: <UsuariosPage /> },
              { path: "/admin/implementacoes", element: <ImplementacoesPage /> },
              { path: "/admin/auditoria", element: <AuditoriaPage /> },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
