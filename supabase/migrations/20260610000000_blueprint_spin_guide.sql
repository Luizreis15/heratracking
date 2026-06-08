-- Adiciona coluna spin_guide na tabela blueprints
-- Estrutura: { situacao: string[], problema: string[], implicacao: string[], necessidade: string[] }

alter table blueprints
  add column if not exists spin_guide jsonb;

comment on column blueprints.spin_guide is
  'Guia SPIN Selling gerado pelo agente: { situacao, problema, implicacao, necessidade } — arrays de perguntas específicas do nicho';
