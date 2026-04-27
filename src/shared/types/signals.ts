export type SignalType =
  | "dependency_added"
  | "dependency_removed"
  | "new_module"
  | "api_contract_changed"
  | "schema_changed"
  | "import_graph_changed";

export interface Author {
  name: string;
  email: string;
  role: "author" | "co-author";
}

export interface ChangeSignal {
  type: SignalType;
  affectedPaths: string[];
  diff: string;
  commitSha: string;
  commitMessage: string;
  timestamp: string;
  authors: Author[];
  agentName?: string;
}
