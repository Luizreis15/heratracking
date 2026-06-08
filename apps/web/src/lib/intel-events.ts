import type { IntelEvent } from "@/types/index";

export const INTEL_EVENT_LABELS: Record<
  IntelEvent["event_type"],
  { label: string; color: string }
> = {
  post: { label: "Post", color: "bg-hera-running/15 text-hera-running border-hera-running/30" },
  landing: { label: "Landing", color: "bg-primary/15 text-primary border-primary/30" },
  criativo: { label: "Criativo", color: "bg-hera-alert/15 text-hera-alert border-hera-alert/30" },
  oferta: { label: "Oferta", color: "bg-hera-done/15 text-hera-done border-hera-done/30" },
  outro: { label: "Outro", color: "bg-muted/40 text-muted-foreground border-border" },
};

export function formatIntelDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function groupIntelByDay(events: IntelEvent[]): Map<string, IntelEvent[]> {
  const map = new Map<string, IntelEvent[]>();
  for (const e of events) {
    const day = new Date(e.detected_at).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    const list = map.get(day) ?? [];
    list.push(e);
    map.set(day, list);
  }
  return map;
}
