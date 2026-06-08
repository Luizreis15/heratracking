-- Seeds manuais de agências concorrentes + modo de job parcial (enriquecer concorrência)

alter table operations
  add column if not exists concorrentes_seeds jsonb not null default '[]';

alter table operations
  add column if not exists job_mode text not null default 'full'
    check (job_mode in ('full', 'concorrencia'));
