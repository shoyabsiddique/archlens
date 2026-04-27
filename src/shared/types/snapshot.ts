export interface StructuralSnapshot {
  id: string;
  commitSha?: string;
  capturedAt: string;
  moduleGraph: Record<string, string[]>;
  depManifest: Record<string, string>;
  patterns: Record<string, string[]>;
  apiContracts: Record<string, string>;
  languageStats: Record<string, number>;
}
