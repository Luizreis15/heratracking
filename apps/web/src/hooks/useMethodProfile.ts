import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  mergeOperadorIntoExtensoes,
  parseOperadorProfile,
  type OperadorProfile,
} from "@/lib/operador-profile";
import type { MethodProfile } from "@/types/index";

export function useMethodProfile(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery<MethodProfile | null>({
    queryKey: ["method_profile", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("method_profiles")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const operador = useMemo(
    () => parseOperadorProfile(query.data?.extensoes ?? {}),
    [query.data?.extensoes, query.data?.updated_at],
  );

  const saveMutation = useMutation({
    mutationFn: async (perfil: OperadorProfile) => {
      if (!workspaceId) throw new Error("Workspace não definido");

      const extensoes = mergeOperadorIntoExtensoes(query.data?.extensoes ?? {}, perfil);

      if (query.data?.id) {
        const { data, error } = await supabase
          .from("method_profiles")
          .update({ extensoes, updated_at: new Date().toISOString() })
          .eq("id", query.data.id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          throw new Error(
            "Sem permissão para editar o perfil da agência. Confirme que você é owner ou membro do workspace.",
          );
        }
        return;
      }

      const { data: inserted, error } = await supabase
        .from("method_profiles")
        .insert({
          workspace_id: workspaceId,
          nicho: "Clínicas implantodontistas (clientes B2B)",
          posicionamento: perfil.posicionamento ?? "Minha Agência",
          extensoes,
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!inserted) {
        throw new Error(
          "Não foi possível criar o perfil de método — verifique permissões do workspace.",
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["method_profile", workspaceId] });
    },
  });

  return {
    profile: query.data,
    operador,
    isLoading: query.isLoading,
    saveOperador: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}
