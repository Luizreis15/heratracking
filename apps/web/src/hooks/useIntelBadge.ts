import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const storageKey = (opId: string) => `intel_viewed_${opId}`;

export function useIntelBadge(operationId: string | undefined) {
  const queryClient = useQueryClient();

  const [lastViewed, setLastViewed] = useState<string | null>(() =>
    operationId ? (localStorage.getItem(storageKey(operationId)) ?? null) : null,
  );

  const { data: count = 0 } = useQuery<number>({
    queryKey: ["intel_badge", operationId, lastViewed],
    queryFn: async () => {
      const since = lastViewed ?? "1970-01-01T00:00:00Z";
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
    const now = new Date().toISOString();
    localStorage.setItem(storageKey(operationId), now);
    setLastViewed(now);
    void queryClient.invalidateQueries({ queryKey: ["intel_badge", operationId] });
  }, [operationId, queryClient]);

  return { count, markRead };
}
