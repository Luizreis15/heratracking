import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const storageKey = (opId: string) => `intel_viewed_${opId}`;

function readLastViewed(operationId: string): string {
  return localStorage.getItem(storageKey(operationId)) ?? "1970-01-01T00:00:00Z";
}

export function useIntelBadge(operationId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: count = 0 } = useQuery<number>({
    queryKey: ["intel_badge", operationId],
    queryFn: async () => {
      const since = readLastViewed(operationId!);
      const { count: c } = await supabase
        .from("intel_events")
        .select("id", { count: "exact", head: true })
        .eq("operation_id", operationId!)
        .gt("detected_at", since);
      return c ?? 0;
    },
    enabled: !!operationId,
    staleTime: 60_000,
  });

  const markRead = useCallback(() => {
    if (!operationId) return;
    localStorage.setItem(storageKey(operationId), new Date().toISOString());
    void queryClient.invalidateQueries({ queryKey: ["intel_badge", operationId] });
  }, [operationId, queryClient]);

  return { count, markRead };
}
