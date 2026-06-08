-- V6: Feed de inteligência competitiva

alter table operations drop constraint if exists operations_job_mode_check;

alter table operations
  add constraint operations_job_mode_check
  check (job_mode in ('full', 'concorrencia', 'intel'));

alter table operations
  add column if not exists last_intel_scan_at timestamptz;

create table if not exists intel_events (
  id              uuid primary key default gen_random_uuid(),
  operation_id    uuid not null references operations(id) on delete cascade,
  competitor_id   uuid references competitors(id) on delete set null,
  competitor_nome text not null,
  event_type      text not null
                    check (event_type in ('post', 'landing', 'criativo', 'oferta', 'outro')),
  titulo          text not null,
  resumo          text,
  url             text,
  fonte           text,
  detected_at     timestamptz not null default now(),
  scan_id         uuid not null default gen_random_uuid(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_intel_events_operation_detected
  on intel_events(operation_id, detected_at desc);

create unique index if not exists idx_intel_events_dedup_url
  on intel_events(operation_id, lower(url))
  where url is not null and url <> '';

alter table intel_events enable row level security;

create policy "intel_events_select"
  on intel_events for select
  using (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

create policy "intel_events_insert"
  on intel_events for insert
  with check (
    operation_id in (
      select id from operations
      where workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      )
    )
  );

alter publication supabase_realtime add table intel_events;
