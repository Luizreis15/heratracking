/** Converte logs técnicos do worker em copy legível — cobre jobs gravados antes da Fase 2. */

const LINE_RULES: Array<{ pattern: RegExp; replace: string }> = [
  {
    pattern: /Perplexity\s*\([^)]*\)\s*[—–-]\s*coleta web\.{0,3}/i,
    replace: "Analisando o mercado e mapeando concorrentes...",
  },
  {
    pattern: /🔀\s*Swarm\/[^\n]+/i,
    replace: "Processando etapa...",
  },
  {
    pattern: /⚙️\s*Executando skill arquiteto-de-agencia\.{0,3}/i,
    replace: "Consultando metodologia do operador...",
  },
  {
    pattern: /🧠\s*Claude\s*[—–-][^\n]*/i,
    replace: "Montando estrutura operacional...",
  },
  {
    pattern: /🎯\s*Claude\s*[—–-][^\n]*/i,
    replace: "Gerando análise comparativa estratégica...",
  },
  {
    pattern: /📡\s*Meta Graph\s*[—–-]\s*/i,
    replace: "Monitorando redes sociais — ",
  },
  {
    pattern: /📄\s*(Read|Glob|Grep)\.{0,3}/i,
    replace: "Consultando referências...",
  },
  {
    pattern: /🔧\s*(Read|Glob|Grep|Skill|WebSearch)\.{0,3}/i,
    replace: "Processando...",
  },
];

export function sanitizeGenerationLogLine(line: string): string {
  let result = line.trim();
  if (!result) return "";

  for (const { pattern, replace } of LINE_RULES) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replace).trim();
      break;
    }
  }

  return result;
}

export function sanitizeGenerationLog(log: string): string {
  return log
    .split("\n")
    .map(sanitizeGenerationLogLine)
    .filter(Boolean)
    .join("\n");
}
