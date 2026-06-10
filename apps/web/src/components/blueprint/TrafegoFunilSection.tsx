import { useState } from "react";
import { BarChart3, Copy, Check, GitBranch, Megaphone, Route } from "lucide-react";
import type { Json } from "@/types/index";
import { asString, asStrings, type AngloCriativo, type TrafegoFunilData } from "@/lib/blueprint-types";
import { BlueprintCockpit } from "./cockpit/BlueprintCockpit";
import { BlueprintModuleHeader } from "./cockpit/BlueprintModuleHeader";
import type { BlueprintSectionRefineProps } from "./cockpit/types";

type Module = "mapa" | "angulos" | "jornada" | "campanhas" | "mensuracao";

const REFINE: Record<Module, { field: string; placeholder: string }> = {
  mapa: { field: "mapa_funil", placeholder: "Ex.: funil TOFU/MOFU/BOFU para demo agendada" },
  angulos: { field: "angulos_criativos", placeholder: "Ex.: 6 ângulos com gancho de compliance e urgência regulatória" },
  jornada: { field: "jornada_cliente", placeholder: "Ex.: jornada com vazamentos e SLA por etapa" },
  campanhas: { field: "campanhas", placeholder: "Ex.: estrutura Meta + LinkedIn para ICP industrial" },
  mensuracao: { field: "mensuracao", placeholder: "Ex.: KPIs CPL, demo rate, CAC payback" },
};

function parseAngulo(item: unknown, i: number): AngloCriativo & { index: number } {
  if (typeof item === "string") {
    return { index: i, gancho: item };
  }
  if (item && typeof item === "object") return { index: i, ...(item as AngloCriativo) };
  return { index: i, gancho: String(item) };
}

function parseStep(item: unknown, i: number) {
  if (typeof item === "string") {
    const parts = item.split("|").map((s) => s.trim());
    return { etapa: parts[0] ?? `Etapa ${i + 1}`, peca: parts[1] ?? "", metrica: parts[2] ?? "" };
  }
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    return {
      etapa: asString(obj.etapa ?? obj.nome ?? `Etapa ${i + 1}`),
      peca: asString(obj.peca ?? obj.descricao ?? ""),
      metrica: asString(obj.metrica ?? obj.kpi ?? ""),
    };
  }
  return { etapa: `Etapa ${i + 1}`, peca: String(item), metrica: "" };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })}
      className="p-1 rounded text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-hera-done" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function TrafegoFunilSection({
  data,
  onRefineModule,
  refiningModule = null,
  isRefining = false,
}: { data: Json } & BlueprintSectionRefineProps) {
  const d = (data ?? {}) as TrafegoFunilData;
  const mapaFunil = Array.isArray(d.mapa_funil) ? d.mapa_funil : [];
  const jornada = Array.isArray(d.jornada_cliente) ? d.jornada_cliente : [];
  const campanhas = Array.isArray(d.campanhas) ? d.campanhas : [];
  const angulos = Array.isArray(d.angulos_criativos) ? d.angulos_criativos : [];
  const mens = d.mensuracao ?? {};
  const kpis = asStrings(mens.kpis);

  const modules: Module[] = [];
  if (mapaFunil.length) modules.push("mapa");
  if (angulos.length) modules.push("angulos");
  if (jornada.length) modules.push("jornada");
  if (campanhas.length) modules.push("campanhas");
  if (kpis.length || mens.tracking || mens.ritual) modules.push("mensuracao");
  if (!modules.length) modules.push("mapa");

  const [active, setActive] = useState<Module | null>(null);
  const [expandedAngulo, setExpandedAngulo] = useState<number | null>(0);
  const effective = active && modules.includes(active) ? active : modules[0]!;
  const moduleRefining = (m: Module) => isRefining && refiningModule === REFINE[m].field;

  return (
    <BlueprintCockpit
      title="Cockpit Tráfego + Funil"
      subtitle="Mapa, criativos, jornada, campanhas e mensuração"
      stats={[
        { label: "Etapas funil", value: mapaFunil.length },
        { label: "Ângulos", value: angulos.length },
        { label: "Campanhas", value: campanhas.length },
        { label: "KPIs", value: kpis.length },
        { label: "Jornada", value: jornada.length },
      ]}
      modules={[
        { id: "mapa" as Module, label: "Mapa", icon: GitBranch, refining: moduleRefining("mapa") },
        { id: "angulos" as Module, label: "Criativos", icon: Megaphone, refining: moduleRefining("angulos") },
        { id: "jornada" as Module, label: "Jornada", icon: Route, refining: moduleRefining("jornada") },
        { id: "campanhas" as Module, label: "Campanhas", icon: BarChart3, refining: moduleRefining("campanhas") },
        { id: "mensuracao" as Module, label: "KPIs", icon: BarChart3, refining: moduleRefining("mensuracao") },
      ].filter((m) => modules.includes(m.id))}
      activeModule={effective}
      onSelectModule={setActive}
    >
      {effective === "mapa" && (
        <BlueprintModuleHeader
          icon={GitBranch}
          title="Mapa do Funil"
          subtitle="Topo → meio → fundo com peça e métrica"
          refinePlaceholder={REFINE.mapa.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.mapa.field, i) : undefined}
          isRefining={moduleRefining("mapa")}
          disabled={isRefining && !moduleRefining("mapa")}
        >
          <div className="space-y-2">
            {mapaFunil.map((item, i) => {
              const step = parseStep(item, i);
              return (
                <div key={i} className="grid sm:grid-cols-3 gap-2 rounded-lg border border-border px-4 py-3 min-h-[64px] items-center">
                  <p className="text-sm font-medium">{step.etapa}</p>
                  <p className="text-xs text-muted-foreground">{step.peca}</p>
                  <p className="text-xs text-primary font-medium">{step.metrica}</p>
                </div>
              );
            })}
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "angulos" && (
        <BlueprintModuleHeader
          icon={Megaphone}
          title="Ângulos Criativos"
          subtitle="Gancho, corpo e CTA — clique para expandir"
          refinePlaceholder={REFINE.angulos.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.angulos.field, i) : undefined}
          isRefining={moduleRefining("angulos")}
          disabled={isRefining && !moduleRefining("angulos")}
        >
          <div className="grid sm:grid-cols-2 gap-2">
            {angulos.map((item, i) => {
              const a = parseAngulo(item, i);
              const open = expandedAngulo === i;
              const copyText = [a.gancho, a.corpo, a.cta].filter(Boolean).join("\n\n");
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setExpandedAngulo(open ? null : i)}
                  className={[
                    "rounded-lg border text-left p-4 transition-all",
                    open ? "border-primary/50 bg-primary/5 sm:col-span-2" : "border-border min-h-[88px]",
                  ].join(" ")}
                >
                  <div className="flex justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-primary">Ângulo {i + 1}</span>
                    {copyText && <CopyButton text={copyText} />}
                  </div>
                  {a.gancho && (
                    <p className={["text-sm font-medium", !open && "line-clamp-2"].join(" ")}>{a.gancho}</p>
                  )}
                  {open && a.corpo && <p className="text-sm text-muted-foreground mt-2">{a.corpo}</p>}
                  {open && a.cta && <p className="text-xs text-hera-done mt-2">CTA: {a.cta}</p>}
                </button>
              );
            })}
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "jornada" && (
        <BlueprintModuleHeader
          icon={Route}
          title="Jornada do Cliente"
          subtitle="Etapas e pontos de vazamento"
          refinePlaceholder={REFINE.jornada.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.jornada.field, i) : undefined}
          isRefining={moduleRefining("jornada")}
          disabled={isRefining && !moduleRefining("jornada")}
        >
          <div className="space-y-2">
            {jornada.map((item, i) => {
              const step = parseStep(item, i);
              return (
                <div key={i} className="rounded-lg border border-border px-4 py-3">
                  <p className="text-sm font-medium">{step.etapa}</p>
                  {step.metrica && (
                    <p className="text-xs text-destructive/80 mt-1">Vazamento: {step.metrica}</p>
                  )}
                </div>
              );
            })}
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "campanhas" && (
        <BlueprintModuleHeader
          icon={BarChart3}
          title="Estrutura de Campanhas"
          subtitle="Configuração por canal e objetivo"
          refinePlaceholder={REFINE.campanhas.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.campanhas.field, i) : undefined}
          isRefining={moduleRefining("campanhas")}
          disabled={isRefining && !moduleRefining("campanhas")}
        >
          <div className="grid sm:grid-cols-2 gap-2">
            {campanhas.map((item, i) => {
              const c = parseStep(item, i);
              return (
                <div key={i} className="rounded-lg border border-border px-4 py-3 min-h-[72px]">
                  <p className="text-sm font-medium">{c.etapa}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.peca}</p>
                </div>
              );
            })}
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "mensuracao" && (
        <BlueprintModuleHeader
          icon={BarChart3}
          title="Mensuração"
          subtitle="KPIs, tracking e ritual de gestão"
          refinePlaceholder={REFINE.mensuracao.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.mensuracao.field, i) : undefined}
          isRefining={moduleRefining("mensuracao")}
          disabled={isRefining && !moduleRefining("mensuracao")}
        >
          {kpis.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {kpis.map((k, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5">
                  {k}
                </span>
              ))}
            </div>
          )}
          {mens.tracking && <p className="text-sm mb-2">Tracking: {asString(mens.tracking)}</p>}
          {mens.ritual && <p className="text-sm text-muted-foreground">{asString(mens.ritual)}</p>}
        </BlueprintModuleHeader>
      )}
    </BlueprintCockpit>
  );
}
