-- V5: KPIs operacionais por operação (leads, conteúdos, reuniões, agendamentos)

create table if not exists operation_metrics (
  id                    uuid primary key default gen_random_uuid(),
  operation_id          uuid not null references operations(id) on delete cascade,
  period_month          date not null,
  leads_captados        int not null default 0 check (leads_captados >= 0),
  conteudos_criados     int not null default 0 check (conteudos_criados >= 0),
  conteudos_publicados  int not null default 0 check (conteudos_publicados >= 0),
  reunioes_realizadas   int not null default 0 check (reunioes_realizadas >= 0),
  agendamentos          int not null default 0 check (agendamentos >= 0),
  notas                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (operation_id, period_month)
);

create index if not exists idx_operation_metrics_operation
  on operation_metrics(operation_id, period_month desc);

alter table operation_metrics enable row level security;

create policy "operation_metrics_select"
  on operation_metrics for select
  using (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

create policy "operation_metrics_insert"
  on operation_metrics for insert
  with check (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

create policy "operation_metrics_update"
  on operation_metrics for update
  using (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

alter publication supabase_realtime add table operation_metrics;
