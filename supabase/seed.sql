-- Seed HERA DG — roda DEPOIS do primeiro login via app.
-- O workspace e o method_profile são criados pelo hook useBootstrap no frontend.
-- Este arquivo documenta os valores de referência e pode ser usado para re-seeding manual.

-- ─── Re-seed manual (substitua <USER_ID> e <WORKSPACE_ID> pelos valores reais) ─────────────
-- Para usar: abra o SQL Editor no Supabase dashboard e execute com os IDs corretos.

/*
-- 1. Workspace Hera DG
INSERT INTO workspaces (id, name, owner_id)
VALUES ('<WORKSPACE_ID>', 'Hera DG', '<USER_ID>')
ON CONFLICT (id) DO NOTHING;

-- 2. Membership
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('<WORKSPACE_ID>', '<USER_ID>', 'owner')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 3. Method profile — nicho implante dentário / reabilitação oral
INSERT INTO method_profiles (workspace_id, nicho, posicionamento, extensoes)
VALUES (
  '<WORKSPACE_ID>',
  'Clínicas de implante dentário e reabilitação oral',
  'Agência especializada em atrair pacientes de alto valor para clínicas odontológicas via marketing digital com compliance CFO',
  '{
    "nivel_consciencia": "Público nível 3–4: já sabe que precisa de implante, está comparando clínicas e preços.",
    "diferenciais_operador": "Foco em reabilitação completa de arcada e implantes múltiplos. Atendimento humanizado e plano de pagamento facilitado.",
    "restricoes_copy": "Nunca prometer resultado garantido, cura ou percentual de sucesso. Seguir CFO e CFM para publicidade odontológica."
  }'::jsonb
)
ON CONFLICT DO NOTHING;
*/

-- Nota: o bootstrap automático no app (useBootstrap.ts) cria estes dados no primeiro login.
-- Não é necessário rodar este seed manualmente a não ser para recuperação/teste.
