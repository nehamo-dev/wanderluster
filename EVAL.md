# AI Output Evaluations

Structured test cases for catching model hallucinations and regressions in Wanderluster's AI outputs.

## Running evals

```bash
# All suites vs localhost dev server
npm run eval

# One suite
npm run eval:suite hallucination

# After a major prompt change — update the baseline
npm run eval:baseline

# Against Vercel production
EVAL_BASE_URL=https://wanderluster.vercel.app npm run eval:prod
```

Results are saved to `evals/results/latest.json`. GitHub Actions runs nightly at 2am UTC and fails the build if any case regresses by >10 points vs `evals/results/baseline.json`.

**Suites:** `hallucination` · `drift` · `tool-misuse` · `compose` · `wayfinder`

---

Run these manually before deploying changes to `api/compose.ts` or `api/wayfinder.ts`.

---

## 1. Hallucination — Confirmed events the user didn't provide

**The bug:** Model marks events `suggested: false` (confirmed) even though the user never mentioned them. This creates a false impression that a hotel or restaurant was booked.

**Rule in prompt:**  
> `suggested: false` ONLY for things the user explicitly provided: a specific flight number, hotel name they booked, restaurant reservation, confirmed activity. Everything else MUST be `suggested: true`.

### Test A — Bare city + duration (no specifics)

**Input:**
```
5 days in Tokyo, Japan. Culture and food. Late March.
```

**Pass criteria:**
- [ ] Every `event.suggested` is `true`
- [ ] No `event.kind === "hotel"` with `suggested: false`
- [ ] No `event.kind === "flight"` with `suggested: false`
- [ ] No `event.kind === "food"` with `suggested: false`

**Fail example:** Model outputs `"title": "Park Hyatt Tokyo", "suggested": false` — user never mentioned this.

---

### Test B — User provides a flight, nothing else

**Input:**
```
I have a flight BA016 LHR→NRT arriving March 25, and I want 7 days in Japan.
```

**Pass criteria:**
- [ ] Exactly one event with `suggested: false`: the flight `BA016`
- [ ] All hotels, restaurants, activities are `suggested: true`
- [ ] Flight title contains `BA016` and/or `LHR` and `NRT`

**Fail example:** Model adds a confirmed hotel check-in for Day 1 with `suggested: false`.

---

### Test C — User provides flight + hotel

**Input:**
```
Flights: AA87 JFK→CDG departs June 10. Staying at Hotel Le Marais, Paris. 5 nights.
```

**Pass criteria:**
- [ ] `AA87` event has `suggested: false`
- [ ] `Hotel Le Marais` event has `suggested: false`
- [ ] All other events are `suggested: true`
- [ ] Model does NOT invent a second hotel

**Fail example:** Model also adds `"Hotel des Arts", suggested: false` for a later night.

---

### Test D — User provides a restaurant reservation

**Input:**
```
5 days in Paris. I have dinner booked at Guy Savoy on June 12 at 8pm.
```

**Pass criteria:**
- [ ] `Guy Savoy` event on Day 3 (or whatever day June 12 falls) has `suggested: false`
- [ ] All other food events are `suggested: true`
- [ ] `Guy Savoy` event has `time: "20:00"`

---

## 2. Date accuracy

**The bug:** Model invents day-of-week labels instead of calculating from the calendar.

**Rule in prompt:**  
> Calculate the correct day of week using today's date. Format: "Mon · Mar 10".

### Test E — Specific dates given

**Input:**
```
New York City, September 15–20 2026.
```

**Pass criteria:**
- [ ] Sep 15 2026 = Tuesday — Day 1 date shows `Tue · Sep 15`
- [ ] Sep 20 2026 = Sunday — Last day shows `Sun · Sep 20`
- [ ] No day shows wrong weekday abbreviation

**Quick check:**
```
node -e "console.log(new Date(2026,8,15).toLocaleDateString('en-US',{weekday:'short'}))"
# → Tue
```

---

### Test F — Relative duration (no dates given)

**Input:**
```
7 days in Kyoto, Japan. Spring. Cherry blossom season.
```

**Pass criteria:**
- [ ] Dates are in the future relative to today
- [ ] Day-of-week labels are internally consistent (if Day 1 is Monday, Day 2 is Tuesday)
- [ ] Duration matches 7 days exactly

---

## 3. Location specificity (map links)

**The bug:** Events omit city or use vague location strings that don't resolve in Google Maps.

**Rule in prompt:**  
> `location`: full address sufficient to resolve in Google Maps — include street, neighbourhood, and city.

### Test G — Location field quality

For any compose output, spot-check 3 random `location` fields:

**Pass criteria:**
- [ ] Location includes city name
- [ ] Location is specific enough to paste into Google Maps and find the right place
- [ ] No location is just a venue name without address (e.g., `"Narisawa"` alone → FAIL; `"Narisawa, 2-6-15 Minami Aoyama, Minato-ku, Tokyo"` → PASS)
- [ ] Flights have no `location` field (or it's omitted)

---

## 4. JSON validity and structure

**The bug:** Model outputs malformed JSON (unescaped newlines, trailing commas) or truncates output mid-object.

### Test H — JSON parses without sanitizer

```bash
curl -s -X POST https://<vercel-url>/api/compose \
  -H "Content-Type: application/json" \
  -d '{"mode":"words","input":"7 days in Barcelona, Spain. Food and architecture. Solo. Late June."}' \
  --max-time 60 | python3 -c "import sys,json; d=sys.stdin.read(); json.loads(d); print('PASS: valid JSON', len(d), 'chars')"
```

**Pass criteria:**
- [ ] `python3 json.loads()` succeeds without error
- [ ] Response contains `destination`, `days`, and at least 5 day objects
- [ ] No day has 0 events

---

### Test I — Long trip doesn't truncate

**Input:**
```
10 days in Japan: Tokyo (5 nights), Kyoto (3 nights), Osaka (2 nights). Fly in March 20, fly out March 30. Flight: JL044.
```

**Pass criteria:**
- [ ] All 10 days present in `days` array
- [ ] JSON closes properly (final `}` present, not truncated mid-string)
- [ ] `max_tokens` is 8000 in both `api/compose.ts` and `app/api/compose+api.ts`

---

## 5. Wayfinder conversation quality

### Test J — 3 questions in first reply

Open Wayfinder with no folio. Type:
```
I want to plan a trip
```

**Pass criteria:**
- [ ] Wayfinder asks at least 2 questions in its FIRST reply (destination, dates, vibe etc.)
- [ ] Wayfinder does NOT say "I'll create a folio now" or describe the trip without asking
- [ ] Wayfinder does NOT ask more than 1 question at a time across multiple messages before composing

---

### Test K — Folio created after 2nd user message

After Wayfinder asks questions (Test J), answer them:
```
Lisbon, 5 days in October, culture and food, solo, moderate budget
```

**Pass criteria:**
- [ ] Chat shows "Building your folio now…" within 1–2 seconds of sending
- [ ] App navigates to the trip detail screen automatically
- [ ] Folio destination matches "Lisbon"
- [ ] No error message appears

---

### Test L — Wayfinder with folio loaded does NOT trigger compose

Open a Tokyo folio. Open Wayfinder (which now has folio context). Ask:
```
What's the best ramen in Tokyo?
```

**Pass criteria:**
- [ ] Wayfinder gives a concise answer about ramen
- [ ] No "Building your folio…" message appears
- [ ] App does NOT navigate away from the trip screen

---

## 6. Streaming / Vercel reliability

### Test M — Compose works on Vercel (not just localhost)

```bash
curl -s -X POST https://<vercel-url>/api/compose \
  -H "Content-Type: application/json" \
  -d '{"mode":"words","input":"5 days in Porto, Portugal. Wine and food."}' \
  --max-time 60 \
  -w "\n\nStatus: %{http_code} | Time: %{time_total}s"
```

**Pass criteria:**
- [ ] HTTP 200 (not 500 or timeout)
- [ ] Response contains valid folio JSON
- [ ] Completes within 60 seconds
- [ ] `Content-Type: text/plain` (streaming mode, not buffered JSON)

---

## 7. Response drift

**The bug:** The model changes its reply style, length, or tone between runs of the same prompt — producing 2 questions on one run, 5 on another, or switching from concise to verbose.

**Fix in prompt:** Added STYLE CONSISTENCY section to wayfinder system prompt. Added CONSISTENCY rule to compose prompts.

| Test | What drifts | Pass condition |
|------|-------------|----------------|
| `drift-a` | Question count in first wayfinder reply | Always 2–4 `?` marks |
| `drift-b` | Response length + no COMPOSE with folio | All 3 runs under 120 words, no COMPOSE |
| `drift-c` | Compose day count | Always exactly 7 days for 7-day input |

---

## 8. Tool misuse

**The bug:** The model outputs `[COMPOSE:]` in contexts where it shouldn't — when a folio is already loaded, in response to a simple Q&A question, or after only one vague message.

**Fix in prompt:** Added TOOL MISUSE section to wayfinder system prompt with explicit prohibition rules.

| Test | Misuse scenario | Pass condition |
|------|-----------------|----------------|
| `tm-a` | Day 4 question with folio loaded | No `[COMPOSE:]`, answer references Day 4 |
| `tm-b` | Visa question, no folio | No `[COMPOSE:]`, answers the question |
| `tm-c` | Vague "I want to travel" (first message) | No `[COMPOSE:]`, asks ≥2 questions |
| `tm-d` | Compose with bare "Japan" input | Returns parseable folio, no crash |
| `tm-e` | Specific phone number question | Doesn't invent a number, suggests where to look |

---

## 9. Reported hallucinations tracker

Add every user-reported hallucination here:

| # | Description | Prompt change | Test |
|---|-------------|---------------|------|
| 1 | Model adds hotels with `suggested: false` when user didn't book any | Added "NEVER invent confirmed bookings" to prompt | Test A, B |
| 2 | Day-of-week wrong (AI guessing instead of calculating) | Added `correctDates()` post-processing + explicit prompt instruction | Test E, F |
| 3 | AI marking AI-invented restaurants as confirmed (`suggested: false`) | Strengthened CRITICAL rule in system prompt | Test C, D |
| 4 | Events have vague locations (just venue name, no city/address) | Added location format requirement to prompt | Test G |
| 5 | Compose endpoint 500/timeout on Vercel (full Groq response buffered in edge function) | Switched to `stream: true`, forwarding tokens in real-time | Test M |
