import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { DEFAULT_OPERADOR_PROFILE } from "@/lib/operador-profile";
import type { Workspace } from "@/types/index";

const HERA_DG_NAME = "Hera DG";

const DEFAULT_METHOD_PROFILE = {
  nicho: "Clínicas e consultórios implantodontistas (clientes B2B da agência)",
  posicionamento:
    "Digital Hera Marketing / Hera DG — agência especializada em estruturar marketing digital para clínicas captarem mais pacientes de implante e reabilitação oral, com compliance CFO/CFM",
  extensoes: {
    modelo_negocio:
      "B2B: a agência vende marketing para dentistas/clínicas. ICP = implantodontista dono de clínica. Concorrência = outras agências de marketing odonto (ex.: agenciacomia.com.br).",
    nivel_consciencia:
      "Cliente B2B nível 3–4: dentista/clínica já sabe que precisa de marketing estruturado, está comparando agências e modelos de contrato.",
    diferenciais_operador:
      "Foco em captação previsível de pacientes de implante/reabilitação, operação enxuta, compliance CFO e linguagem que converte sem prometer resultado.",
    ticket_referencia:
      "Retainer R$ 2.500–4.000/mês que a clínica paga à Hera DG — não confundir com ticket do procedimento odontológico.",
    restricoes_copy:
      "Na copy para pacientes finais: nunca prometer resultado garantido, cura ou percentual de sucesso. Seguir CFO e CFM.",
    perfil: DEFAULT_OPERADOR_PROFILE,
  },
} as const;

export function useWorkspaceBootstrap(
  session: Session | null,
  workspace: Workspace | null,
  setWorkspace: (ws: Workspace) => void,
) {
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const uid = session?.user?.id ?? null;

  useEffect(() => {
    if (!uid || workspace || runningRef.current) return;

    runningRef.current = true;
    let cancelled = false;

    async function run() {
      setBootstrapping(true);
      setError(null);

      try {
        const { data: userData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !userData.user) {
          throw new Error("Sessão inválida — faça login novamente");
        }

        const verifiedUid = userData.user.id;

        // Repair: owner do workspace sem row em workspace_members (RLS quebrava method_profiles)
        const { data: ownedWs } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", verifiedUid);

        for (const ws of ownedWs ?? []) {
          const { data: memberRow } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("workspace_id", ws.id)
            .eq("user_id", verifiedUid)
            .maybeSingle();

          if (!memberRow) {
            await supabase.from("workspace_members").insert({
              workspace_id: ws.id,
              user_id: verifiedUid,
              role: "owner",
            });
          }
        }

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

        // Recupera workspace órfão (criado numa tentativa anterior sem membership)
        const { data: owned, error: ownedErr } = await supabase
          .from("workspaces")
          .select("*")
          .eq("owner_id", verifiedUid)
          .order("created_at", { ascending: true })
          .limit(1);

        if (ownedErr) throw ownedErr;

        if (owned && owned.length > 0) {
          const existing = owned[0];
          const { error: memberInsertErr } = await supabase
            .from("workspace_members")
            .insert({ workspace_id: existing.id, user_id: verifiedUid, role: "owner" });
          if (memberInsertErr) throw memberInsertErr;

          if (!cancelled) setWorkspace(existing);
          return;
        }

        const { data: newWs, error: wsErr } = await supabase
          .from("workspaces")
          .insert({ name: HERA_DG_NAME, owner_id: verifiedUid })
          .select()
          .single();

        if (wsErr) {
          throw new Error(`Erro ao criar workspace: ${wsErr.message} (${wsErr.code})`);
        }
        if (!newWs) throw new Error("Workspace não retornado após insert");

        const { error: memberInsertErr } = await supabase
          .from("workspace_members")
          .insert({ workspace_id: newWs.id, user_id: verifiedUid, role: "owner" });
        if (memberInsertErr) throw memberInsertErr;

        const { error: profileErr } = await supabase.from("method_profiles").insert({
          workspace_id: newWs.id,
          nicho: DEFAULT_METHOD_PROFILE.nicho,
          posicionamento: DEFAULT_METHOD_PROFILE.posicionamento,
          extensoes: DEFAULT_METHOD_PROFILE.extensoes,
        });
        if (profileErr) throw new Error(`Erro ao criar perfil Hera DG: ${profileErr.message}`);

        if (!cancelled) setWorkspace(newWs);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao inicializar workspace");
        }
      } finally {
        runningRef.current = false;
        setBootstrapping(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
      runningRef.current = false;
    };
  }, [uid, workspace, setWorkspace]);

  return { bootstrapping, bootstrapError: error };
}
