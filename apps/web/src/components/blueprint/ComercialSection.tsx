import { useState } from "react";
import {
  Check,
  ChevronRight,
  FileText,
  GitBranch,
  Layers,
  Phone,
  Users,
} from "lucide-react";
import type { Json } from "@/types/index";
import { asString, asStrings, type ComercialData } from "@/lib/blueprint-types";
import { RefineModuleButton } from "./comercial/RefineModuleButton";
import {
  cartaTagStyle,
  parseCartaVendas,
  parseObjectionItem,
  parseRoteiroStep,
} from "./comercial/parse-carta";

export type ComercialFocusField =
  | "funil_comercial"
  | "sdr"
  | "closer"
  | "carta_vendas"
  | "pitch_stacking";

type ComercialModule = "funil" | "sdr" | "closer" | "carta" | "pitch";

const MODULE_META: Record<
  ComercialModule,
  { label: string; field: ComercialFocusField; icon: typeof GitBranch; refinePlaceholder: string }
> = {
  funil: {
    label: "Funil",
    field: "funil_comercial",
    icon: GitBranch,
    refinePlaceholder: "Ex.: adicionar etapa de demo técnica entre qualificação e proposta",
  },
  sdr: {
    label: "SDR",
    field: "sdr",
    icon: Users,
    refinePlaceholder: "Ex.: critérios mais rígidos para ICP industrial acima de 200 funcionários",
  },
  closer: {
    label: "Closer",
    field: "closer",
    icon: Phone,
    refinePlaceholder: "Ex.: roteiro mais curto (30 min) com foco em ROI e compliance",
  },
  carta: {
    label: "Carta",
    field: "carta_vendas",
    icon: FileText,
    refinePlaceholder: "Ex.: reescrever carta em tom consultivo B2B, sem promessa de resultado",
  },
  pitch: {
    label: "Pitch",
    field: "pitch_stacking",
    icon: Layers,
    refinePlaceholder: "Ex.: stacking com 3 camadas — plataforma, suporte, integração ERP",
  },
};

function toStrings(val: unknown): string[] {
  if (Array.isArray(val)) return asStrings(val);
  if (typeof val === "string") return [val];
  return [];
}

type FunilStep = { etapa: string; detalhe: string };

function parseFunilStep(item: unknown, i: number): FunilStep {
  if (typeof item === "string") {
    const parts = item.split(" — ");
    return { etapa: parts[0]?.trim() ?? item, detalhe: parts.slice(1).join(" — ").trim() };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    return {
      etapa: asString(obj.etapa ?? obj.nome ?? `Etapa ${i + 1}`),
      detalhe: asString(obj.responsavel ?? obj.descricao ?? obj.sla ?? ""),
    };
  }
  return { etapa: `Etapa ${i + 1}`, detalhe: String(item) };
}

type ComercialSectionProps = {
  data: Json;
  onRefineModule?: (field: ComercialFocusField, instruction: string) => Promise<void>;
  refiningModule?: ComercialFocusField | null;
  isRefining?: boolean;
};

export function ComercialSection({
  data,
  onRefineModule,
  refiningModule = null,
  isRefining = false,
}: ComercialSectionProps) {
  const d = (data ?? {}) as ComercialData;
  const funilSteps = Array.isArray(d.funil_comercial)
    ? d.funil_comercial.map(parseFunilStep)
    : [];
  const sdrCriterios = toStrings(d.sdr?.criterios);
  const sdrScripts = toStrings(d.sdr?.scripts);
  const closerRoteiro = toStrings(d.closer?.roteiro_call);
  const closerPerguntas = toStrings(d.closer?.perguntas);
  const cartaRaw = d.carta_vendas ? asString(d.carta_vendas) : "";
  const pitchRaw = d.pitch_stacking ? asString(d.pitch_stacking) : "";
  const cartaParsed = parseCartaVendas(cartaRaw);

  const modules: ComercialModule[] = [];
  if (funilSteps.length) modules.push("funil");
  if (sdrCriterios.length || sdrScripts.length) modules.push("sdr");
  if (closerRoteiro.length || closerPerguntas.length) modules.push("closer");
  if (cartaRaw) modules.push("carta");
  if (pitchRaw) modules.push("pitch");

  const [activeModule, setActiveModule] = useState<ComercialModule | null>(null);
  const effectiveModule =
    activeModule && modules.includes(activeModule) ? activeModule : (modules[0] ?? "funil");
  const [selectedFunil, setSelectedFunil] = useState<number | null>(null);
  const [expandedCarta, setExpandedCarta] = useState<number | null>(0);
  const [expandedObjection, setExpandedObjection] = useState<number | null>(null);
  const [expandedRoteiro, setExpandedRoteiro] = useState<number | null>(0);

  const stats = [
    { label: "Etapas funil", value: funilSteps.length },
    { label: "Critérios SDR", value: sdrCriterios.length },
    { label: "Roteiro call", value: closerRoteiro.length },
    { label: "Blocos carta", value: cartaParsed.blocks.length },
    { label: "Objeções", value: closerPerguntas.length },
  ];

  function moduleRefining(mod: ComercialModule) {
    return isRefining && refiningModule === MODULE_META[mod].field;
  }

  function ModuleShell({
    mod,
    title,
    subtitle,
    children,
  }: {
    mod: ComercialModule;
    title: string;
    subtitle: string;
    children: React.ReactNode;
  }) {
    const meta = MODULE_META[mod];
    const Icon = meta.icon;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>
          {onRefineModule && (
            <RefineModuleButton
              label="Ajustar"
              moduleName={title}
              placeholder={meta.refinePlaceholder}
              onRefine={(instr) => onRefineModule(meta.field, instr)}
              isRefining={moduleRefining(mod)}
              disabled={isRefining && !moduleRefining(mod)}
            />
          )}
        </div>
        {children}
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum módulo comercial gerado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-6 -mx-2">
      {/* Cockpit strip */}
      <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
        <div>
          <p className="hera-label mb-1">Cockpit Comercial</p>
          <p className="text-sm text-muted-foreground">
            Selecione um módulo para operar. Cada bloco tem ajuste independente com IA.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="hera-stat-tile text-center py-3 px-2">
              <p className="hera-mono text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {modules.map((mod) => {
            const meta = MODULE_META[mod];
            const Icon = meta.icon;
            const active = effectiveModule === mod;
            return (
              <button
                key={mod}
                type="button"
                onClick={() => setActiveModule(mod)}
                className={[
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  active
                    ? "border-primary/60 bg-primary/15 text-foreground shadow-[0_0_12px_rgba(191,155,77,0.12)]"
                    : "border-border bg-background/50 text-muted-foreground hover:border-primary/30",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {meta.label}
                {moduleRefining(mod) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-hera-cyan animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active module panel */}
      <div className="hera-card p-5 lg:p-6 min-h-[320px]">
        {effectiveModule === "funil" && funilSteps.length > 0 && (
          <ModuleShell
            mod="funil"
            title="Funil Comercial"
            subtitle="Clique em uma etapa para ver detalhe e responsável"
          >
            <div className="overflow-x-auto pb-1">
              <div className="flex items-stretch gap-0 min-w-max">
                {funilSteps.map((step, i) => {
                  const active = selectedFunil === i;
                  return (
                    <div key={i} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedFunil(active ? null : i)}
                        className={[
                          "flex flex-col gap-2 px-4 py-4 rounded-xl border text-left transition-all w-[140px] h-[120px]",
                          active
                            ? "border-primary/60 bg-primary/10"
                            : "border-border hover:border-primary/30 bg-background/40",
                        ].join(" ")}
                      >
                        <span className="hera-mono text-[10px] text-primary font-bold">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-3 flex-1">
                          {step.etapa}
                        </p>
                        {step.detalhe && (
                          <span className="text-[9px] text-muted-foreground uppercase truncate w-full">
                            {step.detalhe}
                          </span>
                        )}
                      </button>
                      {i < funilSteps.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/25 shrink-0 mx-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {selectedFunil !== null && funilSteps[selectedFunil] && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="hera-mono text-[10px] text-primary uppercase mb-1">
                  Etapa {selectedFunil + 1}
                </p>
                <p className="font-semibold text-foreground">{funilSteps[selectedFunil].etapa}</p>
                {funilSteps[selectedFunil].detalhe && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {funilSteps[selectedFunil].detalhe}
                  </p>
                )}
              </div>
            )}
          </ModuleShell>
        )}

        {effectiveModule === "sdr" && (sdrCriterios.length > 0 || sdrScripts.length > 0) && (
          <ModuleShell
            mod="sdr"
            title="SDR — Qualificação"
            subtitle="Critérios de aceite e scripts de abordagem"
          >
            {sdrCriterios.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {sdrCriterios.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-3 min-h-[72px]"
                  >
                    <span className="h-5 w-5 rounded-full bg-hera-done/20 border border-hera-done/40 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-hera-done" />
                    </span>
                    <p className="text-sm text-foreground leading-snug">{c}</p>
                  </div>
                ))}
              </div>
            )}
            {sdrScripts.map((script, i) => (
              <div
                key={i}
                className="rounded-lg border border-border px-4 py-3 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto"
              >
                <p className="hera-mono text-[10px] text-muted-foreground mb-2">
                  Script {i + 1}
                </p>
                {script}
              </div>
            ))}
          </ModuleShell>
        )}

        {effectiveModule === "closer" && (closerRoteiro.length > 0 || closerPerguntas.length > 0) && (
          <ModuleShell
            mod="closer"
            title="Closer — Roteiro de Call"
            subtitle="Etapas da call e respostas a objeções"
          >
            {closerRoteiro.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                {closerRoteiro.map((etapa, i) => {
                  const parsed = parseRoteiroStep(etapa, i);
                  const open = expandedRoteiro === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setExpandedRoteiro(open ? null : i)}
                      className={[
                        "rounded-lg border text-left px-4 py-3 transition-all min-h-[88px]",
                        open ? "border-primary/50 bg-primary/5 sm:col-span-2" : "border-border hover:border-primary/30",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="hera-mono text-xs font-bold text-primary shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {parsed.title}
                            </p>
                            {parsed.duration && (
                              <span className="text-[10px] text-hera-cyan font-medium">
                                {parsed.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {open && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed text-left">
                          {parsed.body}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {closerPerguntas.length > 0 && (
              <>
                <p className="hera-label mb-3">Objeções &amp; Fechamento</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {closerPerguntas.map((q, i) => {
                    const obj = parseObjectionItem(q);
                    const open = expandedObjection === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setExpandedObjection(open ? null : i)}
                        className={[
                          "rounded-lg border text-left px-4 py-3 transition-all",
                          open ? "border-primary/50 bg-primary/5 sm:col-span-2" : "border-border hover:border-primary/30 min-h-[72px]",
                        ].join(" ")}
                      >
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                          {obj.title}
                        </p>
                        <p
                          className={[
                            "text-sm text-muted-foreground mt-2 italic leading-relaxed",
                            open ? "" : "line-clamp-2",
                          ].join(" ")}
                        >
                          &ldquo;{obj.script}&rdquo;
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </ModuleShell>
        )}

        {effectiveModule === "carta" && cartaRaw && (
          <ModuleShell
            mod="carta"
            title="Carta de Vendas"
            subtitle="Estrutura PAS + blocos — clique para expandir cada parte"
          >
            {cartaParsed.preamble && (
              <p className="text-xs text-muted-foreground mb-4 border-l-2 border-primary/30 pl-3">
                {cartaParsed.preamble}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cartaParsed.blocks.map((block, i) => {
                const style = cartaTagStyle(block.tag);
                const open = expandedCarta === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setExpandedCarta(open ? null : i)}
                    className={[
                      "rounded-xl border text-left p-4 transition-all",
                      style.border,
                      style.bg,
                      open ? "sm:col-span-2" : "min-h-[100px]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className={`hera-mono text-[10px] font-bold uppercase ${style.color}`}>
                          {block.tag}
                        </p>
                        <p className="text-xs text-muted-foreground">{block.label}</p>
                      </div>
                      <span className="hera-mono text-[10px] text-muted-foreground/50">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p
                      className={[
                        "text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap text-left",
                        open ? "" : "line-clamp-3",
                      ].join(" ")}
                    >
                      {block.content || "(conteúdo pendente — use Ajustar para gerar este bloco)"}
                    </p>
                  </button>
                );
              })}
            </div>
          </ModuleShell>
        )}

        {effectiveModule === "pitch" && pitchRaw && (
          <ModuleShell
            mod="pitch"
            title="Value Stacking — Pitch de Fechamento"
            subtitle="Empilhamento de valor no momento do fechamento"
          >
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {pitchRaw}
              </p>
            </div>
          </ModuleShell>
        )}
      </div>
    </div>
  );
}
