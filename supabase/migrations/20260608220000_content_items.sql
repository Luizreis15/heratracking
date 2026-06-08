-- Hub de Geração de Conteúdo — itens gerados por job_mode=content_generation
create table content_items (
  id          uuid        primary key default gen_random_uuid(),
  operation_id uuid       not null references operations(id) on delete cascade,
  workspace_id uuid       not null references workspaces(id) on delete cascade,
  format      text        not null,   -- post_instagram | script_reels | email_prospeccao
  dor         text,                   -- dor do ICP usada como insumo
  content     jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

alter table content_items enable row level security;

create policy "content_items_select"
  on content_items for select
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "content_items_delete"
  on content_items for delete
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- parâmetros de entrada para o job de geração de conteúdo
alter table operations add column if not exists content_params jsonb;
