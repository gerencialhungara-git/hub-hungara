import { z } from "zod";

/**
 * Contrato do módulo Logística Diária. Espelha o de `automacoes-hungara`
 * (packages/shared/src/logistica.ts) — são dois repositórios, então a duplicação é
 * deliberada, do mesmo jeito que qualquer cliente HTTP duplica o contrato do servidor.
 * Se um lado mudar, o outro precisa acompanhar.
 */
const DataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato AAAA-MM-DD");

export const PeriodoSchema = z
  .object({ inicio: DataIso, fim: DataIso })
  .refine((p) => p.inicio <= p.fim, {
    message: "a data de início não pode ser depois da data de fim",
    path: ["inicio"],
  });
export type Periodo = z.infer<typeof PeriodoSchema>;

export const STATUS_JOB = ["na_fila", "executando", "concluido", "erro"] as const;
export type StatusJob = (typeof STATUS_JOB)[number];

export const ETAPAS = ["baixando-relatorio", "processando", "gerando-planilha"] as const;
export type Etapa = (typeof ETAPAS)[number];

/** O que a tela mostra enquanto espera, para não ser um spinner cego por um minuto. */
export const ETAPA_LABELS: Record<Etapa, string> = {
  "baixando-relatorio": "Entrando no Sischef e baixando os pedidos…",
  processando: "Cruzando com o cadastro de lojas…",
  "gerando-planilha": "Montando a planilha…",
};

export interface AvisoJob {
  codigo: "ORFAOS" | "RETIRADAS" | "SEM_LINHAS";
  mensagem: string;
}

export interface JobLogistica {
  jobId: string;
  status: StatusJob;
  etapa: Etapa | null;
  inicio: string;
  fim: string;
  criadoEm: string;
  atualizadoEm: string;
  linhas: number | null;
  colunas: number | null;
  avisos: AvisoJob[];
  arquivo: {
    nome: string;
    chave: string;
    bytes: number;
    url?: string;
    expiraEmSegundos?: number;
  } | null;
  erro: { codigo: string; mensagem: string } | null;
  duracaoMs: number | null;
}
