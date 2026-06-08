import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  EMPTY_METRICS,
  periodMonthFromDate,
  type MetricFields,
} from "@/lib/operation-metrics";
import type { OperationMetric } from "@/types/index";

export function useOperationMetrics(operationId: string | undefined) {
  const queryClient = useQueryClient();
  const currentPeriod = periodMonthFromDate();

  const query = useQuery<OperationMetric[]>({
    queryKey: ["operation_metrics", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_metrics")
        .select("*")
        .eq("operation_id", operationId!)
        .order("period_month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!operationId,
  });

  const currentMonth =
    query.data?.find((m) => m.period_month === currentPeriod) ?? null;

  const saveMutation = useMutation({
    mutationFn: async ({
      periodMonth,
      fields,
    }: {
      periodMonth: string;
      fields: MetricFields;
    }) => {
      const row = {
        operation_id: operationId!,
        period_month: periodMonth,
        leads_captados: fields.leads_captados,
        conteudos_criados: fields.conteudos_criados,
        conteudos_publicados: fields.conteudos_publicados,
        reunioes_realizadas: fields.reunioes_realizadas,
        agendamentos: fields.agendamentos,
        notas: fields.notas || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("operation_metrics").upsert(row, {
        onConflict: "operation_id,period_month",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operation_metrics", operationId] });
    },
  });

  const incrementMutation = useMutation({
    mutationFn: async ({
      field,
      delta = 1,
    }: {
      field: keyof Omit<MetricFields, "notas">;
      delta?: number;
    }) => {
      const existing = currentMonth;
      const base = existing
        ? {
            leads_captados: existing.leads_captados,
            conteudos_criados: existing.conteudos_criados,
            conteudos_publicados: existing.conteudos_publicados,
            reunioes_realizadas: existing.reunioes_realizadas,
            agendamentos: existing.agendamentos,
            notas: existing.notas ?? "",
          }
        : { ...EMPTY_METRICS };

      base[field] = Math.max(0, base[field] + delta);

      await saveMutation.mutateAsync({ periodMonth: currentPeriod, fields: base });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operation_metrics", operationId] });
    },
  });

  return {
    metrics: query.data ?? [],
    currentMonth,
    currentPeriod,
    isLoading: query.isLoading,
    isError: query.isError,
    saveMetrics: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    increment: incrementMutation.mutateAsync,
    isIncrementing: incrementMutation.isPending,
  };
}
