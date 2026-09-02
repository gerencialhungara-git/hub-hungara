import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuditEntry, MeResponse, ModuleAdmin, UserPublic } from "@hub/shared";
import { api } from "./client";

export const keys = {
  me: ["me"] as const,
  adminUsers: ["admin", "users"] as const,
  adminModules: ["admin", "modules"] as const,
  audit: ["admin", "audit"] as const,
};

export function useMe(enabled = true) {
  return useQuery({ queryKey: keys.me, queryFn: () => api.get<MeResponse>("/me"), staleTime: 5 * 60_000, enabled });
}

export function useAdminUsers() {
  return useQuery({ queryKey: keys.adminUsers, queryFn: () => api.get<{ users: UserPublic[] }>("/admin/users") });
}

export function useAdminModules() {
  return useQuery({ queryKey: keys.adminModules, queryFn: () => api.get<{ modules: ModuleAdmin[] }>("/admin/modules") });
}

export function useAudit() {
  return useQuery({
    queryKey: keys.audit,
    queryFn: () => api.get<{ entries: AuditEntry[]; nextBefore: number | null }>("/admin/audit?limit=200"),
  });
}

/** Mutation genérica que invalida as chaves informadas ao terminar. */
export function useInvalidating<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, invalidate: readonly (readonly string[])[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(invalidate.map((k) => qc.invalidateQueries({ queryKey: k })));
    },
  });
}
