import { useState, useEffect, useCallback } from "react";
import { CheckSquare2, Square } from "lucide-react";
import { asStrings } from "@/lib/blueprint-types";
import type { Json } from "@/types/index";

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
    // localStorage bloqueado
  }
}

function parseItem(item: unknown, i: number): { text: string; responsavel: string; prazo: string } {
  if (typeof item === "string") {
    // "[ ] Configurar pixel Meta — Dev — Semana 1"
    const clean = item.replace(/^\[[\sx]\]\s*/i, "").trim();
    const parts = clean.split(" — ").map((s) => s.trim());
    return {
      text: parts[0] ?? clean,
      responsavel: parts[1] ?? "",
      prazo: parts[2] ?? "",
    };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    return {
      text:
        (typeof obj.tarefa === "string" ? obj.tarefa : null) ??
        (typeof obj.texto === "string" ? obj.texto : null) ??
        (typeof obj.task === "string" ? obj.task : null) ??
        `Tarefa ${i + 1}`,
      responsavel: typeof obj.responsavel === "string" ? obj.responsavel : "",
      prazo: typeof obj.prazo === "string" ? obj.prazo : "",
    };
  }
  return { text: String(item), responsavel: "", prazo: "" };
}

type Props = {
  data: Json;
  operationId: string;
};

export function ChecklistSection({ data, operationId }: Props) {
  const items = asStrings(data as unknown).length > 0
    ? (data as unknown[])
    : Array.isArray(data) ? data : [];

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
      <p className="text-sm text-muted-foreground pt-2">Checklist não disponível nesta seção.</p>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Progresso */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-hera-done rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="hera-mono text-sm font-semibold text-foreground shrink-0">
          {doneCount}/{parsed.length}
        </span>
        <span className="hera-mono text-xs text-muted-foreground shrink-0">{pct}% concluído</span>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {parsed.map((item, i) => {
          const done = checked.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={[
                "w-full flex gap-3 items-start text-left rounded-lg border px-4 py-3 transition-colors",
                done
                  ? "border-hera-done/30 bg-hera-done/5"
                  : "border-border hover:border-border/80 hover:bg-accent/20",
              ].join(" ")}
            >
              <div className="shrink-0 mt-0.5">
                {done ? (
                  <CheckSquare2 className="h-4.5 w-4.5 text-hera-done" />
                ) : (
                  <Square className="h-4.5 w-4.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={[
                    "text-sm leading-relaxed",
                    done ? "text-muted-foreground line-through" : "text-foreground",
                  ].join(" ")}
                >
                  {item.text}
                </p>
                {(item.responsavel || item.prazo) && (
                  <div className="flex gap-3 mt-0.5">
                    {item.responsavel && (
                      <span className="text-[10px] text-muted-foreground">{item.responsavel}</span>
                    )}
                    {item.prazo && (
                      <span className="text-[10px] text-primary">{item.prazo}</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {doneCount === parsed.length && parsed.length > 0 && (
        <div className="hera-card px-4 py-3 border-hera-done/30 bg-hera-done/5 text-center">
          <p className="text-sm font-semibold text-hera-done">
            ✓ Checklist completo — operação pronta para escalar.
          </p>
        </div>
      )}
    </div>
  );
}
