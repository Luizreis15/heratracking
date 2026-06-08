export type BriefingTemplate = {
  id: string;
  label: string;
  description: string;
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
    nicho: "",
    posicionamento: "",
    ticket_alvo: "",
    modelo_entrega: "",
    restricoes:
      "Evitar promessas não comprováveis, superlativos vazios e claims regulatórios sem base legal. Toda copy deve ser informativa e verificável.",
    concorrentes_manuais: "",
  },
  {
    id: "fora-da-caixa-homologacao",
    label: "Fora da Caixa — SaaS homologação online",
    description:
      "Agência B2B atendendo SaaS de homologação de fornecedores. Grande teste nicho-agnóstico.",
    nicho:
      "Empresas de médio e grande porte (indústria, varejo, construção, energia) que precisam homologar fornecedores online — e SaaS B2B que vendem plataforma de homologação para essas empresas",
    posicionamento:
      "Fora da Caixa — agência de growth e marketing B2B especializada em posicionar e escalar SaaS de homologação online: geração de pipeline enterprise, autoridade em compliance de fornecedores e conteúdo para decisores de compras/suprimentos",
    ticket_alvo: "R$ 8.000 – R$ 18.000/mês (retainer growth B2B + tráfego)",
    modelo_entrega: "Retainer mensal + setup inicial",
    restricoes: `LGPD: não expor dados de terceiros em cases sem autorização.
Não prometer "homologação garantida", certificação automática ou conformidade legal sem base documentada.
Evitar claims de ROI percentual sem estudo de caso verificável.
Tom enterprise: direto, técnico-comercial, sem hype de startup genérica.
Não confundir concorrentes do operador (outras agências) com concorrentes do SaaS (outras plataformas de homologação).`,
    concorrentes_manuais: `Agência Nuts | https://nutsmarketing.com.br
RD Station (serviços/agência) | https://www.rdstation.com
Rock Content | https://rockcontent.com`,
    operador_perfil: {
      nome: "Fora da Caixa",
      url: "",
      oferta:
        "Growth B2B para SaaS: posicionamento, demand gen, conteúdo para decisores de suprimentos/compliance e tráfego qualificado",
      ticket: "R$ 8.000 – R$ 18.000/mês",
      posicionamento:
        "Única agência focada em growth para SaaS de homologação e compliance de fornecedores no Brasil",
      pontos_fortes:
        "Entendimento do ciclo de venda enterprise longo; conteúdo técnico-comercial; integração marketing + vendas",
      pontos_fracos: "Marca ainda em construção; poucos cases públicos documentados",
      notas:
        "ICP primário: founders/CMOs de SaaS de homologação. ICP secundário: heads de suprimentos em empresas que compram o SaaS.",
    },
  },
];

export function getBriefingTemplate(id: string): BriefingTemplate | undefined {
  return BRIEFING_TEMPLATES.find((t) => t.id === id);
}
