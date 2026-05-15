export type SuiteName = 'compose' | 'wayfinder' | 'hallucination' | 'drift' | 'tool-misuse';

export interface ComposeInput {
  mode: 'words' | 'link' | 'screenshots';
  input: string;
}

export interface WayfinderMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WayfinderInput {
  messages: WayfinderMessage[];
  folio?: Record<string, unknown> | null;
}

// A single scored check — fn returns true (full), false (zero), or 0–1 (partial)
export interface Check {
  name: string;
  points: number;
  fn: (parsed: unknown, raw: string) => boolean | number;
}

export interface EvalCase {
  id: string;
  suite: SuiteName;
  description: string;
  endpoint: 'compose' | 'wayfinder';
  input: ComposeInput | WayfinderInput;
  checks: Check[];
  // LLM-as-judge rubric — set judgeWeight > 0 to include judge score
  rubric?: string;
  judgeWeight?: number; // 0.0–1.0 fraction of final score from LLM judge (default 0)
}

export interface CheckResult {
  name: string;
  earned: number;
  max: number;
}

export interface EvalResult {
  caseId: string;
  suite: SuiteName;
  description: string;
  score: number; // 0–100
  passed: boolean; // score >= 70
  checks: CheckResult[];
  judgeScore?: number; // 0–10
  judgeReason?: string;
  latencyMs: number;
  timestamp: string;
  error?: string;
}

export interface BaselineEntry {
  caseId: string;
  description: string;
  score: number;
  timestamp: string;
}

export interface Regression {
  caseId: string;
  description: string;
  baselineScore: number;
  currentScore: number;
  delta: number; // negative = regression
}

export interface RunReport {
  runId: string;
  timestamp: string;
  baseUrl: string;
  totalScore: number; // mean across all cases
  totalCases: number;
  passed: number;
  failed: number;
  regressions: Regression[];
  improvements: Array<{ caseId: string; description: string; delta: number }>;
  results: EvalResult[];
}
