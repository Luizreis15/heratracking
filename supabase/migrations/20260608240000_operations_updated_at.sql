-- coluna updated_at com trigger para rastrear a última escrita no worker
-- usada pelo stale-recovery: status=running + updated_at > 45 min → reset para error

alter table operations add column if not exists updated_at timestamptz not null default now();

create or replace function fn_operations_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_operations_updated_at
  before update on operations
  for each row execute function fn_operations_set_updated_at();
