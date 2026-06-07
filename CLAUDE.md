# CLAUDE.md — HERA Arquiteto

> Contexto persistente do projeto. Leia ESTE arquivo e `docs/PRD.md` antes de qualquer código.

## Missão

Construir o **HERA Arquiteto**: um SaaS que estrutura a operação completa de uma agência de marketing ultra-nichada a partir de um nicho + posicionamento, rodando a skill `arquiteto-de-agencia` (Agent SDK) e entregando um **Blueprint Operacional Mestre (BOM)** + uma **Análise de Concorrência** estruturada.

Primeiro tenant (piloto, single-tenant): **Hera DG** — agência especializada em clínicas de implante dentário e reabilitações orais. O nicho é dado de entrada, não hardcode.

## Modelo mental (LEIA — define toda a arquitetura)

Isto **NÃO é um chat**. É um produto de **job assíncrono**. A geração leva 20–30 min e faz pesquisa na web. Padrão obrigatório:

```
Briefing (form) → insere `operations` (status=queued)
   → WORKER (Agent SDK) pega o job, roda a skill, escreve progresso
   → frontend assina Supabase Realtime e mostra o pipeline ao vivo
   → usuário fecha a aba e volta; job continua no worker
```

## Stack

- **Frontend** (`apps/web`): React 19 + Vite + TypeScript + Tailwind + shadcn/ui. Router: react-router-dom. Estado servidor: @tanstack/react-query. Forms: react-hook-form + zod. Ícones: lucide-react. Cliente Supabase: @supabase/supabase-js.
- **Worker** (`apps/worker`): Node + TypeScript. `@anthropic-ai/claude-agent-sdk`, @supabase/supabase-js (service role), zod, dotenv. Roda em Railway ou Contabo VPS.
- **Dados**: Supabase — Auth, Postgres + RLS, Realtime, Storage.
- **Skill**: `apps/worker/.claude/skills/arquiteto-de-agencia/` (a pasta já existe na raiz do projeto; mova/copie pra cá no setup).

## Estrutura de repositório (monorepo, workspaces npm)

```
HeraTracking/                 (raiz — repo)
├── CLAUDE.md
├── docs/PRD.md
├── arquiteto-de-agencia/     (skill original — fonte de verdade)
├── apps/
│   ├── web/
│   └── worker/
│       └── .claude/skills/arquiteto-de-agencia/   (cópia que o SDK carrega)
└── supabase/                 (migrations + policies)
```

## Regras críticas (não viole)

1. **Nunca rode o job de 20–30 min num Edge Function** — timeout garantido. O loop agêntico roda SÓ no worker.
2. **`settingSources` é obrigatório** no `query()` do Agent SDK pra carregar a skill e o CLAUDE.md (`settingSources: ["project"]`). Sem isso a skill não é descoberta.
3. **`allowedTools` precisa conter `"Skill"` e `"WebSearch"`** (mais Read/Glob/Grep se necessário). O `allowed-tools` do frontmatter NÃO vale no SDK.
4. **`ANTHROPIC_API_KEY` e a service role do Supabase vivem SÓ no worker.** Nunca no frontend, nunca no bundle, nunca em variável `VITE_`.
5. **RLS em tudo**, escopo por `workspace_id`. O frontend usa anon key + sessão do usuário; o worker usa service role.
6. **Sem segredo em URL/query string.** Sem `localStorage` pra dado sensível.
7. **Compliance odonto** no piloto: a copy gerada nunca promete cura/resultado garantido (regras do CFO). Isso é input de `restricoes` da operação, propagado à skill.
8. **Idempotência do worker**: marque `operations.status=running` com lock antes de processar; trate retry sem duplicar Blueprint.

## Convenções de código

- TypeScript estrito. Zod pra validar toda entrada (form e payloads do worker).
- Componentes pequenos, server-state no React Query, sem prop drilling — contexto só onde precisa.
- Migrations versionadas em `supabase/migrations`. Nada de alterar schema pelo dashboard sem migration.
- Commits por fase. Não tente fazer tudo num PR só.

## Ordem de build (execute em fases — ver PRD para critérios de aceite)

0. Scaffold monorepo + deps + env + Supabase local.
1. Schema + RLS + Realtime.
2. Auth + bootstrap do workspace Hera DG (seed).
3. Briefing (Fase 0) → cria `operations`.
4. Worker + Agent SDK rodando a skill, gravando `phase_events` e `blueprints`. (coração)
5. Pipeline UI ao vivo (Realtime).
6. Módulo Análise de Concorrência (tela dedicada).
7. Blueprint viewer/editor + regenerar seção + export.
8. Hardening: erros, retries, observabilidade.

## Definition of Done por fase

Compila, roda local, sem segredo exposto, RLS testada, e o critério de aceite específico da fase no PRD foi cumprido. Pare e me mostre o resultado ao fim de cada fase antes de seguir.
