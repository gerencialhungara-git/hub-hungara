# Hub Hungara — Runbook

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Site abre, login dá "Não deu para conectar na API" | API fora, CORS ou DNS de `api.hub` | `curl https://api.hub.hungaralanches.com.br/health`. Se 5xx, ver logs da Lambda no CloudWatch (`/aws/lambda/hub-hungara-api`). Se erro de CORS no console do navegador, conferir `ALLOWED_ORIGINS` |
| `/health` responde `db: down` | Supabase pausado ou senha do banco mudou | Abrir o projeto no Supabase (se pausado, "Restore"). Conferir `DATABASE_URL`. O keepalive de 3 dias evita a pausa; se falhou, ver o log da Lambda |
| Usuário travado por 15 minutos | 10 senhas erradas | Esperar, ou admin redefine a senha (isso zera o bloqueio) |
| Pessoa não vê um módulo | Perfil não marcado, exceção "bloquear", módulo inativo | Admin → Implementações → conferir perfis, exceções e status |
| Módulo interno mostra "sem código publicado" | Slug cadastrado não existe em `registry.ts` ou deploy do site ainda não terminou | Conferir o Amplify (build verde?) e o slug |
| Embed em branco | Site alvo bloqueia iframe | Trocar o tipo para link |
| Deploy da API falhou em "Migrations" | Migration inválida ou `DATABASE_URL_MIGRATE` errada (tem que ser porta 5432) | Ler o log do job. A Lambda antiga continua no ar |
| Deploy da API falhou em "sam deploy" | Permissão da role OIDC ou template inválido | Log do job; `sam validate --lint` local; conferir `infra/bootstrap/github-oidc.yaml` |
| E-mail de alerta de custo | Algo saiu do esperado | Console AWS → Billing → Cost Explorer filtrando pela tag/stack `hub-hungara-api` |
| Alarme `hub-hungara-api-errors` | Exceção não tratada na API | CloudWatch Logs Insights: `filter @message like /unhandled_error/` |

## Onde olhar

- **Logs da API**: CloudWatch → Log groups → `/aws/lambda/hub-hungara-api` (14 dias).
- **Logs de acesso do API Gateway**: `/aws/apigateway/hub-hungara-api`.
- **Build do site**: console Amplify → app → branch `main`.
- **Banco**: Supabase → Table editor / SQL editor.
- **Auditoria de uso**: dentro do Hub, menu Auditoria.

## Operações comuns

- **Redefinir senha de alguém**: Admin → Usuários → Senha.
- **Derrubar sessões de alguém** (celular perdido): Admin → Usuários → ícone de sair.
- **Trocar o `JWT_SECRET`**: atualizar o secret no GitHub e rodar o deploy da API. Todo mundo é deslogado.
- **Publicar sem mudar código** (ex.: só variável): Actions → Deploy da API → Run workflow.
- **Voltar uma versão da API**: `git revert` do commit e push em `main`.

## Sair do Supabase (se um dia precisar)

1. `pg_dump` do banco do Supabase; `pg_restore` no destino (RDS Postgres, Neon, etc.).
2. Trocar `DATABASE_URL` e `DATABASE_URL_MIGRATE` nos secrets do GitHub.
3. Rodar o deploy da API. Nada no código muda: não existe biblioteca do Supabase no projeto.
