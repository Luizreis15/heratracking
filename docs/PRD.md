# PRD — HERA Arquiteto

Especificação de build. Pareie com `CLAUDE.md`. Tudo em português (produto pt-BR).

## 1. Produto

SaaS que gera a operação de uma agência ultra-nichada e a análise de concorrência do nicho, rodando a skill `arquiteto-de-agencia`. Entrega:
- **Blueprint Operacional Mestre (BOM)** — 7 seções (ver skill).
- **Análise de Concorrência** — players do nicho, ofertas, tickets, posicionamento e criativos, estruturados e navegáveis.

Piloto: **Hera DG** (implante dentário / reabilitação oral), single-tenant. Arquitetura já multi-tenant-ready (RLS por `workspace_id`), mas sem billing nesta fase.

## 2. Modelo de dados (Postgres / Supabase)

Todas as tabelas com RLS habilitada, escopo por `workspace_id` via membership.

```sql
-- tenant
workspaces(id uuid pk, name text, owner_id uuid, created_at timestamptz)
workspace_members(workspace_id uuid, user_id uuid, role text, pk(workspace_id,user_id))

-- moat: metodologia proprietária do operador (os [EXTENSÃO] da skill)
method_profiles(
  id uuid pk, workspace_id uuid, nicho text, posicionamento text,
  extensoes jsonb,            -- chave=ponto de extensão, valor=texto do operador
  updated_at timestamptz)

-- uma execução do protocolo
operations(
  id uuid pk, workspace_id uuid, created_by uuid,
  nicho text, posicionamento text, ticket_alvo text, modelo_entrega text,
  restricoes text,
  status text,                -- queued | running | done | error
  current_phase text,         -- pesquisa|icp|oferta|comercial|posicionamento|trafego|blueprint
  cost_usd numeric, error text,
  created_at timestamptz, finished_at timestamptz)

-- timeline ao vivo (alimenta o pipeline UI via Realtime)
phase_events(
  id uuid pk, operation_id uuid, phase text,
  status text,                -- pending | running | done | error
  log text,                   -- mensagens de progresso ("pesquisando concorrentes...")
  started_at timestamptz, finished_at timestamptz)

-- saída principal: seções editáveis independentemente
blueprints(
  id uuid pk, operation_id uuid,
  sections jsonb,             -- { mercado_icp, oferta_escada, comercial, posicionamento, trafego_funil, checklist, hipoteses }
  updated_at timestamptz)

-- ANÁLISE DE CONCORRÊNCIA (feature de primeira classe — pedido explícito)
competitors(
  id uuid pk, operation_id uuid,
  nome text, url text, instagram text,
  posicionamento text,        -- como se vende
  oferta text,                -- o que oferece / pacote
  ticket_estimado text,       -- preço praticado (com fonte)
  pontos_fortes text, pontos_fracos text,
  angulos_criativos jsonb,    -- ganchos/ângulos que estão rodando
  fonte text,                 -- de onde veio o dado (busca, ad library, site)
  created_at timestamptz)

exports(id uuid pk, blueprint_id uuid, formato text, storage_path text, created_at timestamptz)
```

RLS padrão: `using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))`. Tabelas filhas (phase_events, blueprints, competitors) herdam via join com `operations`.

Habilite Realtime em `operations`, `phase_events`, `competitors`.

## 3. Pipeline (worker × skill)

O worker executa o protocolo da skill via Agent SDK. Mapa fase → tabela:

| Fase skill | Grava |
|---|---|
| 1 Pesquisa + ICP | `phase_events`, popula `competitors`, escreve seção `mercado_icp` |
| 2 Oferta/escada | seção `oferta_escada` |
| 3 Comercial | seção `comercial` |
| 4 Posicionamento | seção `posicionamento` |
| 5 Tráfego/funil | seção `trafego_funil` |
| 6 Consolidação | `checklist`, `hipoteses`, finaliza `blueprints` |

**Como o worker captura saída estruturada:** instrua a skill (via prompt do worker) a emitir, ao fim de cada fase, um bloco delimitado `<<<HERA_PHASE:nome>>> ...json... <<<END>>>`. O worker parseia esses blocos e grava nas tabelas. A Fase 1 deve emitir também `<<<HERA_COMPETITORS>>> [ {nome,url,oferta,ticket_estimado,...} ] <<<END>>>` pra alimentar `competitors`. (Adicione esse contrato de saída como um `references/00-output-contract.md` na cópia da skill do worker — não altere a skill original.)

Hooks do SDK (`PostToolUse`, `Stop`) → use pra escrever `phase_events.log` em tempo real conforme o agente roda buscas/ferramentas.

## 4. Worker — esqueleto

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: buildPrompt(operation),          // briefing + ordem de rodar o protocolo + contrato de saída
  options: {
    systemPrompt: { type: "preset", preset: "claude_code" },
    settingSources: ["project"],            // OBRIGATÓRIO p/ carregar a skill e o CLAUDE.md
    allowedTools: ["Skill", "WebSearch", "Read", "Glob", "Grep"],
    permissionMode: "acceptEdits",
    cwd: workerSkillRoot,                    // dir que contém .claude/skills/arquiteto-de-agencia
    env: { ...process.env, API_TIMEOUT_MS: "600000" },
  },
})) {
  await persistProgress(operation.id, message); // parseia blocos, grava phase_events/sections/competitors
}
```

MCP (fase futura): adicione `mcpServers` nas options pra Supermetrics/Windsor (benchmark real de tráfego na Fase 5) e um crawler na Fase 1. Não inclua nesta primeira entrega — primeiro o caminho feliz com WebSearch.

## 5. Variáveis de ambiente

**worker** (`.env`, nunca commitado): `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
**web** (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## 6. Telas (apps/web)

1. **Auth** (Supabase) + bootstrap do workspace Hera DG.
2. **Nova Operação** — wizard Fase 0: nicho, posicionamento, ticket-alvo, modelo de entrega, restrições. Validação Zod. Submit → insere `operations` (queued).
3. **Pipeline (tela-herói)** — as 6 fases como pipeline ao vivo (pending/running/done), log em streaming por fase, tempo e custo. Realtime em `operations` + `phase_events`. Resiliente a reload (estado vem do banco).
4. **Análise de Concorrência** — tabela/cards de `competitors`: nome, oferta, ticket, posicionamento, pontos fortes/fracos, ângulos de criativo, fonte. Filtro e ordenação. É um entregável navegável, não um anexo do Blueprint.
5. **Blueprint** — 7 seções renderizadas (markdown), editáveis inline, botão "regenerar seção" (reenfileira só aquela fase), export PDF/docx/Notion/link.
6. **Library** — operações por workspace, status, versão.

## 7. Dependências (instalar na Fase 0)

**web:** `react react-dom`, `-D vite @vitejs/plugin-react typescript`, `tailwindcss postcss autoprefixer`, `@supabase/supabase-js`, `@tanstack/react-query`, `react-router-dom`, `react-hook-form zod @hookform/resolvers`, `lucide-react`, shadcn/ui (init).
**worker:** `@anthropic-ai/claude-agent-sdk`, `@supabase/supabase-js`, `zod`, `dotenv`, `-D typescript tsx @types/node`.
**tooling:** Supabase CLI.

## 8. Fases de build + critérios de aceite

- **F0 Scaffold:** monorepo npm workspaces, web e worker compilam, deps instaladas, `.env.example` criado, Supabase local subindo. ✅ `npm run dev` (web) e `npm run dev` (worker) rodam sem erro.
- **F1 Schema:** migrations aplicadas, RLS testada (usuário só vê seu workspace), Realtime habilitado. ✅ inserir `operations` por SQL e ver via cliente autenticado.
- **F2 Auth + seed:** login funciona, workspace Hera DG + method_profile (implante) seedados. ✅ usuário logado cai no workspace.
- **F3 Briefing:** wizard valida e cria `operations(queued)`. ✅ aparece na Library com status queued.
- **F4 Worker:** consome queued, roda a skill, grava phase_events/sections/competitors, marca done. ✅ uma operação real do nicho implante gera Blueprint completo + ≥3 competitors.
- **F5 Pipeline UI:** fases animam ao vivo via Realtime, sobrevive a reload. ✅ fechar e reabrir a aba mostra o estado correto.
- **F6 Concorrência:** tela lista competitors da operação com filtro. ✅ dados da F4 renderizam navegáveis.
- **F7 Blueprint:** viewer + edição inline + regenerar seção + export. ✅ editar uma seção persiste; export gera arquivo.
- **F8 Hardening:** retry idempotente, estados de erro na UI, log de custo. ✅ matar o worker no meio e reprocessar não duplica Blueprint.

## 9. Fora de escopo desta entrega

Billing/créditos, multi-tenant self-serve, MCPs externos (Supermetrics/Windsor/crawler/Ad Library), notificação por e-mail/push. Arquitetura deixa espaço, mas piloto valida o motor primeiro.
