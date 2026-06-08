import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ComparisonReport } from "@/types/index";

export function useComparisonReport(
  operationId: string | undefined,
  opts?: { polling?: boolean },
) {
  return useQuery<ComparisonReport | null>({
    queryKey: ["comparison_report", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comparison_reports")
        .select("*")
        .eq("operation_id", operationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!operationId,
    refetchInterval: opts?.polling ? 4000 : false,
  });
}
