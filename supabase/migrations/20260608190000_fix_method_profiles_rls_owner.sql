-- Fix: owner do workspace precisa ler/editar method_profiles mesmo sem row em workspace_members
-- (bootstrap parcial ou workspace criado antes do membership).

drop policy if exists "method_profiles_select" on method_profiles;
drop policy if exists "method_profiles_insert" on method_profiles;
drop policy if exists "method_profiles_update" on method_profiles;

create policy "method_profiles_select"
  on method_profiles for select
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

create policy "method_profiles_insert"
  on method_profiles for insert
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

create policy "method_profiles_update"
  on method_profiles for update
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or workspace_id in (select id from workspaces where owner_id = auth.uid())
  )
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- Workspace: membros owner/admin podem atualizar metadados (ex.: hera_premium_client_id)
drop policy if exists "workspaces_update" on workspaces;

create policy "workspaces_update"
  on workspaces for update
  using (
    owner_id = auth.uid()
    or id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
