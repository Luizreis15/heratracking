import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Download, ChevronDown, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionShell } from "@/components/blueprint/SectionShell";
import { MercadoIcpSection } from "@/components/blueprint/MercadoIcpSection";
import { OfertaEscadaSection } from "@/components/blueprint/OfertaEscadaSection";
import { ComercialSection } from "@/components/blueprint/ComercialSection";
import { PosicionamentoSection } from "@/components/blueprint/PosicionamentoSection";
import { TrafegoFunilSection } from "@/components/blueprint/TrafegoFunilSection";
import { ChecklistSection } from "@/components/blueprint/ChecklistSection";
import { HipotesesSection } from "@/components/blueprint/HipotesesSection";
import { blueprintToMarkdown, downloadMarkdown } from "@/lib/blueprint-export";
import type { Json } from "@/types/index";
import type { OperationContext } from "./operation-context";

type SectionDef = {
  key: string;
  label: string;
  render: (data: Json, operationId: string) => React.ReactNode;
};

const SECTION_DEFS: SectionDef[] = [
  {
    key: "mercado_icp",
    label: "Mercado + ICP",
    render: (data) => <MercadoIcpSection data={data} />,
  },
  {
    key: "oferta_escada",
    label: "Oferta / Escada de Valor",
    render: (data) => <OfertaEscadaSection data={data} />,
  },
  {
    key: "comercial",
    label: "Processo Comercial",
    render: (data) => <ComercialSection data={data} />,
  },
  {
    key: "posicionamento",
    label: "Posicionamento Digital",
    render: (data) => <PosicionamentoSection data={data} />,
  },
  {
    key: "trafego_funil",
    label: "Tráfego + Funil",
    render: (data) => <TrafegoFunilSection data={data} />,
  },
  {
    key: "checklist",
    label: "Checklist de Implementação",
    render: (data, opId) => <ChecklistSection data={data} operationId={opId} />,
  },
  {
    key: "hipoteses",
    label: "Hipóteses a Validar",
    render: (data, opId) => <HipotesesSection data={data} operationId={opId} />,
  },
];

export function BlueprintView() {
  const { operation, sections, operationId } = useOutletContext<OperationContext>();
  const queryClient = useQueryClient();

  const [refiningSection, setRefiningSection] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (operation.status === "done" && refiningSection !== null) {
      setRefiningSection(null);
      void queryClient.invalidateQueries({ queryKey: ["blueprint", operationId] });
    }
  }, [operation.status, refiningSection, operationId, queryClient]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    if (!exportOpen) return;
    function handle(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [exportOpen]);

  const handlePdfExport = useCallback(() => {
    setExportOpen(false);
    setIsPrinting(true);
    // Let React render with forceOpen before triggering print
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setIsPrinting(false);
      });
    });
  }, []);

  const handleMdExport = useCallback(() => {
    setExportOpen(false);
    const md = blueprintToMarkdown(
      sections as Record<string, unknown>,
      operation.nicho,
      operation.posicionamento,
    );
    downloadMarkdown(md, operation.nicho);
  }, [sections, operation.nicho, operation.posicionamento]);

  const makeRefineHandler = useCallback(
    (sectionKey: string) => async (instruction: string) => {
      setRefiningSection(sectionKey);
      const { error } = await supabase.from("operations").update({
        job_mode: "refine_section",
        status: "queued",
        refine_params: { section_key: sectionKey, instruction },
        error: null,
        finished_at: null,
      }).eq("id", operationId);

      if (error) {
        setRefiningSection(null);
        throw new Error(error.message);
      }

      // Trigger polling — OperationLayout polls when status is queued/running
      void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
    },
    [operationId, queryClient],
  );

  const filledSections = SECTION_DEFS.filter((s) => sections[s.key] != null);

  if (filledSections.length === 0) {
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

  const isAnyRefining =
    operation.status === "queued" || operation.status === "running";

  return (
    <div className="space-y-6 max-w-4xl print:max-w-none">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <p className="hera-label mb-1">Entregável</p>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Blueprint Operacional Mestre
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filledSections.length} de {SECTION_DEFS.length} seções •{" "}
            {isAnyRefining ? (
              <span className="text-hera-running">Refinamento em processamento...</span>
            ) : (
              <span className="text-primary">
                Clique em Ajustar em qualquer seção para refinar com IA
              </span>
            )}
          </p>
        </div>

        {/* Export dropdown */}
        <div className="relative shrink-0" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            className="hera-btn-ghost border border-border"
          >
            <Download className="h-4 w-4" />
            Exportar
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 hera-card border border-border rounded-lg shadow-lg z-10 py-1">
              <button
                type="button"
                onClick={handlePdfExport}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Printer className="h-4 w-4 text-muted-foreground" />
                Exportar PDF
              </button>
              <button
                type="button"
                onClick={handleMdExport}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Exportar Markdown
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-3xl font-bold text-black">Blueprint Operacional Mestre</h1>
        <p className="text-gray-600 mt-1"><strong>Nicho:</strong> {operation.nicho}</p>
        <p className="text-gray-600"><strong>Posicionamento:</strong> {operation.posicionamento}</p>
        <p className="text-gray-500 text-sm mt-1">
          Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <hr className="mt-4 border-gray-300" />
      </div>

      {/* Seções */}
      <div className="space-y-3">
        {SECTION_DEFS.map((def, i) => {
          const data = sections[def.key] as Json | undefined;
          if (data == null) return null;

          const isFirst = i === 0;
          const isSectionRefining = refiningSection === def.key && isAnyRefining;

          return (
            <SectionShell
              key={def.key}
              num={i + 1}
              label={def.label}
              defaultOpen={isFirst}
              forceOpen={isPrinting}
              onRefine={makeRefineHandler(def.key)}
              isRefining={isSectionRefining}
            >
              {def.render(data, operationId)}
            </SectionShell>
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
