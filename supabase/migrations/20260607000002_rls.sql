-- F1: RLS policies + Realtime
-- Regra base: usuário só acessa dados do seu workspace.
-- Worker usa service role → bypassa RLS automaticamente.

-- ─── Helper: membro do workspace? ─────────────────────────────────────────
-- (inline nos policies para evitar function security issues)

-- ═══════════════════════════════════════════════════════════════════════════
-- WORKSPACES
-- ═══════════════════════════════════════════════════════════════════════════
alter table workspaces enable row level security;

create policy "workspaces_select"
  on workspaces for select
  using (
    owner_id = auth.uid()
    or id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "workspaces_insert"
  on workspaces for insert
  with check (owner_id = auth.uid());

create policy "workspaces_update"
  on workspaces for update
  using (owner_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- WORKSPACE_MEMBERS
-- ═══════════════════════════════════════════════════════════════════════════
alter table workspace_members enable row level security;

create policy "workspace_members_select"
  on workspace_members for select
  using (user_id = auth.uid());

create policy "workspace_members_insert"
  on workspace_members for insert
  with check (
    -- só o owner do workspace pode adicionar membros
    workspace_id in (select id from workspaces where owner_id = auth.uid())
    or user_id = auth.uid()  -- usuário pode ingressar em workspace próprio
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- METHOD_PROFILES
-- ═══════════════════════════════════════════════════════════════════════════
alter table method_profiles enable row level security;

create policy "method_profiles_select"
  on method_profiles for select
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "method_profiles_insert"
  on method_profiles for insert
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "method_profiles_update"
  on method_profiles for update
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- OPERATIONS
-- ═══════════════════════════════════════════════════════════════════════════
alter table operations enable row level security;

create policy "operations_select"
  on operations for select
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "operations_insert"
  on operations for insert
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    and created_by = auth.uid()
  );

-- update só pelo frontend (para edição futura) — worker usa service role
create policy "operations_update"
  on operations for update
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE_EVENTS (tabela filha via operation_id)
-- ═══════════════════════════════════════════════════════════════════════════
alter table phase_events enable row level security;

create policy "phase_events_select"
  on phase_events for select
  using (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- BLUEPRINTS (tabela filha via operation_id)
-- ═══════════════════════════════════════════════════════════════════════════
alter table blueprints enable row level security;

create policy "blueprints_select"
  on blueprints for select
  using (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

create policy "blueprints_update"
  on blueprints for update
  using (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPETITORS (tabela filha via operation_id)
-- ═══════════════════════════════════════════════════════════════════════════
alter table competitors enable row level security;

create policy "competitors_select"
  on competitors for select
  using (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- EXPORTS (tabela filha via blueprint_id)
-- ═══════════════════════════════════════════════════════════════════════════
alter table exports enable row level security;

create policy "exports_select"
  on exports for select
  using (
    blueprint_id in (
      select b.id from blueprints b
      join operations o on o.id = b.operation_id
      where o.workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME — publicar tabelas para Supabase Realtime
-- ═══════════════════════════════════════════════════════════════════════════
-- operations: status e current_phase atualizam em tempo real
-- phase_events: log de progresso do job
-- competitors: aparecem conforme a skill descobre players
alter publication supabase_realtime add table operations;
alter publication supabase_realtime add table phase_events;
alter publication supabase_realtime add table competitors;
