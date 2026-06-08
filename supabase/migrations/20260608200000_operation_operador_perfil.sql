-- Perfil da empresa/operador por operação (100% editável na UI)

alter table operations
  add column if not exists operador_perfil jsonb;

comment on column operations.operador_perfil is
  'Perfil interno da agência nesta operação — nome, oferta, posicionamento, etc.';

-- operations: owner sem membership também pode ler/atualizar
drop policy if exists "operations_select" on operations;
drop policy if exists "operations_update" on operations;

create policy "operations_select"
  on operations for select
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

create policy "operations_update"
  on operations for update
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or workspace_id in (select id from workspaces where owner_id = auth.uid())
  )
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    or workspace_id in (select id from workspaces where owner_id = auth.uid())
  );
