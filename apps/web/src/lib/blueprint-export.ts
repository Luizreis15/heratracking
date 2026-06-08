import {
  asString,
  asStrings,
  type MercadoIcpData,
  type OfertaEscadaData,
  type ComercialData,
  type PosicionamentoData,
  type TrafegoFunilData,
} from "./blueprint-types";

// ── helpers ──────────────────────────────────────────────────────────────────

function h2(n: number, title: string) {
  return `\n## ${String(n).padStart(2, "0")} · ${title}\n\n`;
}

function h3(title: string) {
  return `\n### ${title}\n\n`;
}

function field(label: string, value: unknown): string {
  const s = asString(value);
  return s ? `**${label}:** ${s}\n` : "";
}

function list(label: string, value: unknown): string {
  const items = asStrings(value);
  if (!items.length) return "";
  return `**${label}:**\n${items.map((i) => `- ${i}`).join("\n")}\n`;
}

function objList(label: string, value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const lines = value
    .map((item) => {
      if (typeof item === "string") return `- ${item}`;
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const parts = Object.entries(obj)
          .filter(([, v]) => v != null && v !== "")
          .map(([k, v]) => `${k}: ${asString(v)}`);
        return parts.length ? `- ${parts.join(" · ")}` : null;
      }
      return null;
    })
    .filter(Boolean);
  if (!lines.length) return "";
  return `**${label}:**\n${lines.join("\n")}\n`;
}

// ── section serializers ───────────────────────────────────────────────────────

function serializeMercadoIcp(data: unknown): string {
  const d = data as MercadoIcpData;
  let md = "";
  md += field("Resumo de Mercado", d.resumo_mercado);
  if (d.nivel_consciencia != null)
    md += `**Nível de Consciência:** ${d.nivel_consciencia}/5\n`;

  if (d.icp) {
    md += h3("ICP");
    md += field("Quem é", d.icp.quem_e);
    md += field("Situação Gatilho", d.icp.situacao_gatilho);
    md += list("Dores", d.icp.dores);
    md += list("Desejos", d.icp.desejos);
    md += list("Objeções", d.icp.objecoes);
    md += list("Onde Está", d.icp.onde_esta);
  }

  if (d.filtro_perfil) {
    md += h3("Filtro de Perfil");
    asStrings(d.filtro_perfil.verde).forEach((s) => (md += `✅ ${s}\n`));
    asStrings(d.filtro_perfil.amarelo).forEach((s) => (md += `⚠️  ${s}\n`));
    asStrings(d.filtro_perfil.vermelho).forEach((s) => (md += `❌ ${s}\n`));
  }

  return md;
}

function serializeOfertaEscada(data: unknown): string {
  const d = data as OfertaEscadaData;
  let md = "";
  md += field("Equação de Valor", d.equacao_valor);

  if (Array.isArray(d.escada) && d.escada.length) {
    md += h3("Escada de Valor");
    d.escada.forEach((step) => {
      if (step && typeof step === "object") {
        const s = step as Record<string, unknown>;
        md += `**${asString(s.nome) || "Degrau"}**`;
        if (s.tipo) md += ` *(${asString(s.tipo)})*`;
        if (s.preco) md += ` — ${asString(s.preco)}`;
        md += "\n";
        if (s.descricao) md += `> ${asString(s.descricao)}\n`;
        md += "\n";
      }
    });
  }

  if (d.oferta_principal) {
    md += h3("Oferta Principal");
    const op = d.oferta_principal;
    md += field("Promessa", op.promessa);
    md += field("Mecanismo Único", op.mecanismo_unico);
    md += list("Inclusos", op.inclusos);
    md += field("Garantia", op.garantia);
    md += list("Bônus", op.bonus);
    md += field("Escassez", op.escassez);
  }

  md += field("Precificação", d.precificacao);
  return md;
}

function serializeComercial(data: unknown): string {
  const d = data as ComercialData;
  let md = "";

  if (Array.isArray(d.funil_comercial) && d.funil_comercial.length) {
    md += h3("Funil Comercial");
    d.funil_comercial.forEach((etapa) => {
      if (typeof etapa === "string") md += `- ${etapa}\n`;
      else if (etapa && typeof etapa === "object") {
        const e = etapa as Record<string, unknown>;
        const nome = asString(e.etapa ?? e.nome ?? e.name ?? "");
        const desc = asString(e.descricao ?? e.description ?? e.acao ?? "");
        if (nome) md += `- **${nome}**${desc ? `: ${desc}` : ""}\n`;
      }
    });
    md += "\n";
  }

  if (d.sdr) {
    md += h3("SDR");
    md += list("Critérios", d.sdr.criterios);
    md += objList("Scripts", d.sdr.scripts);
  }

  if (d.closer) {
    md += h3("Closer");
    md += objList("Roteiro de Call", d.closer.roteiro_call);
    md += list("Perguntas", d.closer.perguntas);
  }

  md += field("Carta de Vendas", d.carta_vendas);
  md += field("Pitch Stacking", d.pitch_stacking);
  return md;
}

function serializePosicionamento(data: unknown): string {
  const d = data as PosicionamentoData;
  let md = "";
  md += field("Statement de Posicionamento", d.statement);

  if (d.narrativa) {
    md += h3("Narrativa de Marca");
    md += field("Herói", d.narrativa.heroi);
    md += field("Problema", d.narrativa.problema);
    md += field("Guia", d.narrativa.guia);
    md += field("Plano", d.narrativa.plano);
    md += field("CTA", d.narrativa.cta);
  }

  md += list("Pilares de Conteúdo", d.pilares_conteudo);

  if (d.linha_editorial) {
    md += h3("Linha Editorial");
    const le = d.linha_editorial;
    md += field("Mix", le.mix);
    md += list("Formatos", le.formatos);
    md += field("Cadência", le.cadencia);
    md += field("Bio/CTA", le.bio_cta);
  }

  return md;
}

function serializeTrafegoFunil(data: unknown): string {
  const d = data as TrafegoFunilData;
  let md = "";

  if (Array.isArray(d.mapa_funil) && d.mapa_funil.length) {
    md += h3("Mapa de Funil");
    d.mapa_funil.forEach((etapa) => {
      if (typeof etapa === "string") md += `- ${etapa}\n`;
      else if (etapa && typeof etapa === "object") {
        const e = etapa as Record<string, unknown>;
        const nome = asString(e.etapa ?? e.nome ?? e.name ?? "");
        const objetivo = asString(e.objetivo ?? e.descricao ?? "");
        if (nome) md += `- **${nome}**${objetivo ? `: ${objetivo}` : ""}\n`;
      }
    });
    md += "\n";
  }

  if (Array.isArray(d.campanhas) && d.campanhas.length) {
    md += h3("Campanhas");
    d.campanhas.forEach((c) => {
      if (typeof c === "string") {
        md += `- ${c}\n`;
      } else if (c && typeof c === "object") {
        const obj = c as Record<string, unknown>;
        const nome = asString(obj.nome ?? obj.name ?? obj.tipo ?? "");
        const desc = asString(obj.objetivo ?? obj.descricao ?? "");
        if (nome) md += `- **${nome}**${desc ? `: ${desc}` : ""}\n`;
      }
    });
    md += "\n";
  }

  if (Array.isArray(d.angulos_criativos) && d.angulos_criativos.length) {
    md += h3("Ângulos Criativos");
    d.angulos_criativos.forEach((a) => {
      if (typeof a === "string") {
        md += `- ${a}\n`;
      } else if (a && typeof a === "object") {
        const obj = a as Record<string, unknown>;
        const titulo = asString(obj.titulo ?? obj.angulo ?? "");
        const gancho = asString(obj.gancho ?? "");
        if (titulo) md += `### ${titulo}\n`;
        if (gancho) md += `${gancho}\n`;
        if (obj.corpo) md += `${asString(obj.corpo)}\n`;
        if (obj.cta) md += `**CTA:** ${asString(obj.cta)}\n`;
        md += "\n";
      }
    });
  }

  if (d.mensuracao) {
    md += h3("Mensuração");
    md += field("Tracking", d.mensuracao.tracking);
    md += field("Ritual de Análise", d.mensuracao.ritual);
  }

  return md;
}

function serializeChecklist(data: unknown): string {
  const items = asStrings(data);
  if (!items.length) {
    // try array of objects
    if (!Array.isArray(data)) return "";
    return (data as unknown[])
      .map((item) => {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const acao = asString(obj.acao ?? obj.item ?? obj.texto ?? "");
          const prioridade = asString(obj.prioridade ?? obj.prazo ?? "");
          return acao ? `- [ ] ${acao}${prioridade ? ` *(${prioridade})*` : ""}` : null;
        }
        return null;
      })
      .filter(Boolean)
      .join("\n") + "\n";
  }
  return items.map((i) => `- [ ] ${i}`).join("\n") + "\n";
}

function serializeHipoteses(data: unknown): string {
  const items = asStrings(data);
  if (!items.length) {
    if (!Array.isArray(data)) return "";
    return (data as unknown[])
      .map((item) => {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const hipotese = asString(obj.hipotese ?? obj.descricao ?? obj.texto ?? "");
          const como = asString(obj.como_validar ?? obj.validacao ?? "");
          return hipotese
            ? `- ${hipotese}${como ? `\n  *Como validar: ${como}*` : ""}`
            : null;
        }
        return null;
      })
      .filter(Boolean)
      .join("\n") + "\n";
  }
  return items.map((i) => `- ${i}`).join("\n") + "\n";
}

// ── SPIN serializer ───────────────────────────────────────────────────────────

function serializeSpinGuide(spin: unknown): string {
  if (!spin || typeof spin !== "object" || Array.isArray(spin)) return "";
  const obj = spin as Record<string, unknown>;

  const LABELS = [
    ["situacao", "S — SITUAÇÃO — Entendendo o contexto do lead"],
    ["problema", "P — PROBLEMA — Expondo a dor real"],
    ["implicacao", "I — IMPLICAÇÃO — Ampliando a urgência"],
    ["necessidade", "N — NECESSIDADE — Antecipando a solução"],
  ] as const;

  let md = "";
  LABELS.forEach(([key, label]) => {
    const items = obj[key];
    if (!Array.isArray(items) || !items.length) return;
    md += h3(label);
    items.forEach((q, i) => {
      if (typeof q === "string") md += `${i + 1}. ${q}\n`;
    });
    md += "\n";
  });
  return md;
}

// ── public API ────────────────────────────────────────────────────────────────

export function blueprintToMarkdown(
  sections: Record<string, unknown>,
  nicho: string,
  posicionamento: string,
  spinGuide?: unknown,
): string {
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  let md = `# Blueprint Operacional Mestre\n\n`;
  md += `**Nicho:** ${nicho}\n`;
  md += `**Posicionamento:** ${posicionamento}\n`;
  md += `**Gerado em:** ${date}\n\n`;
  md += `---\n`;

  const SECTION_SERIALIZERS: Array<{
    key: string;
    label: string;
    fn: (data: unknown) => string;
    afterFn?: () => string;
  }> = [
    { key: "mercado_icp", label: "Mercado + ICP", fn: serializeMercadoIcp },
    { key: "oferta_escada", label: "Oferta / Escada de Valor", fn: serializeOfertaEscada },
    {
      key: "comercial",
      label: "Processo Comercial",
      fn: serializeComercial,
      afterFn: spinGuide ? () => serializeSpinGuide(spinGuide) : undefined,
    },
    { key: "posicionamento", label: "Posicionamento Digital", fn: serializePosicionamento },
    { key: "trafego_funil", label: "Tráfego + Funil", fn: serializeTrafegoFunil },
    { key: "checklist", label: "Checklist de Implementação", fn: serializeChecklist },
    { key: "hipoteses", label: "Hipóteses a Validar", fn: serializeHipoteses },
  ];

  SECTION_SERIALIZERS.forEach((s, i) => {
    const data = sections[s.key];
    if (data == null) return;
    md += h2(i + 1, s.label);
    md += s.fn(data);
    if (s.afterFn) {
      const extra = s.afterFn();
      if (extra) {
        md += "\n### SPIN Selling Guide\n\n";
        md += extra;
      }
    }
    md += "\n---\n";
  });

  md += `\n*Documento gerado pela plataforma Hera Arquiteto.*\n`;
  return md;
}

export function downloadMarkdown(md: string, nicho: string): void {
  const slug = nicho
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const filename = `blueprint-${slug}-${new Date().toISOString().slice(0, 10)}.md`;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
