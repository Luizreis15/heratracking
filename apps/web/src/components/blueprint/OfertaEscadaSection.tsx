import { useState } from "react";
import { Gem, Layers, Receipt, Sparkles } from "lucide-react";
import type { Json } from "@/types/index";
import { asString, asStrings, type EscadaDegrau, type OfertaEscadaData } from "@/lib/blueprint-types";
import { BlueprintCockpit } from "./cockpit/BlueprintCockpit";
import { BlueprintModuleHeader } from "./cockpit/BlueprintModuleHeader";
import type { BlueprintSectionRefineProps } from "./cockpit/types";

type Module = "equacao" | "escada" | "oferta" | "preco";

const REFINE: Record<Module, { field: string; placeholder: string }> = {
  equacao: { field: "equacao_valor", placeholder: "Ex.: equação focada em ROI de homologação em 90 dias" },
  escada: { field: "escada", placeholder: "Ex.: adicionar degrau de diagnóstico gratuito antes do core" },
  oferta: { field: "oferta_principal", placeholder: "Ex.: promessa consultiva sem garantia de resultado" },
  preco: { field: "precificacao", placeholder: "Ex.: ancoragem por custo de não-conformidade regulatória" },
};

function parseDegrau(item: unknown, i: number) {
  if (typeof item === "string") {
    const colonIdx = item.indexOf(":");
    if (colonIdx > 0) {
      return { label: item.slice(0, colonIdx).trim(), descricao: item.slice(colonIdx + 1).trim(), preco: "" };
    }
    return { label: `Degrau ${i + 1}`, descricao: item, preco: "" };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const d = item as EscadaDegrau;
    return { label: d.nome ?? d.tipo ?? `Degrau ${i + 1}`, descricao: d.descricao ?? "", preco: d.preco ?? "" };
  }
  return { label: `Degrau ${i + 1}`, descricao: String(item), preco: "" };
}

export function OfertaEscadaSection({
  data,
  onRefineModule,
  refiningModule = null,
  isRefining = false,
}: { data: Json } & BlueprintSectionRefineProps) {
  const d = (data ?? {}) as OfertaEscadaData;
  const escada = Array.isArray(d.escada) ? d.escada : [];
  const op = d.oferta_principal ?? {};
  const inclusos = asStrings(op.inclusos);
  const bonus = asStrings(op.bonus);

  const modules: Module[] = [];
  if (d.equacao_valor) modules.push("equacao");
  if (escada.length) modules.push("escada");
  if (op.promessa || op.mecanismo_unico || inclusos.length) modules.push("oferta");
  if (d.precificacao) modules.push("preco");
  if (!modules.length) modules.push("oferta");

  const [active, setActive] = useState<Module | null>(null);
  const effective = active && modules.includes(active) ? active : modules[0]!;
  const moduleRefining = (m: Module) => isRefining && refiningModule === REFINE[m].field;

  return (
    <BlueprintCockpit
      title="Cockpit Oferta"
      subtitle="Equação, escada, oferta principal e precificação"
      stats={[
        { label: "Degraus", value: escada.length },
        { label: "Inclusos", value: inclusos.length },
        { label: "Bônus", value: bonus.length },
        { label: "Garantia", value: op.garantia ? "✓" : "—" },
        { label: "Escassez", value: op.escassez ? "✓" : "—" },
      ]}
      modules={[
        { id: "equacao" as Module, label: "Equação", icon: Sparkles, refining: moduleRefining("equacao") },
        { id: "escada" as Module, label: "Escada", icon: Layers, refining: moduleRefining("escada") },
        { id: "oferta" as Module, label: "Oferta", icon: Gem, refining: moduleRefining("oferta") },
        { id: "preco" as Module, label: "Preço", icon: Receipt, refining: moduleRefining("preco") },
      ].filter((m) => modules.includes(m.id))}
      activeModule={effective}
      onSelectModule={setActive}
    >
      {effective === "equacao" && d.equacao_valor && (
        <BlueprintModuleHeader
          icon={Sparkles}
          title="Equação de Valor"
          subtitle="Por que o cliente paga — resultado vs investimento"
          refinePlaceholder={REFINE.equacao.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.equacao.field, i) : undefined}
          isRefining={moduleRefining("equacao")}
          disabled={isRefining && !moduleRefining("equacao")}
        >
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm font-medium leading-relaxed">
            {asString(d.equacao_valor)}
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "escada" && escada.length > 0 && (
        <BlueprintModuleHeader
          icon={Layers}
          title="Escada de Valor"
          subtitle="Degraus do lead à oferta principal"
          refinePlaceholder={REFINE.escada.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.escada.field, i) : undefined}
          isRefining={moduleRefining("escada")}
          disabled={isRefining && !moduleRefining("escada")}
        >
          <div className="grid sm:grid-cols-2 gap-2">
            {escada.map((item, i) => {
              const deg = parseDegrau(item, i);
              const isTop = i === escada.length - 1;
              return (
                <div
                  key={i}
                  className={[
                    "rounded-xl border px-4 py-3 min-h-[88px]",
                    isTop ? "border-primary/50 bg-primary/10 sm:col-span-2" : "border-border",
                  ].join(" ")}
                >
                  <p className="text-xs font-bold text-primary uppercase">{deg.label}</p>
                  <p className="text-sm text-foreground mt-1">{deg.descricao}</p>
                  {deg.preco && <p className="text-xs text-primary mt-1 font-semibold">{deg.preco}</p>}
                </div>
              );
            })}
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "oferta" && (
        <BlueprintModuleHeader
          icon={Gem}
          title="Oferta Principal"
          subtitle="Promessa, mecanismo, inclusos e bônus"
          refinePlaceholder={REFINE.oferta.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.oferta.field, i) : undefined}
          isRefining={moduleRefining("oferta")}
          disabled={isRefining && !moduleRefining("oferta")}
        >
          <div className="space-y-4">
            {op.promessa && (
              <div className="rounded-xl border border-primary/30 p-4">
                <p className="hera-label mb-1">Promessa</p>
                <p className="text-base font-semibold">{op.promessa}</p>
              </div>
            )}
            {op.mecanismo_unico && (
              <p className="text-sm text-muted-foreground">{op.mecanismo_unico}</p>
            )}
            {inclusos.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2">
                {inclusos.map((x, i) => (
                  <div key={i} className="rounded-lg border border-hera-done/30 px-3 py-2 text-sm">
                    ✓ {x}
                  </div>
                ))}
              </div>
            )}
            {bonus.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bonus.map((b, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full border border-primary/30 text-primary">
                    + {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "preco" && d.precificacao && (
        <BlueprintModuleHeader
          icon={Receipt}
          title="Precificação"
          subtitle="Ancoragem e estrutura de preço"
          refinePlaceholder={REFINE.preco.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.preco.field, i) : undefined}
          isRefining={moduleRefining("preco")}
          disabled={isRefining && !moduleRefining("preco")}
        >
          <div className="rounded-xl border border-l-[3px] border-l-primary p-4 text-sm leading-relaxed">
            {asString(d.precificacao)}
          </div>
        </BlueprintModuleHeader>
      )}
    </BlueprintCockpit>
  );
}
