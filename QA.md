# Wanderluster QA Checklist

Run every item before pushing. Add new cases whenever a bug is reported.

---

## 1. Build

- [ ] `npm run build` exits 0 with no errors or warnings
- [ ] `dist/` contains `index.html`, `_expo/`, `assets/`
- [ ] No TypeScript errors during build

---

## 2. Destination photos

Regression: images go gray when Unsplash IDs expire, Wikimedia width mismatches, or wrong URL format.

- [ ] Verify each hardcoded URL returns HTTP 200:
  ```
  curl -sI "<url>" | grep "^HTTP"
  ```
- [ ] **Tokyo** folio tile shows Shinjuku skyline (not gray)
- [ ] **Salzburg** folio tile shows old town aerial (not gray)
- [ ] **Yosemite** folio tile shows Tunnel View (not gray)
- [ ] **Patagonia** wishlist tile shows Torres del Paine (not gray)
- [ ] **Kyoto** wishlist tile shows Kiyomizu-dera (not gray)
- [ ] **Rome** wishlist tile shows Trevi Fountain (not gray)
- [ ] **Marrakech** wishlist tile shows Menara Gardens (not gray)
- [ ] Wikimedia URLs use `960px-` prefix (not 900px or any other untested width)

---

## 3. Login page

Regression: demo button disappeared when `__DEV__` gating was used.

- [ ] "Continue with email" card is visible
- [ ] "Try the demo" card is visible with "No account needed" subtitle
- [ ] Tapping "Try the demo" navigates to `/(app)` home screen
- [ ] Magic link field appears when "Continue with email" is tapped

---

## 4. Home screen

- [ ] "YOUR PLANS" section shows AddTile ("A Blank Folio · Throw it at me")
- [ ] "ON YOUR WISHLIST" section shows 4 tiles (Patagonia, Kyoto, Rome, Marrakech)
- [ ] "INSPIRATION" section shows 3 tiles (Tokyo, Salzburg, Yosemite)
- [ ] "PAST TRIPS" section shows 3 tiles (Rome, Kyoto, Lisbon) with past dates
- [ ] Tapping a folio tile navigates to the trip detail screen
- [ ] Wayfinder dock (bottom) is visible

---

## 5. Wayfinder — create modal & new trip flow

Regression: Wayfinder chatted indefinitely without creating a folio; model ignored [COMPOSE:] trigger.
Fix: client now auto-composes after 2nd user message in no-folio chat mode (model output no longer required).

- [ ] Tapping the Wayfinder dock opens a centered modal (not a bottom sheet)
- [ ] Modal has warm off-white (#F7F5F0) background, 20px border-radius, dark scrim behind it
- [ ] Header: compass avatar (dark circle) + "Wayfinder" / "Your AI travel concierge" + × close button
- [ ] Thin divider separates header from body
- [ ] Body shows "Where do you want to go?" heading + subtext
- [ ] Textarea is visible with placeholder text ("Paris in spring, maybe…")
- [ ] 3-button row: "Upload file" | "Paste link" | → send arrow — all equal height, 10px radius
- [ ] Footer shows lock icon + "Your uploads are only used to plan your trip."
- [ ] Tapping × or the scrim closes the modal
- [ ] Typing in the textarea and tapping → sends the message and transitions to chat view
- [ ] Tapping "Upload file" opens file picker and shows selected file chip
- [ ] Tapping "Paste link" pre-fills input with "https://" and focuses textarea
- [ ] After 2nd user message in chat → "Building your folio now…" appears automatically
- [ ] Folio is created and app navigates to the trip detail screen automatically
- [ ] `[COMPOSE: ...]` tag is NOT visible in the chat — stripped from display if model outputs it

---

## 6. Wayfinder — API connectivity

Regression: "Connection lost" on both localhost and Vercel due to routing issues and silent catch blocks.

- [ ] On dev server (`npm run web`): curl test passes:
  ```
  curl -X POST http://localhost:8082/api/wayfinder \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"Hello"}],"folio":null}'
  ```
- [ ] On dev server: curl test for compose passes:
  ```
  curl -X POST http://localhost:8082/api/compose \
    -H "Content-Type: application/json" \
    -d '{"mode":"words","input":"5 days in Tokyo"}'
  ```
- [ ] On Vercel: Wayfinder chat responds (not "Connection lost")
- [ ] On Vercel: Creating a new trip via conversation produces a folio
- [ ] Error messages show actual error text (not silent or generic "Something went wrong")

---

## 7. Compose / JSON robustness

Regression: AI returns malformed JSON (unescaped newlines/quotes, trailing commas) causing parse failure.

- [ ] Multi-day trip (7+ days) composes without JSON parse error
- [ ] Sanitizer handles unescaped newlines in string values
- [ ] Sanitizer handles trailing commas before `]` or `}`
- [ ] `max_tokens` is 8000 in both `api/compose.ts` and `app/api/compose+api.ts`
- [ ] Both compose endpoints stream the response (`stream: true` in Groq call, `Content-Type: text/plain` in response)

---

## 8. Trip detail screen

- [ ] Hero image shows for known destinations (Tokyo, Salzburg, Yosemite)
- [ ] Day cards render with correct date and day-of-week
- [ ] Suggested events show "Suggested" badge
- [ ] Confirmed events (user-provided) do NOT show "Suggested" badge
- [ ] Expanding an event shows tips / map link
- [ ] Map link contains full address including city (not just venue name)
- [ ] Wayfinder opens from within the trip screen and has folio context

---

## 9. Vercel deployment

Regression: catch-all rewrite intercepted `/api/*` routes; negative-lookahead regex unreliable.

- [ ] `vercel.json` has explicit pass-through rewrites for `/api/compose`, `/api/wayfinder`, `/api/suggest`, `/api/feedback` BEFORE the `/(.*) → /index.html` catch-all
- [ ] Edge functions handle `OPTIONS` with `204 No Content` (CORS preflight)
- [ ] `GROQ_API_KEY` is set in Vercel Environment Variables
- [ ] `EXPO_PUBLIC_SUPABASE_URL` is set in Vercel Environment Variables
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` is set in Vercel Environment Variables
- [ ] `lib/supabase.web.ts` uses `|| 'https://placeholder.supabase.co'` fallback (not `!` assertion)

---

## 11. Wayfinder — in-trip contextual mode

- [ ] Opening Wayfinder from inside a trip shows "About your [destination] trip" in the header subtitle (not "Your AI travel concierge")
- [ ] Header subtitle shows "Editing your folio" when editMode is true
- [ ] Asking a question (e.g. "what's the weather like in Tokyo in spring?") gets a conversational reply — no trip update is triggered, no `[EDIT:]` in reply
- [ ] Asking to add something (e.g. "add a sushi dinner on Day 2") gets a 1–2 sentence confirmation reply, then "Updating your [destination] trip…" appears
- [ ] After the update message, the trip is rebuilt and the updated itinerary is visible without reopening the screen
- [ ] Suggestions shown in folio mode are specific to the trip's destination city (not generic)
- [ ] If any days have no food events, "Find a dinner option for Day X" appears as a suggestion for the first such day
- [ ] Tapping "I'd like to change..." pre-fills the input with "I'd like to change " and focuses the input — it does NOT send immediately
- [ ] `[EDIT: ...]` tag is never visible in the chat UI — stripped from the displayed reply
- [ ] `[COMPOSE:]` tag is never visible in the chat UI — stripped from the displayed reply
- [ ] Wayfinder suggestions are destination-specific and not recycled from the no-folio state

---

## 12. Flight routing & smart transport

- [ ] Creating a trip with a realistic long-haul route (e.g. Seattle → Tokyo) generates a flight event with `routeType: "direct"` and `routeNote` like "Direct · ~10h"
- [ ] Creating a trip with no direct service (e.g. Seattle → Dubrovnik) generates a connecting flight with `routeType: "connecting"` and `routeNote` naming the hub (e.g. "Via Frankfurt · ~14h")
- [ ] Short-haul trip within ~400km (e.g. Paris → Amsterdam) generates a `kind: "transport"` event (train/drive), NOT a flight
- [ ] Suggested flight events show "Verify before booking" label in the trip detail view
- [ ] Confirmed (user-provided) flight events do NOT show "Verify before booking"
- [ ] `routeNote` is displayed on flight events: "→" for direct, "⤳" for connecting, "≈" for surface
- [ ] Wayfinder asked "how do I get from Seattle to Dubrovnik?" responds with connecting route via a real hub, mentions no direct service
- [ ] Wayfinder asked "can I fly direct from London to New York?" confirms direct service exists on major carriers
- [ ] Wayfinder asked about a short drive/train route proactively suggests surface transport with duration
- [ ] No invented IATA codes appear in any generated flight events
- [ ] No flight event has a connection time shorter than 1h30 (domestic) or 2h (international)

---

## 10. Reported bugs tracker

Add every bug reported by the user here so it gets a regression test.

| # | Bug | Test |
|---|-----|------|
| 1 | Destination images go gray | § 2 photo checks |
| 2 | Demo button disappeared from login | § 3 login checks |
| 3 | "Connection lost" on Vercel and localhost | § 6 API connectivity |
| 4 | JSON parse error from AI output | § 7 compose checks |
| 5 | Wayfinder chats forever, never creates folio | § 5 new trip flow |
| 6 | Wikimedia 400 errors from wrong px width | § 2 photo checks |
| 7 | `supabaseUrl is required` during Vercel build | § 9 Vercel checks |
| 8 | Day-of-week wrong (AI was guessing) | § 8 day card dates |
| 9 | AI hallucinating confirmed events | § 8 suggested badge |
| 10 | Map link unresolvable (no city in address) | § 8 map address |
| 11 | Destination images missing again (tiles gray) | § 2 photo checks |
| 12 | Wayfinder never triggers folio creation (model ignores `[COMPOSE:]`) | § 5 new trip flow |
| 13 | Vercel compose returns 500 / timeout (edge function waited on full Groq response) | § 6 API, EVAL § 6 Test M |
| 14 | AI invents confirmed hotels/restaurants (`suggested: false`) user didn't provide | EVAL.md § 1 Tests A–D |
| 15 | Vercel compose returns 500 / timeout (edge function waited on full Groq response) | § 6 API, EVAL § 6 Test M |
| 16 | Wayfinder create screen showed generic suggestions instead of input options | § 5 create options checks |
