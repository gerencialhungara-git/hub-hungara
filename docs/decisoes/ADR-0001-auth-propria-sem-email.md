# ADR-0001 — Autenticação própria na Lambda, sem e-mail

**Contexto.** Avaliamos Supabase Auth, Cognito e autenticação própria. O requisito forte era
portabilidade: poder sair do Supabase sem obrigar todo mundo a redefinir senha nem reescrever o app.
Também não há serviço de e-mail configurado na conta AWS da Hungara.

**Decisão.** Login com e-mail e senha implementado na própria API (bcrypt + JWT de 15 min +
refresh token rotativo em cookie httpOnly). O admin cria usuários com senha temporária e redefine
quando necessário; não há envio de e-mail.

**Consequências.** Independência total de fornecedor de identidade; código de segurança sob nossa
responsabilidade (coberto por testes de integração). Reset self-service por e-mail fica para uma
fase futura, quando existir um remetente configurado.
