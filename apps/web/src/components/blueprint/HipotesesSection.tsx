import { useState, useEffect, useCallback } from "react";
import { asStrings } from "@/lib/blueprint-types";
import type { Json } from "@/types/index";

type HipStatus = "pendente" | "validado" | "refutado";

function storageKey(operationId: string) {
  return `hera-hipoteses-${operationId}`;
}

function loadStatuses(operationId: string): Record<number, HipStatus> {
  try {
    const raw = localStorage.getItem(storageKey(operationId));
    return raw ? (JSON.parse(raw) as Record<number, HipStatus>) : {};
  } catch {
    return {};
  }
}

function saveStatuses(operationId: string, statuses: Record<number, HipStatus>) {
  try {
    localStorage.setItem(storageKey(operationId), JSON.stringify(statuses));
  } catch {
    // sem localStorage
  }
}

const STATUS_CONFIG: Record<
  HipStatus,
  { label: string; border: string; bg: string; text: string; dot: string }
> = {
  pendente: {
    label: "Pendente",
    border: "border-border",
    bg: "bg-transparent",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  validado: {
    label: "Validado ✓",
    border: "border-hera-done/40",
    bg: "bg-hera-done/5",
    text: "text-hera-done",
    dot: "bg-hera-done",
  },
  refutado: {
    label: "Refutado ✕",
    border: "border-destructive/35",
    bg: "bg-destructive/5",
    text: "text-destructive",
    dot: "bg-destructive",
  },
};

const CYCLE: HipStatus[] = ["pendente", "validado", "refutado"];

type Props = {
  data: Json;
  operationId: string;
};

export function HipotesesSection({ data, operationId }: Props) {
  const items = asStrings(data as unknown);

  const [statuses, setStatuses] = useState<Record<number, HipStatus>>(() =>
    loadStatuses(operationId),
  );

  useEffect(() => {
    saveStatuses(operationId, statuses);
  }, [statuses, operationId]);

  const cycleStatus = useCallback((i: number) => {
    setStatuses((prev) => {
      const current: HipStatus = prev[i] ?? "pendente";
      const nextIdx = (CYCLE.indexOf(current) + 1) % CYCLE.length;
      return { ...prev, [i]: CYCLE[nextIdx]! };
    });
  }, []);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground pt-2">
        Hipóteses não disponíveis nesta seção.
      </p>
    );
  }

  const counts = {
    pendente: items.filter((_, i) => (statuses[i] ?? "pendente") === "pendente").length,
    validado: items.filter((_, i) => statuses[i] === "validado").length,
    refutado: items.filter((_, i) => statuses[i] === "refutado").length,
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Resumo de status */}
      <div className="flex gap-4 flex-wrap">
        <Chip label="Pendentes" count={counts.pendente} color="text-muted-foreground" />
        <Chip label="Validadas" count={counts.validado} color="text-hera-done" />
        <Chip label="Refutadas" count={counts.refutado} color="text-destructive" />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Clique em cada hipótese para marcar como Validado ou Refutado conforme você testa.
      </p>

      {/* Lista */}
      <div className="space-y-2">
        {items.map((hip, i) => {
          const status: HipStatus = statuses[i] ?? "pendente";
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={i}
              type="button"
              onClick={() => cycleStatus(i)}
              className={[
                "w-full flex gap-3 items-start text-left rounded-lg border px-4 py-3 transition-colors",
                cfg.border,
                cfg.bg,
                "hover:opacity-90",
              ].join(" ")}
              title="Clique para mudar status"
            >
              <div className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">{hip}</p>
              </div>
              <span
                className={`text-[10px] font-semibold shrink-0 mt-0.5 px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text}`}
              >
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xl font-serif font-bold ${color}`}>{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
