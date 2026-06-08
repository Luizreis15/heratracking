import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ChevronDown, FileText } from "lucide-react";
import { JsonTree } from "@/components/JsonTree";
import { BLUEPRINT_SECTIONS } from "@/lib/blueprint-sections";
import type { OperationContext } from "./operation-context";

export function BlueprintView() {
  const { operation, sections } = useOutletContext<OperationContext>();
  const filledCount = BLUEPRINT_SECTIONS.filter((s) => sections[s.key] != null).length;
  const [openKey, setOpenKey] = useState<string | null>(
    BLUEPRINT_SECTIONS.find((s) => sections[s.key] != null)?.key ?? null,
  );

  if (filledCount === 0) {
    return (
      <EmptyDeliverable
        title="Blueprint ainda não disponível"
        message={
          operation.status === "running" || operation.status === "queued"
            ? "As seções aparecem conforme o worker conclui cada fase."
            : "Nenhuma seção foi gravada para esta operação."
        }
      />
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <p className="hera-label mb-1">Entregável</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Blueprint Operacional Mestre
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filledCount} de {BLUEPRINT_SECTIONS.length} seções preenchidas
        </p>
      </div>

      <div className="space-y-2">
        {BLUEPRINT_SECTIONS.map((section, i) => {
          const content = sections[section.key];
          if (content == null) return null;
          const isOpen = openKey === section.key;
          return (
            <div key={section.key} className="hera-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : section.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
              >
                <span className="text-xs text-primary font-mono w-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">{section.label}</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  <JsonTree value={content} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyDeliverable({ title, message }: { title: string; message: string }) {
  return (
    <div className="hera-card p-12 text-center space-y-3 max-w-lg mx-auto">
      <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
      <h3 className="font-serif text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
