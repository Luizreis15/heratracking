import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { IntelEvent } from "@/types/index";

export function useIntelEvents(
  operationId: string | undefined,
  opts?: { polling?: boolean },
) {
  return useQuery<IntelEvent[]>({
    queryKey: ["intel_events", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intel_events")
        .select("*")
        .eq("operation_id", operationId!)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!operationId,
    refetchInterval: opts?.polling ? 4000 : false,
  });
}

export function countRecentIntel(events: IntelEvent[], days = 7): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return events.filter((e) => new Date(e.detected_at).getTime() >= cutoff).length;
}
