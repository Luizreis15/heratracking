import type { OperadorTipo } from "@/lib/operador-tipo";

export type BriefingTemplate = {
  id: string;
  label: string;
  description: string;
  operador_tipo: OperadorTipo;
  nicho: string;
  posicionamento: string;
  ticket_alvo: string;
  modelo_entrega: string;
  restricoes: string;
  concorrentes_manuais: string;
  operador_perfil?: {
    nome: string;
    url?: string;
    instagram?: string;
    oferta?: string;
    ticket?: string;
    posicionamento?: string;
    pontos_fortes?: string;
    pontos_fracos?: string;
    notas?: string;
  };
};

export const BRIEFING_TEMPLATES: BriefingTemplate[] = [
  {
    id: "blank",
    label: "Em branco",
    description: "Preencha todos os campos manualmente.",
    operador_tipo: "agencia",
    nicho: "",
    posicionamento: "",
    ticket_alvo: "",
    modelo_entrega: "",
    restricoes:
      "Evitar promessas não comprováveis, superlativos vazios e claims regulatórios sem base legal. Toda copy deve ser informativa e verificável.",
    concorrentes_manuais: "",
  },
  {
    id: "veramo-homologacao",
    label: "Veramo — SaaS homologação online",
    description:
      "Plataforma B2B para sindicatos e empresas. Concorrência = outras soluções de homologação, não agências.",
    operador_tipo: "saas_b2b",
    nicho:
      "Sindicatos, escritórios de contabilidade e empresas de médio/grande porte que precisam realizar homologações online (ciclo trabalhista e compliance de fornecedores)",
    posicionamento:
      "Veramo — plataforma digital com soluções para sindicatos e empresas que precisam digitalizar e escalar o processo de homologação de fornecedores online, com foco em compliance, agilidade e redução de risco",
    ticket_alvo: "R$ 2.000 – R$ 15.000/mês (assinatura SaaS conforme porte e módulos)",
    modelo_entrega: "SaaS por assinatura + implantação/onboarding",
    restricoes: `LGPD: não expor dados de terceiros em cases sem autorização.
Não prometer homologação garantida, certificação automática ou conformidade legal sem base documentada.
Tom B2B: direto para decisores de RH, compliance, suprimentos e diretoria sindical.
HERA_COMPETITORS = outras plataformas/sistemas de homologação — NÃO agências de marketing.`,
    concorrentes_manuais: `Gcertifica | https://www.gcertifica.com.br
Alloy | https://www.alloy.al
Votorantim Cimentos (referência mercado) | pesquisar plataformas similares`,
    operador_perfil: {
      nome: "Veramo",
      oferta:
        "Plataforma de homologação online para sindicatos e empresas — digitalização do ciclo trabalhista e compliance de fornecedores",
      ticket: "R$ 2.000 – R$ 15.000/mês",
      posicionamento:
        "Solução especializada em homologação digital para entidades e empresas que precisam escalar compliance sem planilhas",
      pontos_fortes: "Foco no nicho sindical/trabalhista; digitalização ponta a ponta",
      pontos_fracos: "Marca em expansão; competir com planilhas e processos manuais",
      notas: "Operador é SaaS — modelo de negócio = atrair e converter empresas/sindicatos, não vender marketing.",
    },
  },
  {
    id: "fora-da-caixa-homologacao",
    label: "Fora da Caixa — agência para SaaS homologação",
    description: "Agência de growth vendendo marketing para SaaS de homologação.",
    operador_tipo: "agencia",
    nicho:
      "Founders e CMOs de SaaS B2B de homologação de fornecedores que contratam agência de growth",
    posicionamento:
      "Fora da Caixa — agência de growth B2B especializada em pipeline enterprise para SaaS de homologação e compliance",
    ticket_alvo: "R$ 8.000 – R$ 18.000/mês (retainer growth B2B)",
    modelo_entrega: "Retainer mensal + setup inicial",
    restricoes: `LGPD em cases. Tom enterprise. Concorrência = outras agências B2B, não plataformas SaaS.`,
    concorrentes_manuais: `Agência Nuts | https://nutsmarketing.com.br
Rock Content | https://rockcontent.com`,
    operador_perfil: {
      nome: "Fora da Caixa",
      oferta: "Growth B2B para SaaS de homologação",
      ticket: "R$ 8.000 – R$ 18.000/mês",
      posicionamento: "Agência focada em demand gen para SaaS enterprise",
      pontos_fortes: "Conteúdo técnico-comercial B2B",
      pontos_fracos: "Marca em construção",
    },
  },
];

export function getBriefingTemplate(id: string): BriefingTemplate | undefined {
  return BRIEFING_TEMPLATES.find((t) => t.id === id);
}
