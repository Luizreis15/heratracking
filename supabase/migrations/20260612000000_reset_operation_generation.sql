-- Regenerar operação: reseta blueprint e reenfileira job full (briefing preservado).
-- Chamado pelo frontend via supabase.rpc('fn_reset_operation_generation', ...).

create or replace function fn_reset_operation_generation(
  p_operation_id uuid,
  p_keep_competitors boolean default true,
  p_keep_content boolean default false,
  p_keep_comparison boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_status text;
begin
  select o.workspace_id, o.status
    into v_workspace_id, v_status
  from operations o
  where o.id = p_operation_id;

  if v_workspace_id is null then
    raise exception 'Operação não encontrada';
  end if;

  if not exists (
    select 1 from workspace_members wm
    where wm.workspace_id = v_workspace_id and wm.user_id = auth.uid()
  ) and not exists (
    select 1 from workspaces w
    where w.id = v_workspace_id and w.owner_id = auth.uid()
  ) then
    raise exception 'Sem permissão para regenerar esta operação';
  end if;

  if v_status in ('queued', 'running') then
    raise exception 'Operação em andamento — aguarde a conclusão antes de regenerar';
  end if;

  delete from phase_events where operation_id = p_operation_id;

  insert into phase_events (operation_id, phase, status)
  values
    (p_operation_id, 'pesquisa', 'pending'),
    (p_operation_id, 'oferta', 'pending'),
    (p_operation_id, 'comercial', 'pending'),
    (p_operation_id, 'posicionamento', 'pending'),
    (p_operation_id, 'trafego', 'pending'),
    (p_operation_id, 'blueprint', 'pending');

  update blueprints
  set sections = '{}'::jsonb,
      spin_guide = null,
      updated_at = now()
  where operation_id = p_operation_id;

  if not p_keep_competitors then
    delete from competitors where operation_id = p_operation_id;
  end if;

  if not p_keep_content then
    delete from content_items where operation_id = p_operation_id;
  end if;

  if not p_keep_comparison then
    delete from comparison_reports where operation_id = p_operation_id;
  end if;

  update operations
  set status = 'queued',
      job_mode = 'full',
      error = null,
      finished_at = null,
      current_phase = null,
      cost_usd = null,
      refine_params = null,
      content_params = null,
      updated_at = now()
  where id = p_operation_id;
end;
$$;

grant execute on function fn_reset_operation_generation(uuid, boolean, boolean, boolean)
  to authenticated;

comment on function fn_reset_operation_generation is
  'Reenfileira geração full do BOM: limpa blueprint/fases, preserva briefing; opções para manter concorrentes/conteúdo/comparativo';
