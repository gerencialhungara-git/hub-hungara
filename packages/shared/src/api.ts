import type { ModuleSummary } from "./modules.js";
import type { UserPublic } from "./users.js";

export interface MeResponse {
  user: UserPublic;
  modules: ModuleSummary[];
}

export interface LoginResponse {
  accessToken: string;
  user: UserPublic;
  mustChangePassword: boolean;
}

export interface RefreshResponse {
  accessToken: string;
  user: UserPublic;
}

export interface ApiErrorBody {
  error: { code: string; message: string; issues?: unknown };
}

export interface AuditEntry {
  id: number;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}
