# ADR-0003 — Uma Lambda com Hono, deploy via SAM no GitHub Actions

**Contexto.** Backend precisa custar quase zero, ser fácil de manter por um time pequeno e
escalar sem intervenção.

**Decisão.** Uma única função Lambda (Node 22, arm64) com o framework Hono, exposta pelo API
Gateway HTTP API com domínio próprio, definida em um `template.yaml` do AWS SAM e publicada
exclusivamente pelo GitHub Actions com credenciais temporárias (OIDC).

**Consequências.** Hono roda igual em Lambda, Node local e outros hosts, então o código não fica
preso à AWS. Cold start na faixa de meio segundo, aceitável para uso interno. Se um dia a API
crescer muito, dividir em várias funções é reorganizar rotas, não reescrever.
