-- Tipo de operador: agência de marketing vs SaaS B2B (muda ICP, concorrência e prompts)

alter table operations
  add column if not exists operador_tipo text not null default 'agencia'
  check (operador_tipo in ('agencia', 'saas_b2b'));

comment on column operations.operador_tipo is
  'agencia = operador vende marketing; saas_b2b = operador é plataforma/software B2B';
