import type { LoginResponse, RefreshResponse } from "@hub/shared";

/**
 * Contrato do provedor de autenticação. O resto do app só conhece esta interface.
 * Trocar de provedor (ex.: Cognito, Auth.js) = escrever outra implementação e apontar aqui.
 */
export interface AuthProvider {
  signIn(email: string, password: string): Promise<LoginResponse>;
  signOut(): Promise<void>;
  /** Tenta restaurar a sessão a partir do cookie de refresh. Null se não houver sessão. */
  refresh(): Promise<RefreshResponse | null>;
  changePassword(current: string, next: string): Promise<LoginResponse>;
}
