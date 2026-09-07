import { useEffect, useRef, useState } from "react";
import { ETAPA_LABELS, type JobLogistica } from "@hub/shared";
import { Alert, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import type { ModuleComponentProps } from "../types";

/** Data de hoje em AAAA-MM-DD, no fuso de quem está usando. */
function hoje(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

const EM_ANDAMENTO = ["na_fila", "executando"];

export default function LogisticaDiaria({ module }: ModuleComponentProps) {
  const [inicio, setInicio] = useState(hoje);
  const [fim, setFim] = useState(hoje);
  const [job, setJob] = useState<JobLogistica | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  // Guarda o timer para o polling parar quando o componente sair da tela.
  const timer = useRef<number | undefined>(undefined);

  const rodando = job !== null && EM_ANDAMENTO.includes(job.status);

  useEffect(() => {
    if (!rodando || job === null) return;
    timer.current = window.setTimeout(async () => {
      try {
        const r = await api.get<{ job: JobLogistica }>(
          `/logistica-diaria/jobs/${job.jobId}`,
        );
        setJob(r.job);
      } catch (e) {
        setErro(e instanceof ApiError ? e.message : "Perdi o contato com a rotina.");
        setJob(null);
      }
    }, 2000);
    return () => window.clearTimeout(timer.current);
  }, [job, rodando]);

  async function gerar() {
    setErro(null);
    setJob(null);
    setIniciando(true);
    try {
      const r = await api.post<{ job: JobLogistica }>("/logistica-diaria", { inicio, fim });
      setJob(r.job);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não consegui iniciar. Tente de novo.");
    } finally {
      setIniciando(false);
    }
  }

  const umDia = inicio === fim;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <h1 className="text-2xl text-brand-red">Programação de Produção</h1>
        <p className="mt-2 text-sm text-brand-brown/80">
          Escolha o período e o sistema baixa os pedidos do Sischef, cruza com o cadastro de
          lojas e monta a planilha de picking — a mesma que a expedição usa, e que serve de
          ordem de produção do dia seguinte.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <Field label="Início">
            <Input
              type="date"
              value={inicio}
              max={fim}
              onChange={(e) => setInicio(e.target.value)}
              disabled={rodando}
            />
          </Field>
          <Field label="Fim">
            <Input
              type="date"
              value={fim}
              min={inicio}
              onChange={(e) => setFim(e.target.value)}
              disabled={rodando}
            />
          </Field>
          <Button onClick={gerar} loading={iniciando || rodando} disabled={rodando}>
            Gerar planilha
          </Button>
        </div>

        {!umDia && (
          <p className="mt-3 text-xs text-brand-brown/60">
            A rotina foi desenhada para um dia — vários dias somam os pedidos de cada loja numa
            planilha só, o que é útil para conferência, mas não é uma ordem de produção.
          </p>
        )}
      </Card>

      {erro !== null && <Alert>{erro}</Alert>}

      {rodando && job !== null && (
        <Card className="flex items-center gap-3">
          <Spinner />
          <div className="text-sm text-brand-brown/80">
            {job.etapa !== null ? ETAPA_LABELS[job.etapa] : "Entrando na fila…"}
            <div className="text-xs text-brand-brown/50">
              Costuma levar de 30 segundos a um minuto. Pode deixar esta aba aberta.
            </div>
          </div>
        </Card>
      )}

      {job !== null && job.status === "erro" && (
        <Alert>
          Não deu para gerar: {job.erro?.mensagem ?? "erro desconhecido"}.
          {" "}Se persistir, mande esse texto para o TI — o log guarda em que etapa parou.
        </Alert>
      )}

      {job !== null && job.status === "concluido" && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-xl text-brand-brown">Planilha pronta</h2>
            <p className="mt-1 text-sm text-brand-brown/70">
              {job.linhas} itens de pedido em {job.colunas} loja
              {job.colunas === 1 ? "" : "s"}
              {job.duracaoMs !== null && ` · ${(job.duracaoMs / 1000).toFixed(0)}s`}
            </p>
          </div>

          {job.avisos.map((aviso) => (
            <Alert key={aviso.codigo}>{aviso.mensagem}</Alert>
          ))}

          {job.arquivo?.url !== undefined ? (
            <Button onClick={() => window.location.assign(job.arquivo!.url!)}>
              Baixar {job.arquivo.nome}
            </Button>
          ) : (
            <Alert>
              O link de download expirou. Gere de novo — leva o mesmo tempo.
            </Alert>
          )}
        </Card>
      )}

      <p className="text-xs text-brand-brown/50">
        Módulo <code className="rounded bg-brand-cream px-1">{module.slug}</code>. O cálculo é
        determinístico: mesmo período, mesma planilha.
      </p>
    </div>
  );
}
