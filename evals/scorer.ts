import Groq from 'groq-sdk';
import type { EvalCase, EvalResult, CheckResult } from './types';
import { DRIFT_RUNS } from './suites/drift';

const JUDGE_MODEL = 'llama-3.3-70b-versatile';

// Score a single case: runs deterministic checks + optional LLM judge.
// For drift cases, runs the endpoint DRIFT_RUNS times and passes all
// responses as a JSON array in `raw` for the checks to compare.
export async function scoreCase(
  evalCase: EvalCase,
  baseUrl: string,
  groq: Groq,
): Promise<EvalResult> {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const isDrift = evalCase.suite === 'drift';
    const runs = isDrift ? DRIFT_RUNS : 1;

    // Collect raw responses
    const raws: string[] = [];
    for (let i = 0; i < runs; i++) {
      const raw = await callEndpoint(evalCase, baseUrl);
      raws.push(raw);
      if (runs > 1 && i < runs - 1) await sleep(1500); // avoid rate-limiting
    }

    // For drift: checks receive a JSON array of all runs as `raw`
    const raw = isDrift ? JSON.stringify(raws) : raws[0];

    let parsed: unknown = null;
    try { parsed = JSON.parse(isDrift ? raws[0] : raw); } catch {}

    // Run deterministic checks
    const checkResults: CheckResult[] = evalCase.checks.map(check => {
      let result: boolean | number = false;
      try { result = check.fn(parsed, raw); } catch {}
      const fraction = typeof result === 'boolean' ? (result ? 1 : 0) : Math.max(0, Math.min(1, result));
      return { name: check.name, earned: Math.round(check.points * fraction), max: check.points };
    });

    const deterministicMax = checkResults.reduce((s, c) => s + c.max, 0);
    const deterministicEarned = checkResults.reduce((s, c) => s + c.earned, 0);
    const deterministicScore = deterministicMax > 0 ? deterministicEarned / deterministicMax : 0;

    // LLM judge (if rubric + judgeWeight set)
    let judgeScore: number | undefined;
    let judgeReason: string | undefined;
    const judgeWeight = evalCase.judgeWeight ?? 0;

    if (evalCase.rubric && judgeWeight > 0) {
      const judged = await runJudge(evalCase.rubric, isDrift ? raws[0] : raw, groq);
      judgeScore = judged.score;
      judgeReason = judged.reason;
    }

    // Combine scores
    const jw = (evalCase.rubric && judgeWeight > 0 && judgeScore !== undefined) ? judgeWeight : 0;
    const rawScore = jw > 0
      ? deterministicScore * (1 - jw) + (judgeScore! / 10) * jw
      : deterministicScore;

    const score = Math.round(rawScore * 100);

    return {
      caseId: evalCase.id,
      suite: evalCase.suite,
      description: evalCase.description,
      score,
      passed: score >= 70,
      checks: checkResults,
      judgeScore,
      judgeReason,
      latencyMs: Date.now() - start,
      timestamp,
    };
  } catch (err: any) {
    return {
      caseId: evalCase.id,
      suite: evalCase.suite,
      description: evalCase.description,
      score: 0,
      passed: false,
      checks: [],
      latencyMs: Date.now() - start,
      timestamp,
      error: err?.message ?? String(err),
    };
  }
}

async function callEndpoint(evalCase: EvalCase, baseUrl: string): Promise<string> {
  const url = `${baseUrl}/api/${evalCase.endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evalCase.input),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${evalCase.endpoint}`);

  // Accumulate streamed or buffered response
  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) text += decoder.decode(value, { stream: true });
    }
    return text.trim();
  }
  return (await res.text()).trim();
}

async function runJudge(rubric: string, response: string, groq: Groq): Promise<{ score: number; reason: string }> {
  try {
    const completion = await groq.chat.completions.create({
      model: JUDGE_MODEL,
      max_tokens: 100,
      stream: false,
      messages: [
        {
          role: 'system',
          content: 'You are an AI evaluator. Output only valid JSON with fields "score" (integer 0-10) and "reason" (one sentence).',
        },
        {
          role: 'user',
          content: `RUBRIC: ${rubric}\n\nRESPONSE TO EVALUATE:\n${response.slice(0, 1500)}`,
        },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? '{"score":5,"reason":"no judge output"}';
    const parsed = JSON.parse(text);
    return {
      score: Math.max(0, Math.min(10, Number(parsed.score) || 5)),
      reason: String(parsed.reason ?? ''),
    };
  } catch {
    return { score: 5, reason: 'judge error — defaulting to neutral' };
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
