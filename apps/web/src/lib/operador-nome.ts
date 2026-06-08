import type { Operation } from "@/types/index";

export function operadorNomeFromOperation(
  operation: Operation,
  fallback = "Operador",
): string {
  const perfil = operation.operador_perfil;
  if (perfil && typeof perfil === "object" && !Array.isArray(perfil)) {
    const nome = (perfil as Record<string, unknown>).nome;
    if (typeof nome === "string" && nome.trim()) return nome.trim();
  }
  const fromPos = operation.posicionamento.split(/[—–-]/)[0]?.trim();
  return fromPos || fallback;
}
