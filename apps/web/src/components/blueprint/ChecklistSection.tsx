import { useState, useEffect, useCallback } from "react";
import { CheckSquare2, ListChecks, Square } from "lucide-react";
import { asStrings } from "@/lib/blueprint-types";
import type { Json } from "@/types/index";
import { BlueprintCockpit } from "./cockpit/BlueprintCockpit";
import { BlueprintModuleHeader } from "./cockpit/BlueprintModuleHeader";
import type { BlueprintSectionRefineProps } from "./cockpit/types";

function storageKey(operationId: string) {
  return `hera-checklist-${operationId}`;
}

function loadChecked(operationId: string): Set<number> {
  try {
    const raw = localStorage.getItem(storageKey(operationId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveChecked(operationId: string, checked: Set<number>) {
  try {
    localStorage.setItem(storageKey(operationId), JSON.stringify([...checked]));
  } catch {
    /* noop */
  }
}

function parseItem(item: unknown, i: number) {
  if (typeof item === "string") {
    const clean = item.replace(/^\[[\sx]\]\s*/i, "").trim();
    const parts = clean.split(" — ").map((s) => s.trim());
    return { text: parts[0] ?? clean, responsavel: parts[1] ?? "", prazo: parts[2] ?? "" };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    return {
      text:
        (typeof obj.tarefa === "string" ? obj.tarefa : null) ??
        (typeof obj.texto === "string" ? obj.texto : null) ??
        `Tarefa ${i + 1}`,
      responsavel: typeof obj.responsavel === "string" ? obj.responsavel : "",
      prazo: typeof obj.prazo === "string" ? obj.prazo : "",
    };
  }
  return { text: String(item), responsavel: "", prazo: "" };
}

function extractItems(data: Json): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.checklist)) return obj.checklist;
  }
  const strings = asStrings(data as unknown);
  return strings.length ? strings : [];
}

type Props = {
  data: Json;
  operationId: string;
} & BlueprintSectionRefineProps;

export function ChecklistSection({
  data,
  operationId,
  onRefineModule,
  refiningModule = null,
  isRefining = false,
}: Props) {
  const items = extractItems(data);
  const parsed = items.map((item, i) => parseItem(item, i));
  const [checked, setChecked] = useState<Set<number>>(() => loadChecked(operationId));

  useEffect(() => {
    saveChecked(operationId, checked);
  }, [checked, operationId]);

  const toggle = useCallback((i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const doneCount = parsed.filter((_, i) => checked.has(i)).length;
  const pct = parsed.length > 0 ? Math.round((doneCount / parsed.length) * 100) : 0;

  if (parsed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">Checklist não disponível.</p>
    );
  }

  const refining = isRefining && refiningModule === "checklist";

  return (
    <BlueprintCockpit
      title="Cockpit Implementação"
      subtitle="Marque tarefas concluídas — progresso salvo localmente"
      stats={[
        { label: "Total", value: parsed.length },
        { label: "Feitas", value: doneCount },
        { label: "Pendentes", value: parsed.length - doneCount },
        { label: "Progresso", value: `${pct}%` },
        { label: "Status", value: pct === 100 ? "✓" : "…" },
      ]}
      modules={[{ id: "tasks" as const, label: "Tarefas", icon: ListChecks, refining }]}
      activeModule="tasks"
      onSelectModule={() => {}}
    >
      <BlueprintModuleHeader
        icon={ListChecks}
        title="Checklist de Implementação"
        subtitle="Clique para marcar como concluída"
        refinePlaceholder="Ex.: adicionar tarefas de integração ERP e treinamento do time"
        onRefine={onRefineModule ? (i) => onRefineModule("checklist", i) : undefined}
        isRefining={refining}
        disabled={isRefining && !refining}
      >
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-hera-done rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="space-y-2">
          {parsed.map((item, i) => {
            const done = checked.has(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                className={[
                  "w-full flex gap-3 items-start text-left rounded-lg border px-4 py-3 min-h-[64px] transition-colors",
                  done ? "border-hera-done/30 bg-hera-done/5" : "border-border hover:bg-accent/20",
                ].join(" ")}
              >
                {done ? (
                  <CheckSquare2 className="h-4 w-4 text-hera-done shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={["text-sm leading-relaxed", done && "line-through text-muted-foreground"].filter(Boolean).join(" ")}>
                    {item.text}
                  </p>
                  {(item.responsavel || item.prazo) && (
                    <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                      {item.responsavel && <span>{item.responsavel}</span>}
                      {item.prazo && <span className="text-primary">{item.prazo}</span>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {pct === 100 && (
          <div className="mt-4 rounded-lg border border-hera-done/30 bg-hera-done/5 px-4 py-3 text-center text-sm text-hera-done font-semibold">
            Checklist completo — pronto para escalar.
          </div>
        )}
      </BlueprintModuleHeader>
    </BlueprintCockpit>
  );
}
