-- Fix bootstrap: INSERT com .select() exige SELECT na linha retornada.
-- Antes do membership existir, o owner precisa poder ler o próprio workspace.

drop policy if exists "workspaces_select" on workspaces;

create policy "workspaces_select"
  on workspaces for select
  using (
    owner_id = auth.uid()
    or id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
