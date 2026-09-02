#!/usr/bin/env bash
# Roda UMA vez, na máquina do responsável, com o perfil AWS da Hungara.
# Cria: provedor OIDC do GitHub, role de deploy, budget de custo, certificado da API.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-hungara}"
export AWS_DEFAULT_REGION=sa-east-1
CONTA_ESPERADA=622703417827

CONTA=$(aws sts get-caller-identity --query Account --output text)
if [[ "$CONTA" != "$CONTA_ESPERADA" ]]; then
  echo "ERRO: perfil '$AWS_PROFILE' aponta para a conta $CONTA, esperado $CONTA_ESPERADA (Hungara). Abortando." >&2
  exit 1
fi
echo "Conta OK: $CONTA (perfil $AWS_PROFILE)"

echo "→ Provedor OIDC + role de deploy + budget"
aws cloudformation deploy \
  --stack-name hub-hungara-bootstrap \
  --template-file "$(dirname "$0")/github-oidc.yaml" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

ROLE_ARN=$(aws cloudformation describe-stacks --stack-name hub-hungara-bootstrap \
  --query "Stacks[0].Outputs[?OutputKey=='DeployRoleArn'].OutputValue" --output text)

echo "→ Certificado HTTPS da API (api.hub.hungaralanches.com.br)"
CERT_ARN=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='api.hub.hungaralanches.com.br'].CertificateArn | [0]" --output text)
if [[ -z "$CERT_ARN" || "$CERT_ARN" == "None" ]]; then
  CERT_ARN=$(aws acm request-certificate --domain-name api.hub.hungaralanches.com.br --validation-method DNS --query CertificateArn --output text)
  sleep 10
fi
echo
echo "Crie este CNAME no painel de DNS para validar o certificado:"
aws acm describe-certificate --certificate-arn "$CERT_ARN" --query 'Certificate.DomainValidationOptions[0].ResourceRecord' --output table

cat <<FIM

==================== COLE NO GITHUB (Settings → Secrets and variables → Actions) ====================
Secrets:
  AWS_ROLE_ARN          = $ROLE_ARN
  ACM_CERT_ARN          = $CERT_ARN
  DATABASE_URL          = (Supabase → Connect → Transaction pooler, porta 6543)
  DATABASE_URL_MIGRATE  = (Supabase → Connect → Session pooler, porta 5432)
  JWT_SECRET            = $(openssl rand -base64 48 | tr -d '\n')
Variables:
  ALLOWED_ORIGINS       = https://hub.hungaralanches.com.br
  COOKIE_DOMAIN         = hub.hungaralanches.com.br
  API_DOMAIN_NAME       = api.hub.hungaralanches.com.br
=====================================================================================================
FIM
