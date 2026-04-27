export type DriftEventType =
  | "dependency_added"
  | "dependency_removed"
  | "pattern_introduced"
  | "pattern_abandoned"
  | "contract_broken"
  | "boundary_crossed"
  | "adr_orphaned"
  | "structural_conflict";

export type DriftSeverity = "info" | "warning" | "error";
export type DriftEventSeverity = DriftSeverity;

export interface DriftEvent {
  id: string;
  detectedAt: string;
  type: DriftEventType;
  severity: DriftSeverity;
  adrId?: string;
  description: string;
  affectedPaths: string[];
  resolved: boolean;
}
