import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  POLL_INTERVAL_MS: z.coerce.number().default(5000),
});

function loadEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.warn("[worker] Variáveis de ambiente ausentes ou inválidas:");
    const flat = result.error.flatten().fieldErrors;
    for (const [field, errors] of Object.entries(flat)) {
      console.warn(`  ${field}: ${errors?.join(", ")}`);
    }
    console.warn("[worker] Copie apps/worker/.env.example para apps/worker/.env e preencha os valores.");
    return null;
  }
  return result.data;
}

async function main() {
  console.log("[worker] HERA Arquiteto worker iniciado — F0 scaffold");

  const env = loadEnv();
  if (!env) {
    console.log("[worker] Modo sem env — aguardando configuração.");
    return;
  }

  console.log(`[worker] Supabase URL: ${env.SUPABASE_URL}`);
  console.log("[worker] Aguardando jobs na fila... (F4 implementa o loop real)");
  // F4 implementará: loop de poll → pega operations(queued) → roda skill via Agent SDK
}

main().catch((err: unknown) => {
  console.error("[worker] Erro fatal:", err);
  process.exit(1);
});
