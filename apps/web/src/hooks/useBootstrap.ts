import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const HERA_DG_NAME = "Hera DG";

const DEFAULT_METHOD_PROFILE = {
  nicho: "Clínicas de implante dentário e reabilitação oral",
  posicionamento:
    "Agência especializada em atrair pacientes de alto valor para clínicas odontológicas via marketing digital com compliance CFO",
  extensoes: {
    nivel_consciencia:
      "Público nível 3–4: já sabe que precisa de implante, está comparando clínicas e preços.",
    diferenciais_operador:
      "Foco em reabilitação completa de arcada e implantes múltiplos. Atendimento humanizado e plano de pagamento facilitado.",
    restricoes_copy:
      "Nunca prometer resultado garantido, cura ou percentual de sucesso. Seguir CFO e CFM para publicidade odontológica.",
  },
} as const;

export function useBootstrap() {
  const { session, workspace, setWorkspace } = useAuth();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // uid da última tentativa — evita re-run quando session renova token
  const attemptedForRef = useRef<string | null>(null);

  const uid = session?.user?.id ?? null;

  useEffect(() => {
    // Sai se: sem usuário, workspace já existe, ou já tentamos para este uid
    if (!uid) return;
    if (workspace) return;
    if (attemptedForRef.current === uid) return;
    attemptedForRef.current = uid;

    let cancelled = false;

    async function run() {
      setBootstrapping(true);
      setError(null);

      try {
        // Garante JWT válido no cliente antes de qualquer operação
        const { data: userData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !userData.user) throw new Error("Sessão inválida — faça login novamente");

        const verifiedUid = userData.user.id;

        // 1. Verifica se já é membro de algum workspace
        const { data: memberships, error: memberErr } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", verifiedUid)
          .limit(1);

        if (memberErr) throw memberErr;

        if (memberships && memberships.length > 0) {
          const { data: ws, error: wsErr } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", memberships[0].workspace_id)
            .single();
          if (wsErr) throw wsErr;
          if (!cancelled && ws) setWorkspace(ws);
          return;
        }

        // 2. Primeira vez — cria workspace Hera DG
        const { data: newWs, error: wsErr } = await supabase
          .from("workspaces")
          .insert({ name: HERA_DG_NAME, owner_id: verifiedUid })
          .select()
          .single();

        if (wsErr) throw new Error(`Erro ao criar workspace: ${wsErr.message} (${wsErr.code})`);
        if (!newWs) throw new Error("Workspace não retornado após insert");

        // 3. Adiciona como owner/member
        const { error: memberInsertErr } = await supabase
          .from("workspace_members")
          .insert({ workspace_id: newWs.id, user_id: verifiedUid, role: "owner" });
        if (memberInsertErr) throw memberInsertErr;

        // 4. Method profile padrão (falha silenciosa)
        await supabase.from("method_profiles").insert({
          workspace_id: newWs.id,
          nicho: DEFAULT_METHOD_PROFILE.nicho,
          posicionamento: DEFAULT_METHOD_PROFILE.posicionamento,
          extensoes: DEFAULT_METHOD_PROFILE.extensoes,
        });

        if (!cancelled) setWorkspace(newWs);
      } catch (err) {
        // Libera a trava para nova tentativa em caso de erro
        if (!cancelled) {
          attemptedForRef.current = null;
          setError(err instanceof Error ? err.message : "Erro ao inicializar workspace");
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    void run();
    return () => { cancelled = true; };
  }, [uid, workspace, setWorkspace]);

  return { bootstrapping, error };
}
