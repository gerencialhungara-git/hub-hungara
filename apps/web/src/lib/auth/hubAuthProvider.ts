import type { LoginResponse, RefreshResponse } from "@hub/shared";
import { API_URL, ApiError, parseResponse } from "../api/http";
import type { AuthProvider } from "./AuthProvider.types";

/** Implementação contra a própria API do Hub (Lambda). Único lugar que fala com /auth/*. */
export const hubAuthProvider: AuthProvider = {
  async signIn(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return parseResponse<LoginResponse>(res);
  },

  async signOut() {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
  },

  async refresh() {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
      if (res.status === 401) return null;
      return await parseResponse<RefreshResponse>(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  async changePassword(current, next) {
    const { tokenStore } = await import("../api/tokenStore");
    const res = await fetch(`${API_URL}/auth/password`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json", authorization: `Bearer ${tokenStore.get() ?? ""}` },
      body: JSON.stringify({ current, next }),
    });
    return parseResponse<LoginResponse>(res);
  },
};
