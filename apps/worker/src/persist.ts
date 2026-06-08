import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PHASE_ORDER,
  PHASE_SECTION_KEY,
  nextPhase,
  type PhaseName,
} from "./constants.js";
import type { IntelEventInput } from "./intel-types.js";
import type { BlueprintSections, CompetitorInput, Operation } from "./types.js";
import { normalizeOperation } from "./types.js";
import type { ParsedPhase } from "./parser.js";

export async function claimOperation(
  supabase: SupabaseClient,
  operationId: string,
): Promise<Operation | null> {
  const { data, error } = await supabase
    .from("operations")
    .update({
      status: "running",
      current_phase: "pesquisa",
      error: null,
      finished_at: null,
    })
    .eq("id", operationId)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`Falha ao claimar operação: ${error.message}`);
  return data ? normalizeOperation(data as Record<string, unknown>) : null;
}

export async function fetchNextQueued(
  supabase: SupabaseClient,
): Promise<Operation | null> {
  const { data, error } = await supabase
    .from("operations")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao buscar fila: ${error.message}`);
  return data ? normalizeOperation(data as Record<string, unknown>) : null;
}

export async function initPhaseEvents(
  supabase: SupabaseClient,
  operationId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("phase_events")
    .select("id")
    .eq("operation_id", operationId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const rows = PHASE_ORDER.map((phase) => ({
    operation_id: operationId,
    phase,
    status: "pending",
  }));

  const { error } = await supabase.from("phase_events").insert(rows);
  if (error) throw new Error(`Falha ao criar phase_events: ${error.message}`);
}

export async function setPhaseStatus(
  supabase: SupabaseClient,
  operationId: string,
  phase: PhaseName,
  status: "pending" | "running" | "done" | "error",
  log?: string,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  const now = new Date().toISOString();

  if (status === "running") patch.started_at = now;
  if (status === "done" || status === "error") patch.finished_at = now;
  if (log !== undefined) patch.log = log;

  const { error: phaseErr } = await supabase
    .from("phase_events")
    .update(patch)
    .eq("operation_id", operationId)
    .eq("phase", phase);

  if (phaseErr) throw new Error(`Falha ao atualizar fase ${phase}: ${phaseErr.message}`);

  if (status === "running") {
    const { error: opErr } = await supabase
      .from("operations")
      .update({ current_phase: phase })
      .eq("id", operationId);
    if (opErr) throw new Error(`Falha ao atualizar current_phase: ${opErr.message}`);
  }
}

export async function appendPhaseLog(
  supabase: SupabaseClient,
  operationId: string,
  phase: PhaseName,
  line: string,
): Promise<void> {
  const { data, error: fetchErr } = await supabase
    .from("phase_events")
    .select("log")
    .eq("operation_id", operationId)
    .eq("phase", phase)
    .single();

  if (fetchErr) return;

  const prev = (data?.log as string | null) ?? "";
  const next = prev ? `${prev}\n${line}` : line;
  const trimmed = next.length > 4000 ? next.slice(-4000) : next;

  await supabase
    .from("phase_events")
    .update({ log: trimmed })
    .eq("operation_id", operationId)
    .eq("phase", phase);
}

async function getOrCreateBlueprint(
  supabase: SupabaseClient,
  operationId: string,
): Promise<{ id: string; sections: BlueprintSections }> {
  const { data: existing, error: fetchErr } = await supabase
    .from("blueprints")
    .select("id, sections")
    .eq("operation_id", operationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr) throw new Error(`Falha ao buscar blueprint: ${fetchErr.message}`);
  if (existing) {
    return {
      id: existing.id as string,
      sections: (existing.sections as BlueprintSections) ?? {},
    };
  }

  const { data: created, error: insertErr } = await supabase
    .from("blueprints")
    .insert({ operation_id: operationId, sections: {} })
    .select("id, sections")
    .single();

  if (insertErr) throw new Error(`Falha ao criar blueprint: ${insertErr.message}`);
  return {
    id: created.id as string,
    sections: (created.sections as BlueprintSections) ?? {},
  };
}

export async function mergeBlueprintSections(
  supabase: SupabaseClient,
  operationId: string,
  patch: BlueprintSections,
): Promise<void> {
  const bp = await getOrCreateBlueprint(supabase, operationId);
  const merged = { ...bp.sections, ...patch };

  const { error } = await supabase
    .from("blueprints")
    .update({ sections: merged, updated_at: new Date().toISOString() })
    .eq("id", bp.id);

  if (error) throw new Error(`Falha ao atualizar blueprint: ${error.message}`);
}

export async function persistPhase(
  supabase: SupabaseClient,
  operationId: string,
  parsed: ParsedPhase,
): Promise<void> {
  const { phase, data } = parsed;

  if (phase === "blueprint") {
    const patch: BlueprintSections = {};
    if (Array.isArray(data.checklist)) patch.checklist = data.checklist;
    if (Array.isArray(data.hipoteses)) patch.hipoteses = data.hipoteses;
    await mergeBlueprintSections(supabase, operationId, patch);
  } else {
    const key = PHASE_SECTION_KEY[phase];
    await mergeBlueprintSections(supabase, operationId, { [key]: data });
  }

  await setPhaseStatus(supabase, operationId, phase, "done");

  const upcoming = nextPhase(phase);
  if (upcoming) {
    await setPhaseStatus(supabase, operationId, upcoming, "running");
  }
}

export async function persistCompetitors(
  supabase: SupabaseClient,
  operationId: string,
  competitors: CompetitorInput[],
  mode: "insert" | "merge" = "insert",
): Promise<void> {
  if (competitors.length === 0) return;

  if (mode === "insert") {
    const { data: existing } = await supabase
      .from("competitors")
      .select("id")
      .eq("operation_id", operationId)
      .limit(1);

    if (existing && existing.length > 0) return;
  }

  if (mode === "merge") {
    const { data: existingRows } = await supabase
      .from("competitors")
      .select("id, nome, instagram")
      .eq("operation_id", operationId);

    const igHandle = (value: string | null | undefined): string | null => {
      if (!value) return null;
      const m = value.match(/instagram\.com\/([^/?]+)/i);
      return m?.[1]?.toLowerCase() ?? null;
    };

    const byName = new Map<string, string>();
    const byInstagram = new Map<string, string>();
    for (const r of existingRows ?? []) {
      byName.set((r.nome as string).toLowerCase().trim(), r.id as string);
      const handle = igHandle(r.instagram as string | null);
      if (handle) byInstagram.set(handle, r.id as string);
    }

    for (const c of competitors) {
      const key = c.nome.toLowerCase().trim();
      const handle = igHandle(
        c.instagram
          ? c.instagram.startsWith("http")
            ? c.instagram
            : `https://${c.instagram.replace(/^\/+/, "")}`
          : null,
      );
      const row = {
        operation_id: operationId,
        nome: c.nome,
        url: c.url ?? null,
        instagram: c.instagram
          ? c.instagram.startsWith("http")
            ? c.instagram
            : `https://${c.instagram.replace(/^\/+/, "")}`
          : null,
        posicionamento: c.posicionamento ?? null,
        oferta: c.oferta ?? null,
        ticket_estimado: c.ticket_estimado ?? null,
        pontos_fortes: c.pontos_fortes ?? null,
        pontos_fracos: c.pontos_fracos ?? null,
        angulos_criativos: c.angulos_criativos ?? [],
        fonte: c.fonte ?? null,
      };

      const existingId =
        (handle && byInstagram.get(handle)) ?? byName.get(key);
      if (existingId) {
        await supabase.from("competitors").update(row).eq("id", existingId);
        byName.set(key, existingId);
        if (handle) byInstagram.set(handle, existingId);
      } else {
        const { data: inserted } = await supabase
          .from("competitors")
          .insert(row)
          .select("id")
          .single();
        if (inserted?.id) {
          byName.set(key, inserted.id as string);
          if (handle) byInstagram.set(handle, inserted.id as string);
        }
      }
    }
    return;
  }

  const rows = competitors.map((c) => ({
    operation_id: operationId,
    nome: c.nome,
    url: c.url ?? null,
    instagram: c.instagram ?? null,
    posicionamento: c.posicionamento ?? null,
    oferta: c.oferta ?? null,
    ticket_estimado: c.ticket_estimado ?? null,
    pontos_fortes: c.pontos_fortes ?? null,
    pontos_fracos: c.pontos_fracos ?? null,
    angulos_criativos: c.angulos_criativos ?? [],
    fonte: c.fonte ?? null,
  }));

  const { error } = await supabase.from("competitors").insert(rows);
  if (error) throw new Error(`Falha ao gravar competitors: ${error.message}`);
}

export async function persistIntelEvents(
  supabase: SupabaseClient,
  operationId: string,
  events: IntelEventInput[],
  scanId: string,
): Promise<number> {
  if (events.length === 0) return 0;

  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, nome")
    .eq("operation_id", operationId);

  const byName = new Map(
    (competitors ?? []).map((c) => [(c.nome as string).toLowerCase().trim(), c.id as string]),
  );

  const { data: existingUrls } = await supabase
    .from("intel_events")
    .select("url")
    .eq("operation_id", operationId)
    .not("url", "is", null);

  const knownUrls = new Set(
    (existingUrls ?? [])
      .map((r) => (r.url as string | null)?.toLowerCase().trim())
      .filter(Boolean),
  );

  let inserted = 0;
  for (const e of events) {
    const url = e.url?.trim() || null;
    if (url) {
      const key = url.toLowerCase();
      if (knownUrls.has(key)) continue;
      knownUrls.add(key);
    }

    const compId = byName.get(e.competitor_nome.toLowerCase().trim()) ?? null;
    const row = {
      operation_id: operationId,
      competitor_id: compId,
      competitor_nome: e.competitor_nome,
      event_type: e.event_type,
      titulo: e.titulo,
      resumo: e.resumo ?? null,
      url,
      fonte: e.fonte ?? null,
      detected_at: e.detected_at ?? new Date().toISOString(),
      scan_id: scanId,
    };

    const { error } = await supabase.from("intel_events").insert(row);
    if (!error) inserted++;
    else if (error.code !== "23505")
      console.warn(`[worker] intel insert: ${error.message}`);
  }

  return inserted;
}

export async function persistComparisonReport(
  supabase: SupabaseClient,
  operationId: string,
  content: Record<string, unknown>,
  costUsd: number | null,
  model: string,
): Promise<void> {
  const row = {
    operation_id: operationId,
    content,
    cost_usd: costUsd,
    model,
    generated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("comparison_reports")
    .upsert(row, { onConflict: "operation_id" });

  if (error) throw new Error(`Falha ao gravar comparativo: ${error.message}`);
}

export async function markOperationDone(
  supabase: SupabaseClient,
  operationId: string,
  costUsd: number | null,
  opts?: { keepPhase?: string; intelScan?: boolean },
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: "done",
    current_phase: opts?.keepPhase ?? "blueprint",
    job_mode: "full",
    cost_usd: costUsd,
    finished_at: new Date().toISOString(),
  };
  if (opts?.intelScan) patch.last_intel_scan_at = new Date().toISOString();

  const { error } = await supabase
    .from("operations")
    .update(patch)
    .eq("id", operationId);

  if (error) throw new Error(`Falha ao finalizar operação: ${error.message}`);
}

export async function markOperationError(
  supabase: SupabaseClient,
  operationId: string,
  message: string,
  currentPhase: PhaseName | null,
): Promise<void> {
  if (currentPhase) {
    await setPhaseStatus(supabase, operationId, currentPhase, "error", message);
  }

  const { error } = await supabase
    .from("operations")
    .update({
      status: "error",
      error: message,
      finished_at: new Date().toISOString(),
    })
    .eq("id", operationId);

  if (error) console.error(`[worker] Falha ao gravar erro: ${error.message}`);
}
