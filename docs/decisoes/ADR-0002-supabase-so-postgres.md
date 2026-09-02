# ADR-0002 — Supabase usado só como Postgres

**Contexto.** O plano free do Supabase é um Postgres gerenciado sem custo, na região São Paulo.
Mas usar a Data API (PostgREST) e a biblioteca `supabase-js` amarraria o frontend ao fornecedor.

**Decisão.** A Lambda é a única que acessa o banco, via Drizzle ORM e SQL padrão pelo pooler
(porta 6543). A Data API do Supabase fica desligada. Nenhum pacote do Supabase no projeto.

**Consequências.** Migrar para RDS/Neon é `pg_dump`/`pg_restore` + trocar variável. Efeitos
colaterais do free tier tratados: keepalive a cada 3 dias evita a pausa por inatividade;
migrations usam a porta 5432 (session mode) porque DDL não funciona bem em transaction mode.
