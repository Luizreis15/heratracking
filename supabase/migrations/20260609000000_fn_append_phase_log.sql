-- Atomic phase-log append — replaces the SELECT+UPDATE N+1 in the worker.
-- A single UPDATE with server-side concatenation; keeps last 4000 chars.
create or replace function fn_append_phase_log(
  p_operation_id uuid,
  p_phase        text,
  p_line         text
) returns void language plpgsql as $$
begin
  update phase_events
  set log = case
    when log is null or log = '' then p_line
    else right(log || chr(10) || p_line, 4000)
  end
  where operation_id = p_operation_id
    and phase = p_phase;
end;
$$;
