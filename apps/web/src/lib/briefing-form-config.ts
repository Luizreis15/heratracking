import type { OperadorTipo } from "@/lib/operador-tipo";

export type BriefingFormCopy = {
  pageSubtitle: string;
  submitLabel: string;
  submitHint: string;
  nicho: { label: string; hint: string; placeholder: string };
  posicionamento: { label: string; hint: string; placeholder: string };
  ticket: { label: string; hint: string; placeholder: string };
  modelo: { label: string; hint: string };
  concorrentes: { label: string; hint: string; placeholder: string };
  operadorNome: { label: string; hint: string; placeholder: string };
  modelos: string[];
};

const AGENCIA_MODELOS = [
  "Gestão de tráfego pago",
  "Assessoria completa de marketing",
  "Retainer mensal + setup inicial",
  "Gestão de tráfego + assessoria estratégica",
  "Consultoria estratégica pontual",
];

const SAAS_MODELOS = [
  "SaaS por assinatura + implantação/onboarding",
  "SaaS self-service + planos enterprise",
  "Freemium / trial + conversão para pago",
  "Por módulo / usage-based",
  "Licença anual + suporte dedicado",
];

export const BRIEFING_FORM: Record<OperadorTipo, BriefingFormCopy> = {
  agencia: {
    pageSubtitle:
      "Briefing para agência de marketing B2B. O worker gera Blueprint e mapa de agências concorrentes.",
    submitLabel: "Iniciar Blueprint da agência",
    submitHint:
      "Fase 1 mapeia dores do ICP e agências concorrentes. Job de 20–30 min em background.",
    nicho: {
      label: "Quem é seu cliente B2B (ICP)",
      hint: "Quem contrata e paga sua agência — ex.: founders de SaaS, clínicas, indústrias",
      placeholder: "Ex.: founders e CMOs de SaaS B2B que contratam agência de growth",
    },
    posicionamento: {
      label: "Posicionamento da sua agência",
      hint: "Como sua agência se vende para esse ICP",
      placeholder: "Agência de growth B2B especializada em...",
    },
    ticket: {
      label: "Ticket do contrato (cliente → agência)",
      hint: "Mensalidade/retainer que o cliente B2B paga a você",
      placeholder: "R$ 5.000 – R$ 15.000/mês",
    },
    modelo: {
      label: "Modelo de entrega",
      hint: "Como você presta o serviço de marketing",
    },
    concorrentes: {
      label: "Agências concorrentes (opcional)",
      hint: "Uma por linha — outras agências que atendem o mesmo ICP",
      placeholder: "Agência X | https://site.com\nConsultoria Y | https://...",
    },
    operadorNome: {
      label: "Nome da agência",
      hint: "Usado no comparativo e na análise estratégica",
      placeholder: "Ex.: Fora da Caixa",
    },
    modelos: AGENCIA_MODELOS,
  },
  saas_b2b: {
    pageSubtitle:
      "Briefing para SaaS/plataforma B2B. O worker monta GTM, pricing e mapa de players do mercado.",
    submitLabel: "Iniciar Blueprint do produto",
    submitHint:
      "Fase 1 mapeia dores do ICP (empresas compradoras) e plataformas concorrentes. Job de 20–30 min.",
    nicho: {
      label: "Quem compra seu software (ICP)",
      hint: "Empresas/decisores que contratam sua plataforma — não o usuário final",
      placeholder:
        "Ex.: sindicatos e empresas de médio porte que precisam homologar fornecedores online",
    },
    posicionamento: {
      label: "Posicionamento do produto",
      hint: "Como sua plataforma se diferencia para esse ICP",
      placeholder:
        "Plataforma de homologação online que digitaliza compliance e reduz risco para...",
    },
    ticket: {
      label: "Ticket / assinatura (ICP → SaaS)",
      hint: "Faixa de preço que o cliente paga pelo software (mensal ou anual)",
      placeholder: "R$ 2.000 – R$ 15.000/mês conforme porte e módulos",
    },
    modelo: {
      label: "Modelo de monetização",
      hint: "Como você cobra e entrega valor",
    },
    concorrentes: {
      label: "Plataformas concorrentes (opcional)",
      hint: "Uma por linha — outros softwares que competem pelo mesmo ICP",
      placeholder: "Gcertifica | https://www.gcertifica.com.br\nAlloy | https://www.alloy.al",
    },
    operadorNome: {
      label: "Nome do produto / empresa",
      hint: "Usado no comparativo e nas battle cards",
      placeholder: "Ex.: Veramo",
    },
    modelos: SAAS_MODELOS,
  },
};

export function briefingFormCopy(tipo: OperadorTipo): BriefingFormCopy {
  return BRIEFING_FORM[tipo];
}
