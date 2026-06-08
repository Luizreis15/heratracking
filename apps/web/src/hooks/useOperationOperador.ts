import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  parseOperadorFromOperation,
  type OperadorProfile,
} from "@/lib/operador-profile";
import { supabase } from "@/lib/supabase";
import type { Operation } from "@/types/index";

export function useOperationOperador(
  operation: Operation | undefined,
  empresaFallback = "Minha empresa",
) {
  const queryClient = useQueryClient();

  const operador = useMemo(
    () => parseOperadorFromOperation(operation, empresaFallback),
    [operation?.id, operation?.operador_perfil, empresaFallback],
  );

  const saveMutation = useMutation({
    mutationFn: async (perfil: OperadorProfile) => {
      if (!operation?.id) throw new Error("Operação não definida");

      const { data, error } = await supabase
        .from("operations")
        .update({ operador_perfil: perfil })
        .eq("id", operation.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          "Sem permissão para salvar o perfil da empresa nesta operação.",
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operation", operation?.id] });
    },
  });

  return {
    operador,
    saveOperador: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}
