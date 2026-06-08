import { Loader2 } from "lucide-react";

const CONFIG: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  queued: {
    label: "Na fila",
    className: "bg-hera-alert/15 text-hera-alert border-hera-alert/30",
    dot: "bg-hera-alert",
  },
  running: {
    label: "Em curso",
    className: "bg-hera-running/15 text-hera-running border-hera-running/30",
    dot: "bg-hera-running",
  },
  done: {
    label: "Concluído",
    className: "bg-hera-done/15 text-hera-done border-hera-done/30",
    dot: "bg-hera-done",
  },
  error: {
    label: "Erro",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
  pending: {
    label: "Pendente",
    className: "bg-muted/40 text-muted-foreground border-border",
    dot: "bg-muted-foreground/30",
  },
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: string;
  size?: "sm" | "xs";
}) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-medium border rounded-full",
        size === "sm" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5",
        cfg.className,
      ].join(" ")}
    >
      {status === "running" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      )}
      {cfg.label}
    </span>
  );
}

export function PhaseProgressDots({
  doneCount,
  total = 6,
  currentIndex,
  isRunning,
}: {
  doneCount: number;
  total?: number;
  currentIndex?: number;
  isRunning?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < doneCount;
        const current = isRunning && currentIndex === i;
        return (
          <span
            key={i}
            className={[
              "h-1.5 w-1.5 rounded-full transition-colors",
              done ? "bg-hera-done" : current ? "bg-hera-running animate-pulse" : "bg-border",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
