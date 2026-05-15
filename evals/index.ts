#!/usr/bin/env node
// Wanderluster eval CLI
//
// Usage:
//   npx tsx evals/index.ts                       # all suites vs localhost
//   npx tsx evals/index.ts --suite hallucination  # one suite
//   npx tsx evals/index.ts --update-baseline      # save results as new baseline
//   npx tsx evals/index.ts --json                 # machine-readable output
//   EVAL_BASE_URL=https://my-app.vercel.app npx tsx evals/index.ts

import { run } from './runner';
import type { SuiteName } from './types';

const args = process.argv.slice(2);

function flag(name: string): boolean {
  return args.includes(`--${name}`);
}
function param(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const suite = (param('suite') ?? 'all') as SuiteName | 'all';
const updateBaseline = flag('update-baseline');
const jsonOutput = flag('json');
const baseUrl = param('base-url') ?? process.env.EVAL_BASE_URL;

if (!process.env.GROQ_API_KEY) {
  console.error('Error: GROQ_API_KEY environment variable is required');
  process.exit(1);
}

run({ suite, updateBaseline, ...(baseUrl ? { baseUrl } : {}) })
  .then(report => {
    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.regressions.length > 0 ? 1 : 0);
    }

    // Human-readable summary
    console.log('\n' + '─'.repeat(60));
    console.log(`Score: ${report.totalScore}/100  |  ${report.passed} passed / ${report.failed} failed`);

    if (report.regressions.length > 0) {
      console.log('\n⚠  Regressions detected:');
      for (const r of report.regressions) {
        console.log(`   ${r.caseId}: ${r.baselineScore} → ${r.currentScore} (${r.delta})`);
      }
    }

    if (report.improvements.length > 0) {
      console.log('\n↑  Improvements:');
      for (const i of report.improvements) {
        console.log(`   ${i.caseId}: +${i.delta}`);
      }
    }

    // Per-case detail
    console.log('\n' + '─'.repeat(60));
    for (const result of report.results) {
      const icon = result.error ? '✗' : result.passed ? '✓' : '~';
      console.log(`${icon} [${result.suite}] ${result.caseId}: ${result.score}/100`);
      if (!result.passed || result.error) {
        for (const c of result.checks) {
          if (c.earned < c.max) {
            console.log(`    · FAIL ${c.name}: ${c.earned}/${c.max}`);
          }
        }
        if (result.judgeReason) console.log(`    · judge: ${result.judgeReason}`);
        if (result.error) console.log(`    · error: ${result.error}`);
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`Results saved to evals/results/latest.json`);
    if (updateBaseline) console.log('Baseline updated.');

    process.exit(report.regressions.length > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Eval runner error:', err);
    process.exit(1);
  });
