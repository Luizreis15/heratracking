import type { Blueprint, Competitor, Operation, OperationMetric, PhaseEvent } from "@/types/index";
import type { Json } from "@/types/index";

export type OperationContext = {
  operation: Operation;
  phaseEvents: PhaseEvent[];
  phaseMap: Map<string, PhaseEvent>;
  blueprint: Blueprint | null;
  sections: Record<string, Json>;
  competitors: Competitor[];
  currentMonthMetrics: OperationMetric | null;
  operationId: string;
  isLoading: boolean;
};
