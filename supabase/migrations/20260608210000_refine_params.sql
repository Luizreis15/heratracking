-- coluna para passar { section_key, instruction } ao worker no job_mode = refine_section
alter table operations add column if not exists refine_params jsonb;
