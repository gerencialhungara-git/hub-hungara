import type { ModuleSummary, UserPublic } from "@hub/shared";

/** Props que todo módulo interno recebe. */
export interface ModuleComponentProps {
  me: UserPublic;
  module: ModuleSummary;
}
