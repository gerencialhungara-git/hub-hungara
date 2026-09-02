import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserPublic } from "@hub/shared";
import { registerRefresh } from "../api/client";
import { tokenStore } from "../api/tokenStore";
import type { AuthProvider } from "./AuthProvider.types";
import { hubAuthProvider } from "./hubAuthProvider";

type Status = "loading" | "anon" | "authed";

interface AuthState {
  status: Status;
  user: UserPublic | null;
  signIn(email: string, password: string): Promise<UserPublic>;
  signOut(): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  setUser(user: UserPublic): void;
}

const AuthCtx = createContext<AuthState | null>(null);
const provider: AuthProvider = hubAuthProvider;

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<UserPublic | null>(null);

  const clear = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    setStatus("anon");
  }, []);

  useEffect(() => {
    registerRefresh(async () => {
      const r = await provider.refresh().catch(() => null);
      if (!r) {
        clear();
        return null;
      }
      tokenStore.set(r.accessToken);
      setUser(r.user);
      setStatus("authed");
      return r.accessToken;
    });

    provider
      .refresh()
      .then((r) => {
        if (r) {
          tokenStore.set(r.accessToken);
          setUser(r.user);
          setStatus("authed");
        } else clear();
      })
      .catch(clear);

    const onUnauthorized = () => clear();
    window.addEventListener("hub:unauthorized", onUnauthorized);
    return () => window.removeEventListener("hub:unauthorized", onUnauthorized);
  }, [clear]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      async signIn(email, password) {
        const r = await provider.signIn(email, password);
        tokenStore.set(r.accessToken);
        setUser(r.user);
        setStatus("authed");
        return r.user;
      },
      async signOut() {
        await provider.signOut();
        clear();
      },
      async changePassword(current, next) {
        const r = await provider.changePassword(current, next);
        tokenStore.set(r.accessToken);
        setUser(r.user);
      },
      setUser,
    }),
    [status, user, clear],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthContextProvider>");
  return ctx;
}
