import { API_URL, ApiError, parseResponse } from "./http";
import { tokenStore } from "./tokenStore";

type RefreshFn = () => Promise<string | null>;
let refreshFn: RefreshFn = async () => null;
let pendingRefresh: Promise<string | null> | null = null;

/** O AuthContext registra aqui como renovar o token; o client não conhece o provedor. */
export function registerRefresh(fn: RefreshFn) {
  refreshFn = fn;
}

/** Garante um único refresh em voo mesmo com várias requisições falhando ao mesmo tempo. */
async function refreshOnce(): Promise<string | null> {
  if (!pendingRefresh) {
    pendingRefresh = refreshFn().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

export interface ApiInit extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, init: ApiInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("content-type", "application/json");

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (res.status === 401 && retry) {
    const fresh = await refreshOnce();
    if (fresh) return apiFetch<T>(path, init, false);
  }
  try {
    return await parseResponse<T>(res);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) window.dispatchEvent(new Event("hub:unauthorized"));
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
