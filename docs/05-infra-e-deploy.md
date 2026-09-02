# Hub Hungara — Infra e deploy

## Contas e endereços

| Item | Valor |
|---|---|
| Conta AWS | `622703417827` (Hungara), região `sa-east-1` (São Paulo) |
| Perfil local do AWS CLI | `hungara` (`AWS_PROFILE=hungara`). O perfil `default` desta máquina é de outro cliente |
| GitHub | `gerencialhungara-git/hub-hungara` |
| Site | `https://hub.hungaralanches.com.br` (Amplify) |
| API | `https://api.hub.hungaralanches.com.br` (API Gateway → Lambda `hub-hungara-api`) |
| Banco | Supabase, projeto na região São Paulo (plano free) |
| DNS | Painel externo do domínio `hungaralanches.com.br` (não é Route53) |
| Primeiro admin | `gerencial.hungara@gmail.com` |

## O que é automático

- **Site**: todo push em `main` → Amplify builda `apps/web` e publica.
- **API**: todo push em `main` que toque `apps/api` ou `packages/shared` → workflow `deploy-api.yml`
  roda migrations no Supabase e `sam deploy` na Lambda. Sem chave AWS no GitHub: usa OIDC.
- **CI**: todo PR → typecheck, lint, testes com Postgres real, build do site, validação do template SAM.

## Setup inicial (uma vez)

1. **Perfil AWS**: `aws configure --profile hungara` (já feito). Confira: `aws sts get-caller-identity --profile hungara`.
2. **GitHub**: criar o repo privado `gerencialhungara-git/hub-hungara`, fazer o primeiro push, proteger `main`
   (PR obrigatório com CI verde). Criar o *environment* `producao`.
3. **Bootstrap AWS**: `./infra/bootstrap/bootstrap.sh`. Cria role OIDC, budget de US$ 5 e pede o certificado
   da API. Ele imprime o CNAME de validação para criar no DNS e todos os valores para colar no GitHub.
4. **Supabase**: novo projeto na região São Paulo. Guardar a senha do banco. Em *Connect*, copiar as duas URLs:
   *Transaction pooler* (porta 6543 → `DATABASE_URL`) e *Session pooler* (porta 5432 → `DATABASE_URL_MIGRATE`).
   Em *Settings → API*, **desligar a Data API**: ninguém acessa o banco sem passar pela Lambda.
5. **GitHub → Settings → Secrets and variables → Actions**:
   - Secrets: `AWS_ROLE_ARN`, `ACM_CERT_ARN`, `DATABASE_URL`, `DATABASE_URL_MIGRATE`, `JWT_SECRET`
   - Variables: `ALLOWED_ORIGINS`, `COOKIE_DOMAIN`, `API_DOMAIN_NAME`
6. **Primeiro deploy da API**: Actions → "Deploy da API" → Run workflow. No fim, o output `ApiDomainTarget`
   da stack (`aws cloudformation describe-stacks --stack-name hub-hungara-api --profile hungara`) é o alvo
   do CNAME `api.hub` a criar no DNS.
7. **Primeiro admin**: Actions → "Criar ou redefinir admin" → Run workflow. A senha temporária sai no log;
   copie e **apague o log do job**. Depois rode o seed local apontando para produção (`npm run db:seed -w apps/api`
   com `DATABASE_URL` de produção no `.env`) para criar os módulos iniciais.
8. **Amplify** (console AWS, perfil Hungara): New app → GitHub → autorizar na org → repo `hub-hungara`,
   branch `main` → monorepo, app root `apps/web` → variável `VITE_API_URL=https://api.hub.hungaralanches.com.br`.
   Em *Rewrites and redirects*, adicionar a regra SPA:
   `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>` → `/index.html` (200).
   Em *Domain management*: `hungaralanches.com.br`, só o subdomínio `hub`. O Amplify mostra dois CNAMEs
   para criar no DNS (validação do certificado e o `hub` em si).
9. **Alertas**: inscrever `gerencial.hungara@gmail.com` no tópico SNS `hub-hungara-alertas`
   (`aws sns subscribe --topic-arn <AlertsTopicArn> --protocol email --notification-endpoint ...`) e confirmar o e-mail.

## Variáveis de ambiente da Lambda

| Variável | Origem | Uso |
|---|---|---|
| `DATABASE_URL` | secret | pooler 6543 |
| `JWT_SECRET` | secret | assina os access tokens |
| `ALLOWED_ORIGINS` | variable | CORS |
| `COOKIE_DOMAIN` | variable | `hub.hungaralanches.com.br` (o cookie vale para `api.hub.` também) |
| `APP_VERSION` | automático | SHA do commit, aparece em `/health` |

## Rodar local

```bash
nvm use            # Node 22
npm install
docker run -d --name hub-pg -p 5433:5432 -e POSTGRES_PASSWORD=hub -e POSTGRES_USER=hub -e POSTGRES_DB=hub postgres:16-alpine
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env
npm run db:migrate && npm run db:seed
npm run create-admin -- voce@exemplo.com "Seu Nome"
npm run dev        # API :3000 + site :5173
```
