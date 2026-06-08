import type { Database } from "./database";

export type { Database } from "./database";
export type { Json } from "./database";

// Row types — convenência para não digitar Database["public"]["Tables"]["x"]["Row"]
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
export type MethodProfile = Database["public"]["Tables"]["method_profiles"]["Row"];
export type Operation = Database["public"]["Tables"]["operations"]["Row"];
export type PhaseEvent = Database["public"]["Tables"]["phase_events"]["Row"];
export type Blueprint = Database["public"]["Tables"]["blueprints"]["Row"];
export type Competitor = Database["public"]["Tables"]["competitors"]["Row"];
export type OperationMetric = Database["public"]["Tables"]["operation_metrics"]["Row"];
export type IntelEvent = Database["public"]["Tables"]["intel_events"]["Row"];
export type ComparisonReport = Database["public"]["Tables"]["comparison_reports"]["Row"];
export type Export_ = Database["public"]["Tables"]["exports"]["Row"];

// Insert types
export type OperationInsert = Database["public"]["Tables"]["operations"]["Insert"];
