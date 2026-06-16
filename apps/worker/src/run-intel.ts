import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import {
  appendPhaseLog,
  claimOperation,
  incrementOperationCost,
  loadMethodProfile,
  markOperationDone,
  markOperationError,
  persistIntelEvents,
  setPhaseStatus,
} from "./persist.js";
import { GEN_COPY } from "./generation-copy.js";
import { parseIntelBlock } from "./parser.js";
import { perplexityChat } from "./perplexity/client.js";
import { buildIntelScanMessages } from "./perplexity/phase-prompts.js";
import { collectMetaIntelEvents } from "./meta/collect-intel.js";
import {
  loadPremiumMetaConnection,
  premiumSupabaseConfigured,
} from "./meta/premium-connection.js";
import {
  resolveOperadorNome,
  resolvePremiumClientId,
} from "./meta/resolve-client-id.js";
import type { IntelEventInput } from "./intel-types.js";
import type { Operation } from "./types.js";

export async function runIntelScan(
  supabase: SupabaseClient,
  queued: Operation,
  env: Env,
): Promise<void> {
  const claimed = await claimOperation(supabase, queued.id, queued.job_mode);
  if (!claimed) return;

  const operationId = claimed.id;
  const scanId = randomUUID();
  console.log(`[worker][intel] Scan de inteligência — ${operationId}`);

  try {
    await setPhaseStatus(supabase, operationId, "pesquisa", "running");
    await appendPhaseLog(
      supabase,
      operationId,
      "pesquisa",
      GEN_COPY.intelStart,
    );

    const profile = await loadMethodProfile(supabase, claimed.workspace_id);

    const { data: competitors } = await supabase
      .from("competitors")
      .select("nome, url, instagram")
      .eq("operation_id", operationId);

    if (!competitors || competitors.length === 0) {
      throw new Error("Nenhum concorrente mapeado — enriqueça a concorrência antes do scan.");
    }

    const { data: recentEvents } = await supabase
      .from("intel_events")
      .select("competitor_nome, titulo, url")
      .eq("operation_id", operationId)
      .order("detected_at", { ascending: false })
      .limit(50);

    let allEvents: IntelEventInput[] = [];
    let metaInserted = 0;

    if (premiumSupabaseConfigured(env)) {
      const clientId = await resolvePremiumClientId(
        supabase,
        claimed.workspace_id,
        profile,
        env,
      );
      if (clientId) {
        const conn = await loadPremiumMetaConnection(env, clientId);
        if (conn?.pageAccessToken || conn?.accessToken) {
          await appendPhaseLog(
            supabase,
            operationId,
            "pesquisa",
            GEN_COPY.intelMeta(conn.pageName ?? conn.instagramUsername ?? "conexão ativa"),
          );
          const metaEvents = await collectMetaIntelEvents({
            conn,
            operadorNome: resolveOperadorNome(profile),
            competitors,
          });
          metaInserted = await persistIntelEvents(
            supabase,
            operationId,
            metaEvents,
            scanId,
          );
          allEvents.push(...metaEvents);
          console.log(`[worker][meta] ${metaEvents.length} eventos Meta, ${metaInserted} novos`);
        } else {
          console.warn(`[worker][meta] Cliente ${clientId} sem tokens Meta`);
        }
      } else {
        console.warn("[worker][meta] hera_premium_client_id não configurado");
      }
    }

    const { system, user } = await buildIntelScanMessages(
      claimed,
      profile,
      competitors,
      recentEvents ?? [],
    );

    let costUsd = 0;
    let perplexityEvents: IntelEventInput[] | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await perplexityChat({
        apiKey: env.PERPLEXITY_API_KEY!,
        model: env.PERPLEXITY_MODEL,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              user +
              (attempt > 1
                ? "\n\nATENÇÃO: inclua <<<HERA_INTEL>>> com JSON array válido (pode ser [])."
                : ""),
          },
        ],
      });

      costUsd += result.costUsd;
      perplexityEvents = parseIntelBlock(result.content);
      if (perplexityEvents !== null) break;
    }

    if (perplexityEvents === null) throw new Error("Bloco HERA_INTEL ausente na resposta");

    const perplexityInserted = await persistIntelEvents(
      supabase,
      operationId,
      perplexityEvents,
      scanId,
    );
    allEvents.push(...perplexityEvents);

    await appendPhaseLog(
      supabase,
      operationId,
      "pesquisa",
      `✅ Intel: Meta ${metaInserted} + Web ${perplexityInserted} novos (${allEvents.length} detectados)`,
    );

    if (costUsd) await incrementOperationCost(supabase, operationId, costUsd);
    await markOperationDone(supabase, operationId, undefined, {
      keepPhase: "blueprint",
      intelScan: true,
      restoreJobMode: true,
    });

    console.log(
      `[worker][intel] Scan concluído — ${operationId} (meta=${metaInserted}, web=${perplexityInserted})`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro no scan de inteligência";
    console.error(`[worker][intel] ${msg}`);
    await markOperationError(supabase, operationId, msg, "pesquisa");
  }
}
