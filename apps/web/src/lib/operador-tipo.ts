import type { Operation } from "@/types/index";

export type OperadorTipo = "agencia" | "saas_b2b";

export const OPERADOR_TIPO_OPTIONS: Array<{
  value: OperadorTipo;
  label: string;
  description: string;
}> = [
  {
    value: "agencia",
    label: "Agência de marketing B2B",
    description: "Você vende marketing para um nicho. Concorrência = outras agências.",
  },
  {
    value: "saas_b2b",
    label: "SaaS / produto B2B",
    description:
      "Você vende software/plataforma para empresas. Concorrência = outras soluções do mercado.",
  },
];

export function resolveOperadorTipo(operation: Operation): OperadorTipo {
  const row = operation as Operation & { operador_tipo?: string };
  if (row.operador_tipo === "saas_b2b") return "saas_b2b";
  const perfil = operation.operador_perfil;
  if (perfil && typeof perfil === "object" && !Array.isArray(perfil) && perfil.tipo === "saas_b2b") {
    return "saas_b2b";
  }
  return "agencia";
}

export function competitorLabels(tipo: OperadorTipo) {
  if (tipo === "saas_b2b") {
    return {
      title: "Concorrentes do mercado",
      subtitle: "Plataformas e soluções que competem pelo mesmo ICP",
      seedHint: "Nome da plataforma | https://site.com",
      seedPlaceholder: "Plataforma X | https://site.com\nConcorrente Y | https://...",
      enrichToast: "Informe ao menos um concorrente (uma por linha).",
      mapped: "players mapeados",
    };
  }
  return {
    title: "Agências concorrentes",
    subtitle: "Outras agências que atendem o mesmo ICP",
    seedHint: "Nome da agência | https://site.com",
    seedPlaceholder: "Agência X | https://site.com\ninstagram.com/handle",
    enrichToast: "Informe ao menos uma agência (uma por linha).",
    mapped: "agências mapeadas",
  };
}
