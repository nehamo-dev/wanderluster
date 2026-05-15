import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { BaselineEntry, EvalResult, Regression, RunReport } from './types';

const BASELINE_PATH = join(import.meta.dirname, 'results', 'baseline.json');
const RESULTS_PATH = join(import.meta.dirname, 'results', 'latest.json');

const REGRESSION_THRESHOLD = 10; // points drop to flag as regression

export function loadBaseline(): BaselineEntry[] {
  if (!existsSync(BASELINE_PATH)) return [];
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveBaseline(results: EvalResult[]): void {
  const entries: BaselineEntry[] = results.map(r => ({
    caseId: r.caseId,
    description: r.description,
    score: r.score,
    timestamp: r.timestamp,
  }));
  writeFileSync(BASELINE_PATH, JSON.stringify(entries, null, 2));
  console.log(`Baseline saved: ${BASELINE_PATH}`);
}

export function saveLatest(report: RunReport): void {
  writeFileSync(RESULTS_PATH, JSON.stringify(report, null, 2));
}

export function compareToBaseline(
  results: EvalResult[],
  baseline: BaselineEntry[],
): {
  regressions: Regression[];
  improvements: RunReport['improvements'];
} {
  const regressions: Regression[] = [];
  const improvements: RunReport['improvements'] = [];

  for (const result of results) {
    const base = baseline.find(b => b.caseId === result.caseId);
    if (!base) continue;

    const delta = result.score - base.score;
    if (delta <= -REGRESSION_THRESHOLD) {
      regressions.push({
        caseId: result.caseId,
        description: result.description,
        baselineScore: base.score,
        currentScore: result.score,
        delta,
      });
    } else if (delta >= REGRESSION_THRESHOLD) {
      improvements.push({
        caseId: result.caseId,
        description: result.description,
        delta,
      });
    }
  }

  return { regressions, improvements };
}
