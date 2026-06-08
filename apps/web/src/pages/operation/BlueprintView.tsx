import { useOutletContext } from "react-router-dom";
import { FileText } from "lucide-react";
import { SectionShell } from "@/components/blueprint/SectionShell";
import { MercadoIcpSection } from "@/components/blueprint/MercadoIcpSection";
import { OfertaEscadaSection } from "@/components/blueprint/OfertaEscadaSection";
import { ComercialSection } from "@/components/blueprint/ComercialSection";
import { PosicionamentoSection } from "@/components/blueprint/PosicionamentoSection";
import { TrafegoFunilSection } from "@/components/blueprint/TrafegoFunilSection";
import { ChecklistSection } from "@/components/blueprint/ChecklistSection";
import { HipotesesSection } from "@/components/blueprint/HipotesesSection";
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <p className="hera-label mb-1">Entregável</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Blueprint Operacional Mestre
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filledSections.length} de {SECTION_DEFS.length} seções •{" "}
          <span className="text-primary">
            Clique em Ajustar em qualquer seção para refinar com IA
          </span>
        </p>
      </div>

      {/* Seções */}
      <div className="space-y-3">
        {SECTION_DEFS.map((def, i) => {
          const data = sections[def.key] as Json | undefined;
          if (data == null) return null;

          const isFirst = i === 0;

          return (
            <SectionShell
              key={def.key}
              num={i + 1}
              label={def.label}
              defaultOpen={isFirst}
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
