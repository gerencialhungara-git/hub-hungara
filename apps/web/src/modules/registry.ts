import type { ComponentType } from "react";
import type { ModuleComponentProps } from "./types";

type Loader = () => Promise<{ default: ComponentType<ModuleComponentProps> }>;

/**
 * Registro dos módulos internos: slug → código.
 * Para subir uma implementação nova: crie a pasta ao lado, exporte um componente `default`
 * e acrescente uma linha aqui. O cadastro (título, ícone, quem vê) é feito no Admin.
 */
export const internalModules: Record<string, Loader> = {
  "documentacao": () => import("./documentacao"),
  "exemplo-boas-vindas": () => import("./exemplo-boas-vindas"),
};

export const internalSlugs = Object.keys(internalModules).sort();
