import { useState } from "react";
import { Filter, Target, TrendingUp } from "lucide-react";
import type { Json } from "@/types/index";
import { asString, asStrings, type MercadoIcpData } from "@/lib/blueprint-types";
import { BlueprintCockpit } from "./cockpit/BlueprintCockpit";
import { BlueprintModuleHeader } from "./cockpit/BlueprintModuleHeader";
import type { BlueprintSectionRefineProps } from "./cockpit/types";

const NIVEL_LABELS: Record<number, string> = {
  1: "Sem consciência do problema",
  2: "Consciente do problema",
  3: "Consciente da solução",
  4: "Consciente do produto",
  5: "Pronto para decidir",
};

type Module = "icp" | "filtro" | "mercado";

const REFINE: Record<Module, { field: string; placeholder: string }> = {
  icp: {
    field: "icp",
    placeholder: "Ex.: ICP mais específico — diretor de qualidade em indústria de médio porte",
  },
  filtro: {
    field: "filtro_perfil",
    placeholder: "Ex.: critérios verde/amarelo/vermelho mais rígidos para SaaS B2B",
  },
  mercado: {
    field: "resumo_mercado",
    placeholder: "Ex.: resumo com dados de mercado homologação fornecedores no Brasil",
  },
};

function TextWithCitations({ text }: { text: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\[\d+\]$/.test(part) ? (
          <sup key={i} className="text-[9px] text-primary ml-0.5 font-semibold">
            {part}
          </sup>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function MercadoIcpSection({
  data,
  onRefineModule,
  refiningModule = null,
  isRefining = false,
}: { data: Json } & BlueprintSectionRefineProps) {
  const d = (data ?? {}) as MercadoIcpData;
  const icp = d.icp ?? {};
  const filtro = d.filtro_perfil ?? {};
  const dores = asStrings(icp.dores);
  const desejos = asStrings(icp.desejos);
  const objecoes = asStrings(icp.objecoes);
  const ondeEsta = asStrings(icp.onde_esta);
  const resumo = asStrings(d.resumo_mercado);
  const verde = asStrings(filtro.verde);
  const amarelo = asStrings(filtro.amarelo);
  const vermelho = asStrings(filtro.vermelho);

  const modules: Module[] = [];
  if (icp.quem_e || dores.length || desejos.length) modules.push("icp");
  if (verde.length || amarelo.length || vermelho.length) modules.push("filtro");
  if (resumo.length || d.nivel_consciencia != null) modules.push("mercado");
  if (modules.length === 0) modules.push("icp");

  const [active, setActive] = useState<Module | null>(null);
  const effective = active && modules.includes(active) ? active : modules[0]!;

  const moduleRefining = (m: Module) => isRefining && refiningModule === REFINE[m].field;

  return (
    <BlueprintCockpit
      title="Cockpit Mercado + ICP"
      subtitle="Persona, triagem e contexto de mercado — um módulo por vez"
      stats={[
        { label: "Dores", value: dores.length },
        { label: "Desejos", value: desejos.length },
        { label: "Objeções", value: objecoes.length },
        { label: "Verde", value: verde.length },
        { label: "Nível", value: d.nivel_consciencia ?? "—" },
      ]}
      modules={modules.map((id) => ({
        id,
        label: id === "icp" ? "ICP" : id === "filtro" ? "Filtro" : "Mercado",
        icon: id === "icp" ? Target : id === "filtro" ? Filter : TrendingUp,
        refining: moduleRefining(id),
      }))}
      activeModule={effective}
      onSelectModule={setActive}
    >
      {effective === "icp" && (
        <BlueprintModuleHeader
          icon={Target}
          title="ICP — Cliente Ideal"
          subtitle="Quem é, dores, desejos e onde está"
          refinePlaceholder={REFINE.icp.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.icp.field, i) : undefined}
          isRefining={moduleRefining("icp")}
          disabled={isRefining && !moduleRefining("icp")}
        >
          {icp.quem_e && (
            <div className="hera-card p-4 border-l-[3px] border-l-primary mb-4">
              <p className="hera-label mb-2">Quem é</p>
              <p className="text-sm text-foreground leading-relaxed">{asString(icp.quem_e)}</p>
            </div>
          )}
          {icp.situacao_gatilho && (
            <blockquote className="border-l-4 border-primary/40 pl-4 py-2 bg-accent/20 rounded-r-lg mb-4 text-sm italic">
              {asString(icp.situacao_gatilho)}
            </blockquote>
          )}
          {dores.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-2 mb-4">
              {dores.map((dor, i) => (
                <div
                  key={i}
                  className={[
                    "rounded-lg border px-3 py-3 min-h-[72px] text-sm",
                    i === 0 ? "border-destructive/40 bg-destructive/5" : "border-border",
                  ].join(" ")}
                >
                  <span className="hera-mono text-[10px] text-primary font-bold mr-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {dor}
                </div>
              ))}
            </div>
          )}
          {desejos.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-2 mb-4">
              {desejos.map((x, i) => (
                <div key={i} className="rounded-lg border border-hera-done/30 bg-hera-done/5 px-3 py-2 text-sm">
                  ✓ {x}
                </div>
              ))}
            </div>
          )}
          {objecoes.length > 0 && (
            <div className="space-y-2 mb-4">
              {objecoes.map((x, i) => (
                <div key={i} className="rounded-lg border border-border px-3 py-2 text-sm">
                  ✕ {x}
                </div>
              ))}
            </div>
          )}
          {ondeEsta.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ondeEsta.map((c, i) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full border border-border">
                  {c}
                </span>
              ))}
            </div>
          )}
        </BlueprintModuleHeader>
      )}

      {effective === "filtro" && (
        <BlueprintModuleHeader
          icon={Filter}
          title="Filtro de Perfil"
          subtitle="Semáforo verde / amarelo / vermelho para triagem"
          refinePlaceholder={REFINE.filtro.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.filtro.field, i) : undefined}
          isRefining={moduleRefining("filtro")}
          disabled={isRefining && !moduleRefining("filtro")}
        >
          <div className="grid sm:grid-cols-3 gap-3">
            <FilterColumn title="Verde" color="text-hera-done" border="border-hera-done/30" bg="bg-hera-done/5" items={verde} />
            <FilterColumn title="Amarelo" color="text-hera-alert" border="border-hera-alert/30" bg="bg-hera-alert/5" items={amarelo} />
            <FilterColumn title="Vermelho" color="text-destructive" border="border-destructive/30" bg="bg-destructive/5" items={vermelho} />
          </div>
        </BlueprintModuleHeader>
      )}

      {effective === "mercado" && (
        <BlueprintModuleHeader
          icon={TrendingUp}
          title="Resumo de Mercado"
          subtitle="Contexto macro e nível de consciência do ICP"
          refinePlaceholder={REFINE.mercado.placeholder}
          onRefine={onRefineModule ? (i) => onRefineModule(REFINE.mercado.field, i) : undefined}
          isRefining={moduleRefining("mercado")}
          disabled={isRefining && !moduleRefining("mercado")}
        >
          {d.nivel_consciencia != null && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg border border-border">
              <p className="hera-label">Consciência</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={[
                      "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold",
                      n <= (d.nivel_consciencia ?? 0) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {n}
                  </div>
                ))}
              </div>
              <p className="text-xs text-foreground">{NIVEL_LABELS[d.nivel_consciencia] ?? ""}</p>
            </div>
          )}
          <div className="space-y-2">
            {resumo.map((bullet, i) => (
              <div key={i} className="rounded-lg border border-border px-4 py-3 text-sm leading-relaxed">
                <TextWithCitations text={bullet} />
              </div>
            ))}
          </div>
        </BlueprintModuleHeader>
      )}
    </BlueprintCockpit>
  );
}

function FilterColumn({
  title,
  color,
  border,
  bg,
  items,
}: {
  title: string;
  color: string;
  border: string;
  bg: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <div className={`rounded-lg border p-4 min-h-[120px] ${border} ${bg}`}>
      <p className={`text-xs font-semibold mb-3 ${color}`}>{title}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
