export type CandidateScope = 'route' | 'file' | 'account';

export interface GateMetadata {
  id: string;
  threshold: string;
  billingDimension: string;
  scope: CandidateScope | 'mixed';
  sourceCitation?: string;
  description?: string;
}

export interface Candidate {
  kind: string;
  scope: CandidateScope;
  route?: string | null;
  hostname?: string | null;
  files: string[];
  priority: number;
  confidence: number;
  o11ySignal?: string;
  reason: string;
  question: string;
  evidence?: Record<string, unknown>;
  disqualified?: boolean;
  disqualifyReason?: string;
  warnings?: string[];
}

export interface Signals {
  metrics?: Record<string, unknown>;
  codebase?: {
    findings?: Array<Record<string, unknown>>;
    routes?: Array<Record<string, unknown>>;
  };
  project?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  stack?: Record<string, unknown>;
}
