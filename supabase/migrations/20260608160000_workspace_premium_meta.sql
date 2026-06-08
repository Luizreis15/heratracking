-- V6 Meta: vínculo com cliente Hera DG no painel premium-zero (meta_connections)

alter table workspaces
  add column if not exists hera_premium_client_id text;

comment on column workspaces.hera_premium_client_id is
  'UUID do cliente em frontend-premium-zero (tabela clients) para ler meta_connections.';
