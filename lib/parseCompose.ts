// Shared between api/compose.ts and WayfinderSheet (client-side).
// Pure JS only — no Node.js APIs so it runs in both edge and browser contexts.

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function correctDates(folio: any): any {
  if (!Array.isArray(folio.days)) return folio;
  const now = new Date();
  folio.days = folio.days.map((day: any) => {
    if (!day.date) return day;
    const m = day.date.match(/([A-Z][a-z]{2})\s+(\d{1,2})/);
    if (!m) return day;
    const month = MONTHS[m[1]];
    if (month === undefined) return day;
    const dayNum = parseInt(m[2], 10);
    const year = new Date(now.getFullYear(), month, dayNum) < now
      ? now.getFullYear() + 1 : now.getFullYear();
    const d = new Date(year, month, dayNum);
    return { ...day, date: `${DAY_NAMES[d.getDay()]} · ${m[1]} ${m[2]}` };
  });
  return folio;
}

export function sanitizeJSON(s: string): string {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\' && inStr) { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr) {
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
    }
    out += ch;
  }
  return out.replace(/,(\s*[\]}])/g, '$1');
}

export function extractAndParseFolio(raw: string): any {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in response');
  const candidate = stripped.slice(start, end + 1);
  try { return correctDates(JSON.parse(candidate)); } catch {}
  try { return correctDates(JSON.parse(sanitizeJSON(candidate))); } catch (e: any) {
    throw new Error(`Malformed JSON from model: ${e.message}`);
  }
}
