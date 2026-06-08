-- Hardening: job_mode completo, índices de fila/stale-recovery, incremento atômico de custo

alter table operations drop constraint if exists operations_job_mode_check;

alter table operations
  add constraint operations_job_mode_check
  check (job_mode in (
    'full',
    'concorrencia',
    'intel',
    'comparativo',
    'refine_section',
    'content_generation'
  ));

-- fetchNextQueued: status=queued order by created_at
create index if not exists idx_operations_queued_created
  on operations (created_at)
  where status = 'queued';

-- recoverStaleJobs: status=running AND updated_at < cutoff
create index if not exists idx_operations_running_updated
  on operations (updated_at)
  where status = 'running';

-- Evita race condition: cost_usd = cost_usd + delta no Postgres
create or replace function fn_increment_operation_cost(
  p_operation_id uuid,
  p_delta numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update operations
  set cost_usd = coalesce(cost_usd, 0) + p_delta
  where id = p_operation_id;
end;
$$;
