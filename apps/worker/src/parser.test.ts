import { describe, it, expect } from "vitest";
import {
  extractAssistantText,
  parsePhaseBlocks,
  parseCompetitorsBlock,
  parseIntelBlock,
  parseComparativoBlock,
  parseContentBlock,
  parseRefineBlock,
  parseSpinBlock,
  toolLogLine,
} from "./parser.js";

// ── extractAssistantText ──────────────────────────────────────────────────────

describe("extractAssistantText", () => {
  it("joins text blocks", () => {
    const result = extractAssistantText([
      { type: "text", text: "hello" },
      { type: "text", text: "world" },
    ]);
    expect(result).toBe("hello\nworld");
  });

  it("ignores non-text blocks", () => {
    const result = extractAssistantText([
      { type: "tool_use", id: "x", input: {} },
      { type: "text", text: "only this" },
    ]);
    expect(result).toBe("only this");
  });

  it("returns empty string for non-array input", () => {
    expect(extractAssistantText(null)).toBe("");
    expect(extractAssistantText("string")).toBe("");
    expect(extractAssistantText(42)).toBe("");
  });

  it("returns empty string for empty array", () => {
    expect(extractAssistantText([])).toBe("");
  });
});

// ── parsePhaseBlocks ──────────────────────────────────────────────────────────

describe("parsePhaseBlocks", () => {
  it("parses a valid phase block", () => {
    const text = `<<<HERA_PHASE:pesquisa>>>
{"resumo_mercado":"Grande mercado"}
<<<END>>>`;
    const result = parsePhaseBlocks(text, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].phase).toBe("pesquisa");
    expect(result[0].data).toEqual({ resumo_mercado: "Grande mercado" });
  });

  it("parses multiple phase blocks", () => {
    const text = `<<<HERA_PHASE:oferta>>>
{"equacao_valor":"Alta"}
<<<END>>>
<<<HERA_PHASE:comercial>>>
{"funil_comercial":[]}
<<<END>>>`;
    const result = parsePhaseBlocks(text, new Set());
    expect(result).toHaveLength(2);
    expect(result[0].phase).toBe("oferta");
    expect(result[1].phase).toBe("comercial");
  });

  it("skips already-processed phases", () => {
    const text = `<<<HERA_PHASE:pesquisa>>>
{"key":"val"}
<<<END>>>`;
    const result = parsePhaseBlocks(text, new Set(["pesquisa"]));
    expect(result).toHaveLength(0);
  });

  it("skips unknown phase names", () => {
    const text = `<<<HERA_PHASE:unknown_phase>>>
{"key":"val"}
<<<END>>>`;
    const result = parsePhaseBlocks(text, new Set());
    expect(result).toHaveLength(0);
  });

  it("skips blocks with invalid JSON", () => {
    const text = `<<<HERA_PHASE:oferta>>>
{ not valid json
<<<END>>>`;
    const result = parsePhaseBlocks(text, new Set());
    expect(result).toHaveLength(0);
  });
});

// ── parseCompetitorsBlock ─────────────────────────────────────────────────────

describe("parseCompetitorsBlock", () => {
  it("parses a valid competitors block", () => {
    const text = `<<<HERA_COMPETITORS>>>
[{"nome":"Agência X","url":"https://x.com"}]
<<<END>>>`;
    const result = parseCompetitorsBlock(text, false);
    expect(result).toHaveLength(1);
    expect(result![0].nome).toBe("Agência X");
  });

  it("returns null when already processed", () => {
    const text = `<<<HERA_COMPETITORS>>>
[{"nome":"Agência X"}]
<<<END>>>`;
    expect(parseCompetitorsBlock(text, true)).toBeNull();
  });

  it("filters entries missing nome", () => {
    const text = `<<<HERA_COMPETITORS>>>
[{"nome":"Boa Agência"},{"url":"sem-nome.com"}]
<<<END>>>`;
    const result = parseCompetitorsBlock(text, false);
    expect(result).toHaveLength(1);
    expect(result![0].nome).toBe("Boa Agência");
  });

  it("returns null when block is absent", () => {
    expect(parseCompetitorsBlock("nenhum bloco aqui", false)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    const text = `<<<HERA_COMPETITORS>>>
not json
<<<END>>>`;
    expect(parseCompetitorsBlock(text, false)).toBeNull();
  });

  it("returns null when parsed value is not an array", () => {
    const text = `<<<HERA_COMPETITORS>>>
{"nome":"should be array"}
<<<END>>>`;
    expect(parseCompetitorsBlock(text, false)).toBeNull();
  });
});

// ── parseIntelBlock ───────────────────────────────────────────────────────────

describe("parseIntelBlock", () => {
  const validEvent = {
    competitor_nome: "AgênciaX",
    titulo: "Novo post",
    event_type: "post",
  };

  it("parses a valid intel block", () => {
    const text = `<<<HERA_INTEL>>>
[${JSON.stringify(validEvent)}]
<<<END>>>`;
    const result = parseIntelBlock(text);
    expect(result).toHaveLength(1);
    expect(result![0].competitor_nome).toBe("AgênciaX");
  });

  it("filters events with invalid event_type", () => {
    const bad = { ...validEvent, event_type: "hack" };
    const text = `<<<HERA_INTEL>>>
[${JSON.stringify(validEvent)},${JSON.stringify(bad)}]
<<<END>>>`;
    const result = parseIntelBlock(text);
    expect(result).toHaveLength(1);
  });

  it("filters events missing required fields", () => {
    const text = `<<<HERA_INTEL>>>
[{"event_type":"post"}]
<<<END>>>`;
    const result = parseIntelBlock(text);
    expect(result).toHaveLength(0);
  });

  it("returns null when block is absent", () => {
    expect(parseIntelBlock("nothing here")).toBeNull();
  });
});

// ── parseComparativoBlock ─────────────────────────────────────────────────────

describe("parseComparativoBlock", () => {
  it("parses a valid comparativo block", () => {
    const payload = { resumo_executivo: "Análise completa", pontos_chave: [] };
    const text = `<<<HERA_COMPARATIVO>>>
${JSON.stringify(payload)}
<<<END>>>`;
    const result = parseComparativoBlock(text);
    expect(result?.resumo_executivo).toBe("Análise completa");
  });

  it("returns null when resumo_executivo is missing", () => {
    const text = `<<<HERA_COMPARATIVO>>>
{"pontos_chave":[]}
<<<END>>>`;
    expect(parseComparativoBlock(text)).toBeNull();
  });

  it("returns null when block is absent", () => {
    expect(parseComparativoBlock("nada")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    const text = `<<<HERA_COMPARATIVO>>>
{ bad json }
<<<END>>>`;
    expect(parseComparativoBlock(text)).toBeNull();
  });
});

// ── parseContentBlock ─────────────────────────────────────────────────────────

describe("parseContentBlock", () => {
  it("parses a valid content block", () => {
    const items = [
      { format: "post_instagram", dor: "captação difícil", content: { titulo: "Hook" } },
      { format: "script_reels", dor: "sem diferencial", content: { hook: "Atenção" } },
    ];
    const text = `<<<HERA_CONTENT>>>
${JSON.stringify(items)}
<<<END>>>`;
    const result = parseContentBlock(text);
    expect(result).toHaveLength(2);
    expect(result![0].format).toBe("post_instagram");
  });

  it("filters items missing format or content", () => {
    const items = [
      { format: "post_instagram", content: { titulo: "ok" } },
      { dor: "sem format" },
      { format: "email_prospeccao" },
    ];
    const text = `<<<HERA_CONTENT>>>
${JSON.stringify(items)}
<<<END>>>`;
    const result = parseContentBlock(text);
    expect(result).toHaveLength(1);
  });

  it("returns null when block is absent", () => {
    expect(parseContentBlock("texto sem bloco")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    const text = `<<<HERA_CONTENT>>>
not json at all
<<<END>>>`;
    expect(parseContentBlock(text)).toBeNull();
  });
});

// ── parseRefineBlock ──────────────────────────────────────────────────────────

describe("parseRefineBlock", () => {
  it("parses a valid refine block", () => {
    const data = { equacao_valor: "Atualizado", escada: [] };
    const text = `<<<HERA_REFINE:oferta_escada>>>
${JSON.stringify(data)}
<<<END>>>`;
    const result = parseRefineBlock(text, "oferta_escada");
    expect(result).toEqual(data);
  });

  it("returns null when section key does not match", () => {
    const text = `<<<HERA_REFINE:oferta_escada>>>
{"key":"val"}
<<<END>>>`;
    expect(parseRefineBlock(text, "mercado_icp")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    const text = `<<<HERA_REFINE:comercial>>>
{ bad json
<<<END>>>`;
    expect(parseRefineBlock(text, "comercial")).toBeNull();
  });

  it("returns null when block is absent", () => {
    expect(parseRefineBlock("no refine block", "checklist")).toBeNull();
  });

  it("returns null when value is an array (not an object)", () => {
    const text = `<<<HERA_REFINE:hipoteses>>>
["item1","item2"]
<<<END>>>`;
    expect(parseRefineBlock(text, "hipoteses")).toBeNull();
  });
});

describe("parseRefineBlock + parseSpinBlock (comercial)", () => {
  it("parses comercial refine and SPIN from same response", () => {
    const comercial = {
      funil_comercial: ["Lead → Call"],
      sdr: { criterios: [], scripts: [] },
      closer: { roteiro_call: [], perguntas: [] },
      carta_vendas: "",
      pitch_stacking: "",
    };
    const spin = {
      situacao: ["Como vocês homologam fornecedores hoje?"],
      problema: ["Quanto tempo leva uma auditoria manual?"],
      implicacao: ["O que acontece se um fornecedor não conforme passar?"],
      necessidade: ["Como seria ter rastreabilidade em tempo real?"],
    };
    const text = `<<<HERA_REFINE:comercial>>>
${JSON.stringify(comercial)}
<<<END>>>
<<<HERA_SPIN>>>
${JSON.stringify(spin)}
<<<END>>>`;

    expect(parseRefineBlock(text, "comercial")).toEqual(comercial);
    expect(parseSpinBlock(text, false)).toEqual(spin);
  });
});

// ── toolLogLine ───────────────────────────────────────────────────────────────

describe("toolLogLine", () => {
  it("formats WebSearch with query", () => {
    const line = toolLogLine("WebSearch", { query: "agência de implante SP" });
    expect(line).toContain("agência de implante SP");
    expect(line).toContain("Pesquisando");
  });

  it("falls back to 'mercado' when query is missing", () => {
    const line = toolLogLine("WebSearch", {});
    expect(line).toContain("mercado");
  });

  it("formats Skill tool", () => {
    const line = toolLogLine("Skill", {});
    expect(line).toContain("skill");
  });

  it("formats Read/Glob/Grep", () => {
    expect(toolLogLine("Read", {})).toContain("Read");
    expect(toolLogLine("Glob", {})).toContain("Glob");
    expect(toolLogLine("Grep", {})).toContain("Grep");
  });

  it("formats unknown tools with generic prefix", () => {
    const line = toolLogLine("SomeTool", {});
    expect(line).toContain("SomeTool");
  });
});
