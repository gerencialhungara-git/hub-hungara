import { zValidator } from "@hono/zod-validator";
import { PeriodoSchema, type JobLogistica } from "@hub/shared";
import { Hono } from "hono";
import { currentUser, requireAuth, requireModule, requirePasswordChanged, type AuthVars } from "../auth/middleware.js";
import { env } from "../env.js";
import { HttpError, badRequest, notFound } from "../lib/errors.js";
import { clientIp } from "../lib/request.js";
import { audit } from "../services/audit.js";

const SLUG = "logistica-diaria";

/**
 * Proxy fino para a rotina de Logística, que vive no repositório
 * `automacoes-hungara` e roda como Lambda própria.
 *
 * Por que proxy e não chamada direta do navegador: a chave de API da rotina não pode
 * chegar ao front, e o controle de quem pode gerar a planilha é do Hub. Por que o Hub
 * não espera a planilha: o crawl do Sischef leva ~45 s frio e esta API está atrás de
 * um API Gateway com teto de 30 s — daí o job assíncrono do outro lado, que devolve
 * um id na hora e é consultado por polling.
 */
async function chamarRotina(caminho: string, init?: RequestInit): Promise<Response> {
  const { LOGISTICA_URL, LOGISTICA_API_KEY } = env();
  if (LOGISTICA_URL === undefined || LOGISTICA_API_KEY === undefined) {
    // Configuração incompleta é problema de deploy, não do usuário — mas ele precisa
    // saber que não é culpa dele nem vale insistir.
    throw new HttpError(
      503,
      "ROTINA_NAO_CONFIGURADA",
      "Este módulo ainda não está configurado neste ambiente. Fale com o TI: faltam " +
        "LOGISTICA_URL e LOGISTICA_API_KEY na API.",
    );
  }
  const base = LOGISTICA_URL.replace(/\/$/, "");
  try {
    return await fetch(`${base}${caminho}`, {
      ...init,
      headers: { ...(init?.headers ?? {}), "x-api-key": LOGISTICA_API_KEY },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (erro) {
    console.error("logistica_indisponivel", erro);
    throw new HttpError(
      502,
      "ROTINA_INDISPONIVEL",
      "A rotina de Logística não respondeu. Tente de novo em um minuto.",
    );
  }
}

export const logisticaDiaria = new Hono<AuthVars>()
  .use(requireAuth, requirePasswordChanged, requireModule(SLUG))
  .post("/", zValidator("json", PeriodoSchema), async (c) => {
    const { inicio, fim } = c.req.valid("json");
    const user = currentUser(c);

    const resposta = await chamarRotina("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inicio, fim }),
    });

    const corpo = (await resposta.json().catch(() => ({}))) as {
      job?: JobLogistica;
      error?: { code: string; message: string; issues?: unknown };
    };

    if (!resposta.ok || corpo.job === undefined) {
      const erro = corpo.error;
      throw new HttpError(
        resposta.status === 400 ? 400 : 502,
        erro?.code ?? "FALHA_NA_ROTINA",
        erro?.message ?? "A rotina de Logística recusou o pedido.",
        erro?.issues,
      );
    }

    await audit({
      actorId: user.id,
      action: "logistica.gerar",
      entity: SLUG,
      entityId: corpo.job.jobId,
      payload: { inicio, fim },
      ip: clientIp(c),
    });

    return c.json({ job: corpo.job }, 202);
  })
  .get("/jobs/:jobId", async (c) => {
    const jobId = c.req.param("jobId");
    // O id é gerado do outro lado (uuid); validar aqui evita repassar lixo.
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) throw badRequest("JOB_INVALIDO", "Id de job inválido");

    const resposta = await chamarRotina(`/jobs/${jobId}`);
    if (resposta.status === 404) throw notFound("Esse job não existe mais");
    if (!resposta.ok) {
      throw new HttpError(502, "FALHA_NA_ROTINA", "Não consegui consultar o andamento.");
    }
    const corpo = (await resposta.json()) as { job: JobLogistica };
    return c.json({ job: corpo.job });
  });
