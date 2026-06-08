import type { Operation } from "./types.js";

export type OperadorTipo = "agencia" | "saas_b2b";

export function resolveOperadorTipo(operation: Operation): OperadorTipo {
  if (operation.operador_tipo === "saas_b2b") return "saas_b2b";
  const perfil = operation.operador_perfil;
  if (perfil?.tipo === "saas_b2b") return "saas_b2b";
  return "agencia";
}

export function isSaasB2B(operation: Operation): boolean {
  return resolveOperadorTipo(operation) === "saas_b2b";
}
