import Groq from 'groq-sdk';
import type { EvalCase, EvalResult, RunReport, SuiteName } from './types';
import { scoreCase } from './scorer';
import { loadBaseline, compareToBaseline, saveLatest, saveBaseline } from './baseline';

// All suites — import here to keep index.ts thin
import { hallucinationCases } from './suites/hallucination';
import { driftCases } from './suites/drift';
import { toolMisuseCases } from './suites/tool-misuse';
import { composeCases } from './suites/compose';
import { wayfinderCases } from './suites/wayfinder';

const ALL_CASES: EvalCase[] = [
  ...hallucinationCases,
  ...driftCases,
  ...toolMisuseCases,
  ...composeCases,
  ...wayfinderCases,
];

export interface RunOptions {
  suite?: SuiteName | 'all';
  baseUrl?: string;
  updateBaseline?: boolean;
  concurrency?: number;
}

export async function run(opts: RunOptions = {}): Promise<RunReport> {
  const {
    suite = 'all',
    baseUrl = process.env.EVAL_BASE_URL ?? 'http://localhost:8082',
    updateBaseline = false,
    concurrency = 3,
  } = opts;

  const cases = suite === 'all'
    ? ALL_CASES
    : ALL_CASES.filter(c => c.suite === suite);

  if (cases.length === 0) {
    throw new Error(`No cases found for suite "${suite}". Valid: all, hallucination, drift, tool-misuse, compose, wayfinder`);
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const runId = `run-${Date.now()}`;
  const timestamp = new Date().toISOString();

  console.log(`\nWanderluster Evals — ${timestamp}`);
  console.log(`Suite: ${suite} | Cases: ${cases.length} | Base URL: ${baseUrl}\n`);

  // Run with limited concurrency to avoid hammering the API
  const results: EvalResult[] = [];
  for (let i = 0; i < cases.length; i += concurrency) {
    const batch = cases.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async c => {
        process.stdout.write(`  [${String(results.length + batch.indexOf(c) + 1).padStart(2)}/${cases.length}] ${c.id}… `);
        const result = await scoreCase(c, baseUrl, groq);
        const icon = result.error ? '✗' : result.passed ? '✓' : '~';
        console.log(`${icon} ${result.score}/100 (${result.latencyMs}ms)`);
        return result;
      })
    );
    results.push(...batchResults);
  }

  const baseline = loadBaseline();
  const { regressions, improvements } = compareToBaseline(results, baseline);

  const totalScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  const report: RunReport = {
    runId,
    timestamp,
    baseUrl,
    totalScore,
    totalCases: results.length,
    passed,
    failed,
    regressions,
    improvements,
    results,
  };

  saveLatest(report);
  if (updateBaseline) saveBaseline(results);

  return report;
}
