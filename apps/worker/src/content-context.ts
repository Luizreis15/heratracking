import type { SpinGuide } from "./parser.js";

export type BlueprintContentContext = {
  icp_quem: string;
  icp_gatilho: string;
  dores: string[];
  desejos: string[];
  objecoes: string[];
  statement: string;
  narrativa: Record<string, string>;
  angulos: Array<Record<string, string>>;
  pilares: string[];
  funil_mapa: string[];
  spin_amostra: string[];
};

export function buildBlueprintContentContext(
  sections: Record<string, unknown>,
  spinGuide?: SpinGuide | null,
): BlueprintContentContext {
  const mercado = (sections.mercado_icp ?? {}) as Record<string, unknown>;
  const icp = (mercado.icp ?? {}) as Record<string, unknown>;
  const pos = (sections.posicionamento ?? {}) as Record<string, unknown>;
  const narrativa = (pos.narrativa ?? {}) as Record<string, unknown>;
  const tf = (sections.trafego_funil ?? {}) as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const angulosRaw = Array.isArray(tf.angulos_criativos) ? tf.angulos_criativos : [];
  const angulos = angulosRaw.slice(0, 6).map((a) => {
    if (typeof a === "string") return { gancho: a };
    if (a && typeof a === "object") return a as Record<string, string>;
    return {};
  });

  const pilaresRaw = Array.isArray(pos.pilares_conteudo) ? pos.pilares_conteudo : [];
  const pilares = pilaresRaw.map((p) => {
    if (typeof p === "string") return p;
    if (p && typeof p === "object") {
      const o = p as Record<string, unknown>;
      return str(o.nome ?? o.titulo) || JSON.stringify(o);
    }
    return String(p);
  });

  const spin_amostra: string[] = [];
  if (spinGuide) {
    spin_amostra.push(...spinGuide.problema.slice(0, 2), ...spinGuide.implicacao.slice(0, 1));
  }

  return {
    icp_quem: str(icp.quem_e),
    icp_gatilho: str(icp.situacao_gatilho),
    dores: arr(icp.dores),
    desejos: arr(icp.desejos),
    objecoes: arr(icp.objecoes),
    statement: str(pos.statement),
    narrativa: {
      heroi: str(narrativa.heroi),
      problema: str(narrativa.problema),
      guia: str(narrativa.guia),
      plano: str(narrativa.plano),
      cta: str(narrativa.cta),
    },
    angulos,
    pilares,
    funil_mapa: arr(tf.mapa_funil).map(String),
    spin_amostra,
  };
}

export function formatBlueprintContextBlock(ctx: BlueprintContentContext): string {
  return `## Blueprint — insumos obrigatórios (use na copy)
- ICP: ${ctx.icp_quem || "(ver briefing)"}
- Gatilho: ${ctx.icp_gatilho || "—"}
- Statement: ${ctx.statement || "—"}
- Herói (narrativa): ${ctx.narrativa.heroi || "—"}
- Problema (narrativa): ${ctx.narrativa.problema || "—"}
- Guia (operador): ${ctx.narrativa.guia || "—"}
- Plano: ${ctx.narrativa.plano || "—"}
- Dores ICP: ${ctx.dores.map((d, i) => `\n  ${i + 1}. ${d}`).join("") || "—"}
- Desejos: ${ctx.desejos.slice(0, 4).join(" | ") || "—"}
- Objeções: ${ctx.objecoes.slice(0, 4).join(" | ") || "—"}
- Pilares de conteúdo: ${ctx.pilares.slice(0, 5).join(" · ") || "—"}
- Ângulos do Blueprint (tráfego): ${
    ctx.angulos
      .map((a, i) => `\n  ${i + 1}. ${a.gancho ?? a.titulo ?? JSON.stringify(a)}`)
      .join("") || "—"
  }
- Mapa funil aquisição: ${ctx.funil_mapa.slice(0, 4).join(" → ") || "—"}
- Perguntas SPIN (insumo): ${ctx.spin_amostra.join(" | ") || "—"}`;
}
