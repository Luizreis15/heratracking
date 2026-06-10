import { useState, useEffect, useCallback, useRef } from "react";
import { NavLink, Outlet, useOutletContext, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Download, ChevronDown, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MercadoIcpSection } from "@/components/blueprint/MercadoIcpSection";
import { OfertaEscadaSection } from "@/components/blueprint/OfertaEscadaSection";
import { ComercialSection } from "@/components/blueprint/ComercialSection";
import { toastError, toastSuccess } from "@/lib/toast";
import { PosicionamentoSection } from "@/components/blueprint/PosicionamentoSection";
import { TrafegoFunilSection } from "@/components/blueprint/TrafegoFunilSection";
import { ChecklistSection } from "@/components/blueprint/ChecklistSection";
import { HipotesesSection } from "@/components/blueprint/HipotesesSection";
import { blueprintToMarkdown, downloadMarkdown } from "@/lib/blueprint-export";
import type { Json } from "@/types/index";
import type { OperationContext } from "./operation-context";

export type SectionDef = {
  key: string;
  label: string;
  render: (data: Json, operationId: string) => React.ReactNode;
};

export const SECTION_DEFS: SectionDef[] = [
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

export type RefineHandlerOpts = {
  focusField?: string;
};

export type BlueprintLayoutContext = OperationContext & {
  makeRefineHandler: (
    sectionKey: string,
    opts?: RefineHandlerOpts,
  ) => (instruction: string) => Promise<void>;
  isAnyRefining: boolean;
  refiningSection: string | null;
  refiningFocus: string | null;
  refineErrored: boolean;
  spinGuide: Json | null;
  filledSections: SectionDef[];
};

export function BlueprintLayout() {
  const ctx = useOutletContext<OperationContext>();
  const { operation, sections, operationId, blueprint } = ctx;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { sectionKey } = useParams<{ sectionKey?: string }>();

  const [refiningSection, setRefiningSection] = useState<string | null>(null);
  const [refiningFocus, setRefiningFocus] = useState<string | null>(null);
  const prevStatusRef = useRef(operation.status);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const spinGuide = blueprint?.spin_guide ?? null;
  const isAnyRefining = operation.status === "queued" || operation.status === "running";
  // Derivado diretamente do status da operação — sem estado local para evitar race condition com Realtime
  const refineErrored = operation.status === "error" && operation.job_mode === "refine_section";
  const filledSections = SECTION_DEFS.filter((s) => sections[s.key] != null);
  const firstKey = filledSections[0]?.key;

  // Redirect to first section when landing on /blueprint with no section
  useEffect(() => {
    if (!sectionKey && firstKey) {
      navigate(`/operations/${operationId}/blueprint/${firstKey}`, { replace: true });
    }
  }, [sectionKey, firstKey, operationId, navigate]);

  // Limpa refiningSection e recarrega blueprint quando o job termina
  useEffect(() => {
    const wasRefining = refiningSection !== null;
    const statusChanged = prevStatusRef.current !== operation.status;
    prevStatusRef.current = operation.status;

    if (!wasRefining || !statusChanged) return;

    if (operation.status === "done") {
      const FOCUS_LABELS: Record<string, string> = {
        funil_comercial: "Funil Comercial",
        sdr: "SDR",
        closer: "Closer",
        carta_vendas: "Carta de Vendas",
        pitch_stacking: "Pitch de Fechamento",
      };
      const label =
        (refiningFocus && FOCUS_LABELS[refiningFocus]) ??
        SECTION_DEFS.find((s) => s.key === refiningSection)?.label ??
        (refiningSection === "spin" ? "SPIN Selling" : refiningSection);
      toastSuccess(`"${label}" atualizado com sucesso`);
      setRefiningSection(null);
      setRefiningFocus(null);
      void queryClient.invalidateQueries({ queryKey: ["blueprint", operationId] });
      void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
    } else if (operation.status === "error") {
      toastError(operation.error ?? "Refinamento falhou — veja logs do worker");
      setRefiningSection(null);
      setRefiningFocus(null);
    }
  }, [operation.status, operation.error, refiningSection, refiningFocus, operationId, queryClient]);

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

  const makeRefineHandler = useCallback(
    (key: string, opts?: RefineHandlerOpts) => async (instruction: string) => {
      setRefiningSection(key);
      setRefiningFocus(opts?.focusField ?? null);
      const refineParams: Record<string, string> = {
        section_key: key,
        instruction,
      };
      if (opts?.focusField) refineParams.focus_field = opts.focusField;

      const { error } = await supabase
        .from("operations")
        .update({
          job_mode: "refine_section",
          status: "queued",
          refine_params: refineParams,
          error: null,
          finished_at: null,
        })
        .eq("id", operationId);
      if (error) {
        setRefiningSection(null);
        setRefiningFocus(null);
        throw new Error(error.message);
      }
      void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
    },
    [operationId, queryClient],
  );

  const handlePdfExport = useCallback(() => {
    setExportOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }, []);

  const handleMdExport = useCallback(() => {
    setExportOpen(false);
    const md = blueprintToMarkdown(
      sections as Record<string, unknown>,
      operation.nicho,
      operation.posicionamento,
      spinGuide,
    );
    downloadMarkdown(md, operation.nicho);
  }, [sections, operation.nicho, operation.posicionamento, spinGuide]);

  if (filledSections.length === 0) {
    return (
      <div className="hera-card p-12 text-center space-y-3 max-w-lg mx-auto">
        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
        <h3 className="text-lg font-semibold text-foreground">Blueprint ainda não disponível</h3>
        <p className="text-sm text-muted-foreground">
          {operation.status === "running" || operation.status === "queued"
            ? "As seções aparecem conforme o worker conclui cada fase."
            : "Nenhuma seção foi gravada para esta operação."}
        </p>
      </div>
    );
  }

  const blueprintCtx: BlueprintLayoutContext = {
    ...ctx,
    makeRefineHandler,
    isAnyRefining,
    refiningSection,
    refiningFocus,
    refineErrored,
    spinGuide,
    filledSections,
  };

  return (
    <div className="hera-page print:max-w-none">
      {/* Header */}
      <div className="hera-cockpit-hero p-6 lg:p-8 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <p className="hera-label mb-1.5 flex items-center gap-1.5">
            <span className="inline-block h-1 w-4 rounded-full bg-hera-gold/70" />
            Entregável
          </p>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">
            Blueprint Operacional
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            <span className="hera-mono font-semibold text-foreground">
              {filledSections.length}/{SECTION_DEFS.length}
            </span>{" "}
            seções •{" "}
            {isAnyRefining ? (
              <span className="text-hera-cyan">Refinamento em processamento...</span>
            ) : (
              <span className="text-primary/80">Selecione uma seção para ver e ajustar com IA</span>
            )}
          </p>
        </div>

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

      <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-start print:block">
        {/* Section nav */}
        <nav className="hidden lg:flex flex-col sticky top-6 print:hidden">
          <p className="hera-label px-3 mb-3">Seções</p>
          {SECTION_DEFS.map((def, i) => {
            const filled = sections[def.key] != null;
            return (
              <NavLink
                key={def.key}
                to={`/operations/${operationId}/blueprint/${def.key}`}
                className={({ isActive }) =>
                  [
                    "hera-section-nav-item flex items-center gap-2 group",
                    !filled && "opacity-35 pointer-events-none",
                    filled && isActive
                      ? "hera-section-nav-item--active"
                      : "hera-section-nav-item--idle",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                <span className="hera-mono text-[11px] w-5 shrink-0 opacity-50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-sm">{def.label}</span>
                {filled && (
                  <span className="ml-auto h-1 w-1 rounded-full bg-hera-done/60 shrink-0 opacity-0 group-[.hera-section-nav-item--active]:opacity-100" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Active section outlet */}
        <div className="min-w-0">
          <Outlet context={blueprintCtx} />
        </div>
      </div>
    </div>
  );
}
