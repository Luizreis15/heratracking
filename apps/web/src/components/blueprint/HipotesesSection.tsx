import { useState, useEffect, useCallback } from "react";
import { FlaskConical } from "lucide-react";
import { asStrings } from "@/lib/blueprint-types";
import type { Json } from "@/types/index";
import { BlueprintCockpit } from "./cockpit/BlueprintCockpit";
import { BlueprintModuleHeader } from "./cockpit/BlueprintModuleHeader";
import type { BlueprintSectionRefineProps } from "./cockpit/types";

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
    /* noop */
  }
}

const STATUS_CFG: Record<HipStatus, { label: string; border: string; bg: string; text: string }> = {
  pendente: { label: "Pendente", border: "border-border", bg: "", text: "text-muted-foreground" },
  validado: { label: "Validado", border: "border-hera-done/40", bg: "bg-hera-done/5", text: "text-hera-done" },
  refutado: { label: "Refutado", border: "border-destructive/35", bg: "bg-destructive/5", text: "text-destructive" },
};

const CYCLE: HipStatus[] = ["pendente", "validado", "refutado"];

function extractItems(data: Json): string[] {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.hipoteses)) return asStrings(obj.hipoteses);
  }
  return asStrings(data as unknown);
}

type Props = {
  data: Json;
  operationId: string;
} & BlueprintSectionRefineProps;

export function HipotesesSection({
  data,
  operationId,
  onRefineModule,
  refiningModule = null,
  isRefining = false,
}: Props) {
  const items = extractItems(data);
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
      <p className="text-sm text-muted-foreground text-center py-8">Hipóteses não disponíveis.</p>
    );
  }

  const counts = {
    pendente: items.filter((_, i) => (statuses[i] ?? "pendente") === "pendente").length,
    validado: items.filter((_, i) => statuses[i] === "validado").length,
    refutado: items.filter((_, i) => statuses[i] === "refutado").length,
  };

  const refining = isRefining && refiningModule === "hipoteses";

  return (
    <BlueprintCockpit
      title="Cockpit Hipóteses"
      subtitle="Valide ou refute conforme testa no mercado"
      stats={[
        { label: "Total", value: items.length },
        { label: "Pendentes", value: counts.pendente },
        { label: "Validadas", value: counts.validado },
        { label: "Refutadas", value: counts.refutado },
        { label: "Taxa", value: items.length ? `${Math.round((counts.validado / items.length) * 100)}%` : "0%" },
      ]}
      modules={[{ id: "hip" as const, label: "Hipóteses", icon: FlaskConical, refining }]}
      activeModule="hip"
      onSelectModule={() => {}}
    >
      <BlueprintModuleHeader
        icon={FlaskConical}
        title="Hipóteses a Validar"
        subtitle="Clique para alternar: pendente → validado → refutado"
        refinePlaceholder="Ex.: hipóteses sobre ticket médio e ciclo de venda em indústria"
        onRefine={onRefineModule ? (i) => onRefineModule("hipoteses", i) : undefined}
        isRefining={refining}
        disabled={isRefining && !refining}
      >
        <div className="space-y-2">
          {items.map((hip, i) => {
            const status: HipStatus = statuses[i] ?? "pendente";
            const cfg = STATUS_CFG[status];
            return (
              <button
                key={i}
                type="button"
                onClick={() => cycleStatus(i)}
                className={[
                  "w-full flex gap-3 items-start text-left rounded-lg border px-4 py-3 min-h-[64px]",
                  cfg.border,
                  cfg.bg,
                ].join(" ")}
              >
                <span className={`text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text}`}>
                  {cfg.label}
                </span>
                <p className="text-sm text-foreground leading-relaxed flex-1">{hip}</p>
              </button>
            );
          })}
        </div>
      </BlueprintModuleHeader>
    </BlueprintCockpit>
  );
}
