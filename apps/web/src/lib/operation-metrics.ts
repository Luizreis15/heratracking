import type { OperationMetric } from "@/types/index";

export type MetricFields = {
  leads_captados: number;
  conteudos_criados: number;
  conteudos_publicados: number;
  reunioes_realizadas: number;
  agendamentos: number;
  notas: string;
};

export type NumericMetricKey = Exclude<keyof MetricFields, "notas">;

export const METRIC_LABELS: { key: NumericMetricKey; label: string; short: string }[] = [
  { key: "leads_captados", label: "Leads captados", short: "Leads" },
  { key: "conteudos_criados", label: "Conteúdos criados", short: "Criados" },
  { key: "conteudos_publicados", label: "Conteúdos publicados", short: "Publicados" },
  { key: "reunioes_realizadas", label: "Reuniões realizadas", short: "Reuniões" },
  { key: "agendamentos", label: "Agendamentos", short: "Agendamentos" },
];

export const EMPTY_METRICS: MetricFields = {
  leads_captados: 0,
  conteudos_criados: 0,
  conteudos_publicados: 0,
  reunioes_realizadas: 0,
  agendamentos: 0,
  notas: "",
};

/** Primeiro dia do mês em ISO date (YYYY-MM-01) */
export function periodMonthFromDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function formatPeriodLabel(periodMonth: string): string {
  const [y, mo] = periodMonth.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[Number(mo) - 1]} ${y}`;
}

export function metricToFields(m: OperationMetric | null | undefined): MetricFields {
  if (!m) return { ...EMPTY_METRICS };
  return {
    leads_captados: m.leads_captados,
    conteudos_criados: m.conteudos_criados,
    conteudos_publicados: m.conteudos_publicados,
    reunioes_realizadas: m.reunioes_realizadas,
    agendamentos: m.agendamentos,
    notas: m.notas ?? "",
  };
}

export function fieldsFromMetric(m: OperationMetric): MetricFields {
  return metricToFields(m);
}
