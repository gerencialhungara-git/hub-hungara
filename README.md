# Hub Hungara

Portal interno da **Hungara Lanches**: login único, catálogo de implementações (páginas internas,
links e embeds) e controle de acesso por perfil, administrado pelo time de tecnologia e processos.

- Site: https://hub.hungaralanches.com.br · API: https://api.hub.hungaralanches.com.br
- Documentação: [`docs/`](docs/README.md) — comece por [`docs/como-funciona.html`](docs/como-funciona.html)
  (para leigos) ou [`docs/04-como-subir-uma-implementacao.md`](docs/04-como-subir-uma-implementacao.md) (para publicar algo novo).

## Rodar local em 5 minutos

```bash
nvm use                       # Node 22 (.nvmrc)
npm install
docker run -d --name hub-pg -p 5433:5432 -e POSTGRES_PASSWORD=hub -e POSTGRES_USER=hub -e POSTGRES_DB=hub postgres:16-alpine
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run db:migrate && npm run db:seed
npm run create-admin -- voce@exemplo.com "Seu Nome"   # imprime a senha temporária
npm run dev                   # API em http://localhost:3000, site em http://localhost:5173
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | API + site em modo desenvolvimento |
| `npm test` | Testes de integração da API (precisa do Postgres local) |
| `npm run typecheck` · `npm run lint` | Checagens que o CI roda |
| `npm run db:generate` | Gera migration a partir de `apps/api/src/db/schema.ts` |
| `npm run db:migrate` · `npm run db:seed` | Aplica migrations · cria módulos iniciais |
| `npm run create-admin -- <email> "<nome>" [senha]` | Cria ou promove um admin |

## Estrutura

```
apps/web         Frontend React (Amplify). Módulos internos em src/modules/
apps/api         Lambda Hono + SAM. Rotas em src/routes/, schema em src/db/
packages/shared  Schemas zod e tipos compartilhados
infra/bootstrap  Role OIDC do GitHub + budget (rodar uma vez)
docs             Documentação (também publicada dentro do Hub)
```

## Deploy

Tudo automático a partir da branch `main`: o Amplify publica o site; o GitHub Actions
(`deploy-api.yml`) migra o banco e publica a Lambda via SAM usando OIDC (sem chave AWS no GitHub).
Setup inicial e valores reais em [`docs/05-infra-e-deploy.md`](docs/05-infra-e-deploy.md).

> Atenção: o AWS CLI desta máquina tem o perfil `hungara` para a conta da Hungara. Nunca use o perfil `default`.
