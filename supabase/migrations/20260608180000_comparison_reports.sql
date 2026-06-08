-- Relatório comparativo estratégico (Claude) — 1 por operação
alter table operations drop constraint if exists operations_job_mode_check;

alter table operations
  add constraint operations_job_mode_check
  check (job_mode in ('full', 'concorrencia', 'intel', 'comparativo'));

create table if not exists comparison_reports (
  id            uuid primary key default gen_random_uuid(),
  operation_id  uuid not null references operations(id) on delete cascade,
  content       jsonb not null default '{}',
  model         text,
  cost_usd      numeric(10, 4),
  generated_at  timestamptz not null default now(),
  unique (operation_id)
);

create index if not exists idx_comparison_reports_operation
  on comparison_reports(operation_id);

alter table comparison_reports enable row level security;

create policy "comparison_reports_select"
  on comparison_reports for select
  using (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

alter publication supabase_realtime add table comparison_reports;
