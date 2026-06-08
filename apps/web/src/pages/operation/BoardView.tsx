import { useOutletContext } from "react-router-dom";
import { PhaseBoard } from "@/components/operation/PhaseBoard";
import type { OperationContext } from "./operation-context";

export function BoardView() {
  const { operation, phaseMap, sections, competitors, currentMonthMetrics, operationId } =
    useOutletContext<OperationContext>();

  return (
    <PhaseBoard
      operation={operation}
      phaseMap={phaseMap}
      sections={sections}
      competitorCount={competitors.length}
      currentMonthMetrics={currentMonthMetrics}
      operationId={operationId}
    />
  );
}
