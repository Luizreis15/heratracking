-- F1: Schema inicial HERA Arquiteto
-- Todas as tabelas com RLS habilitada, escopo por workspace_id via membership.

-- ─── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Tenants ───────────────────────────────────────────────────────────────
create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member',
  primary key (workspace_id, user_id)
);

-- ─── Metodologia proprietária (pontos de extensão da skill) ────────────────
create table if not exists method_profiles (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  nicho           text not null,
  posicionamento  text not null,
  extensoes       jsonb not null default '{}',
  updated_at      timestamptz not null default now()
);

-- ─── Execuções do protocolo ────────────────────────────────────────────────
create table if not exists operations (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces(id) on delete cascade,
  created_by       uuid not null references auth.users(id),
  nicho            text not null,
  posicionamento   text not null,
  ticket_alvo      text not null,
  modelo_entrega   text not null,
  restricoes       text not null default '',
  status           text not null default 'queued'
                     check (status in ('queued','running','done','error')),
  current_phase    text,
  cost_usd         numeric(10,6),
  error            text,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz
);

-- ─── Timeline ao vivo (Realtime) ───────────────────────────────────────────
create table if not exists phase_events (
  id            uuid primary key default gen_random_uuid(),
  operation_id  uuid not null references operations(id) on delete cascade,
  phase         text not null,
  status        text not null default 'pending'
                  check (status in ('pending','running','done','error')),
  log           text,
  started_at    timestamptz,
  finished_at   timestamptz
);

-- ─── Blueprint Operacional Mestre ──────────────────────────────────────────
create table if not exists blueprints (
  id            uuid primary key default gen_random_uuid(),
  operation_id  uuid not null references operations(id) on delete cascade,
  sections      jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);

-- ─── Análise de Concorrência (feature de primeira classe) ──────────────────
create table if not exists competitors (
  id               uuid primary key default gen_random_uuid(),
  operation_id     uuid not null references operations(id) on delete cascade,
  nome             text not null,
  url              text,
  instagram        text,
  posicionamento   text,
  oferta           text,
  ticket_estimado  text,
  pontos_fortes    text,
  pontos_fracos    text,
  angulos_criativos jsonb not null default '[]',
  fonte            text,
  created_at       timestamptz not null default now()
);

-- ─── Exports ───────────────────────────────────────────────────────────────
create table if not exists exports (
  id            uuid primary key default gen_random_uuid(),
  blueprint_id  uuid not null references blueprints(id) on delete cascade,
  formato       text not null,
  storage_path  text,
  created_at    timestamptz not null default now()
);

-- ─── Índices de performance ────────────────────────────────────────────────
create index if not exists idx_operations_workspace_status
  on operations(workspace_id, status);

create index if not exists idx_phase_events_operation
  on phase_events(operation_id);

create index if not exists idx_competitors_operation
  on competitors(operation_id);

create index if not exists idx_blueprints_operation
  on blueprints(operation_id);
