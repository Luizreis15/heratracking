import { useState } from "react";
import { BookOpen, Layers, Megaphone, Quote } from "lucide-react";
import type { Json } from "@/types/index";
import { asString, asStrings, type PosicionamentoData } from "@/lib/blueprint-types";
import { BlueprintCockpit } from "./cockpit/BlueprintCockpit";
import { BlueprintModuleHeader } from "./cockpit/BlueprintModuleHeader";
import type { BlueprintSectionRefineProps } from "./cockpit/types";

type Module = "statement" | "narrativa" | "pilares" | "editorial";

const REFINE: Record<Module, { field: string; placeholder: string }> = {
  statement: { field: "statement", placeholder: "Ex.: statement mais técnico para decisor de compras B2B" },
  narrativa: { field: "narrativa", placeholder: "Ex.: narrativa StoryBrand com herói = gestor de qualidade" },
  pilares: { field: "pilares_conteudo", placeholder: "Ex.: 4 pilares — compliance, eficiência, rastreio, integração" },
  editorial: { field: "linha_editorial", placeholder: "Ex.: mix 60% educativo LinkedIn + 40% cases técnicos" },
};

const NARRATIVA_STEPS = [
  { key: "heroi", label: "Herói" },
  { key: "problema", label: "Problema" },
  { key: "guia", label: "Guia" },
  { key: "plano", label: "Plano" },
  { key: "cta", label: "CTA" },
] as const;

export function PosicionamentoSection({
  data,
  onRefineModule,
  refiningModule = null,
  isRefining = false,
}: { data: Json } & BlueprintSectionRefineProps) {
  const d = (data ?? {}) as PosicionamentoData;
  const narrativa = d.narrativa ?? {};
  const pilares = Array.isArray(d.pilares_conteudo) ? d.pilares_conteudo : [];
  const editorial = d.linha_editorial ?? {};
  const formatos = asStrings(editorial.formatos);

  const modules: Module[] = [];
  if (d.statement) modules.push("statement");
  if (Object.values(narrativa).some(Boolean)) modules.push("narrativa");
  if (pilares.length) modules.push("pilares");
  if (editorial.mix || formatos.length) modules.push("editorial");
  if (!modules.length) modules.push("statement");

  const [active, setActive] = useState<Module | null>(null);
  const [expandedPilar, setExpandedPilar] = useState<number | null>(0);
  const effective = active && modules.includes(active) ? active : modules[0]!;
  const moduleRefining = (m: Module) => isRefining && refiningModule === REFINE[m].field;

  return (
    <BlueprintCockpit
      title="Cockpit Posicionamento"
      subtitle="Statement, narrativa, pilares e linha editorial"
      stats={[
        { label: "Pilares", value: pilares.length },
        { label: "Formatos", value: formatos.length },
        { label: "Narrativa", value: NARRATIVA_STEPS.filter((s) => narrativa[s.key]).length },
        { label: "Statement", value: d.statement ? "✓" : "—" },
        { label: "Cadência", value: editorial.cadencia ? "✓" : "—" },
      ]}
      modules={[
        { id: "statement" as Module, label: "Statement", icon: Quote, refining: moduleRefining("statement") },
        { id: "narrativa" as Module, label: "Narrativa", icon: BookOpen, refining: moduleRefining("narrativa") },
        { id: "pilares" as Module, label: "Pilares", icon: Layers, refining: moduleRefining("pilares") },
        { id: "editorial" as Module, label: "Editorial", icon: Megaphone, refining: moduleRefining("editorial") },
      ].filter((m) => modules.includes(m.id))}
      activeModule={effective}
      onSelectModule={setActive}
    >
      {effective === "statement" && d.statement && (
        <BlueprintModuleHeader
          icon={Quote}
          title="Statement de Posicionamento"
          subtitle="Frase-mãe da marca"
          refinePlaceholder={REFINE.statement.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.statement.field, i) : undefined}
          isRefining={moduleRefining("statement")}
          disabled={isRefining && !moduleRefining("statement")}
        >
          <p className="text-lg font-serif font-semibold leading-relaxed text-center px-4 py-6 rounded-xl border border-primary/30 bg-primary/5">
            &ldquo;{asString(d.statement)}&rdquo;
          </p>
        </BlueprintModuleHeader>
      )}

      {effective === "narrativa" && (
        <BlueprintModuleHeader
          icon={BookOpen}
          title="Narrativa StoryBrand"
          subtitle="Herói → Problema → Guia → Plano → CTA"
          refinePlaceholder={REFINE.narrativa.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.narrativa.field, i) : undefined}
          isRefining={moduleRefining("narrativa")}
          disabled={isRefining && !moduleRefining("narrativa")}
        >
          <div className="grid sm:grid-cols-2 gap-2">
            {NARRATIVA_STEPS.map((step, i) => {
              const val = asString(narrativa[step.key]);
              if (!val) return null;
              return (
                <div key={step.key} className="rounded-lg border border-border px-4 py-3 min-h-[80px]">
                  <p className="text-[10px] font-bold text-primary uppercase">
                    {String(i + 1).padStart(2, "0")} · {step.label}
                  </p>
                  <p className="text-sm text-foreground mt-2 leading-relaxed">{val}</p>
                </div>
              );
            })}
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "pilares" && pilares.length > 0 && (
        <BlueprintModuleHeader
          icon={Layers}
          title="Pilares de Conteúdo"
          subtitle="Clique para expandir cada pilar"
          refinePlaceholder={REFINE.pilares.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.pilares.field, i) : undefined}
          isRefining={moduleRefining("pilares")}
          disabled={isRefining && !moduleRefining("pilares")}
        >
          <div className="grid sm:grid-cols-2 gap-2">
            {pilares.map((item, i) => {
              const p =
                typeof item === "string"
                  ? { nome: item.split(":")[0], descricao: item.split(":").slice(1).join(":") }
                  : (item as Record<string, unknown>);
              const open = expandedPilar === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setExpandedPilar(open ? null : i)}
                  className={[
                    "rounded-lg border text-left px-4 py-3 transition-all",
                    open ? "border-primary/50 bg-primary/5 sm:col-span-2" : "border-border min-h-[72px]",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold">{asString(p.nome ?? p.titulo ?? `Pilar ${i + 1}`)}</p>
                  {open && !!asString(p.descricao) && (
                    <p className="text-sm text-muted-foreground mt-2">{asString(p.descricao)}</p>
                  )}
                </button>
              );
            })}
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "editorial" && (
        <BlueprintModuleHeader
          icon={Megaphone}
          title="Linha Editorial"
          subtitle="Mix, formatos, cadência e bio/CTA"
          refinePlaceholder={REFINE.editorial.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.editorial.field, i) : undefined}
          isRefining={moduleRefining("editorial")}
          disabled={isRefining && !moduleRefining("editorial")}
        >
          <div className="space-y-3">
            {editorial.mix && (
              <div className="rounded-lg border border-border p-3 text-sm">{asString(editorial.mix)}</div>
            )}
            {formatos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formatos.map((f, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full border border-border">
                    {f}
                  </span>
                ))}
              </div>
            )}
            {editorial.cadencia && (
              <p className="text-sm text-muted-foreground">Cadência: {asString(editorial.cadencia)}</p>
            )}
            {editorial.bio_cta && (
              <div className="rounded-lg bg-accent/30 p-3 text-sm">{asString(editorial.bio_cta)}</div>
            )}
          </div>
        </BlueprintModuleHeader>
      )}
    </BlueprintCockpit>
  );
}
