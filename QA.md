# Wanderluster QA Checklist

Run every item before pushing. Add new cases whenever a bug is reported.

**P0** = must pass before every deploy — core functionality and security  
**P1** = run before major releases or when relevant areas change — photos, edge cases, polish

---

## P0 — Critical (run before every deploy)

---

### 1. Build

- [ ] `npm run build` exits 0 with no errors or warnings
- [ ] `dist/` contains `index.html`, `_expo/`, `assets/`
- [ ] No TypeScript errors during build

---

### 3. Login page

Regression: demo button disappeared when `__DEV__` gating was used.

- [ ] "Continue with email" card is visible
- [ ] "Try the demo" card is visible with "No account needed" subtitle
- [ ] Tapping "Try the demo" navigates to `/(app)` home screen
- [ ] Magic link field appears when "Continue with email" is tapped

---

### 4. Home screen

- [ ] "YOUR PLANS" section shows AddTile ("A Blank Folio · Throw it at me")
- [ ] "ON YOUR WISHLIST" section shows wishlist tiles (Patagonia, Kyoto, Rome, Marrakech at minimum)
- [ ] "INSPIRATION" section shows 3 tiles (Tokyo, Salzburg, Yosemite)
- [ ] Tapping a folio tile navigates to the trip detail screen
- [ ] Home screen greeting is time-appropriate ("Good morning/afternoon/evening/night")
- [ ] Greeting uses first name if set; "Maya" for demo; "Traveler" for auth-no-name

---

### 5. Wayfinder — create modal & new trip flow

Regression: Wayfinder chatted indefinitely without creating a folio; model ignored [COMPOSE:] trigger.  
Fix: client now auto-composes after 2nd user message in no-folio chat mode (model output no longer required).

- [ ] Tapping the Wayfinder dock opens the modal
- [ ] Typing in the textarea and tapping → sends the message and transitions to chat view
- [ ] After 2nd user message in chat → "Building your folio now…" appears automatically
- [ ] Folio is created and app navigates to the trip detail screen automatically
- [ ] `[COMPOSE: ...]` and `[EDIT: ...]` tags are NOT visible in the chat

---

### 6. Wayfinder — API connectivity

- [ ] On Vercel: Wayfinder chat responds (not "Connection lost")
- [ ] On Vercel: Creating a new trip via conversation produces a folio
- [ ] Error messages show actual error text (not silent or generic)

---

### 8. Trip detail — user-created folios

- [ ] Day cards render with correct date and day-of-week
- [ ] Day tabs (DAY 1 · DAY 2 …) scroll the page to the corresponding card when tapped
- [ ] Suggested events show "Suggested" badge + "+" confirm and "×" remove buttons
- [ ] Confirmed events do NOT show "+" action button
- [ ] Map address link opens Google Maps in a new browser tab (not blocked by popup blocker)
- [ ] Wayfinder opens from within the trip screen and receives folio context
- [ ] Tapping "×" on a suggested event shows a loading state then replaces it with a new suggestion
- [ ] Replacement suggestion is in the same neighbourhood as other events on that day (not a cross-city detour)
- [ ] Asking Wayfinder to add something to a specific day → gets a venue suggestion in the same area as existing events
- [ ] Asking Wayfinder to remove something → warm 1-sentence confirmation, then event is removed
- [ ] No venue ever suggested twice across the whole folio (no duplicates)

---

### 8b. Trip detail — inspiration folios (read-only)

Regression: inspiration folios showed action buttons that mutated local state.

- [ ] "INSPIRATION" badge shown (not "Folio · Draft")
- [ ] NO "+ Add to this day", NO "+" / "×" action buttons on any events
- [ ] "Plan this trip →" button visible and opens Wayfinder pre-filled

---

### 8c. Wishlist add flow

- [ ] Tapping "ADD DESTINATION / Somewhere new" opens Wayfinder in wishlist mode
- [ ] Typing a destination and tapping → calls `/api/wishlist`
- [ ] Wayfinder shows "[destination] added to your wishlist ✦" confirmation
- [ ] New wishlist tile appears on home screen

---

### 13. Supabase storage — core flows

- [ ] **Demo mode**: create a folio via Wayfinder → appears in "YOUR PLANS"
- [ ] **Demo mode**: refresh page → folio still present (localStorage)
- [ ] **Authenticated mode**: log in → home screen loads folios from Supabase
- [ ] **Sign out → sign back in**: folios/wishlist reload from Supabase correctly

---

### 14. Auth & security

- [ ] All AI routes return `401` without a valid `Authorization` header:
  ```
  curl -X POST https://<your-vercel-url>/api/wayfinder \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"hi"}],"folio":null}'
  ```
  (repeat for `/api/compose`, `/api/wishlist`, `/api/suggest`, `/api/feedback`)
- [ ] Demo users (anonymous sign-in) can still use Wayfinder — their JWT is accepted
- [ ] **End-to-end demo smoke test**: tap "Try the demo" → home loads → open Wayfinder → type a message → get a reply (not "Unauthorized" or "Connection lost")
- [ ] Supabase dashboard: confirm Anonymous sign-ins is **enabled** under Authentication → Providers before any deploy that adds auth requirements
- [ ] Security headers present on Vercel responses: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`

---

### 16. Sign-out data isolation

Regression: name and trips persisted after sign-out.

- [ ] Sign out → "Try the demo" → greeting says "Good [time], Maya." (NOT previous user's name)
- [ ] Demo mode Settings → "Your name" shows placeholder (not previous user's name)
- [ ] Demo mode home → NO previous user's folios or wishlist items visible

---

---

## P1 — Extended (run before major releases or when relevant areas change)

---

### 2. Destination photos

Regression: images go gray when Wikimedia URLs change or width mismatches.

- [ ] Verify each hardcoded URL returns HTTP 200:
  ```
  curl -sI -A "Mozilla/5.0" "<url>" | grep "^HTTP"
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

### 7. Compose / JSON robustness

- [ ] Multi-day trip (7+ days) composes without JSON parse error
- [ ] Sanitizer handles unescaped newlines and trailing commas in AI output
- [ ] `max_tokens` is 8000 in both `api/compose.ts` and `app/api/compose+api.ts`

---

### 8-detail. Trip detail — full polish

- [ ] All day cards are **always expanded** — no collapse toggle
- [ ] Tapping "+ Add to this day" opens Wayfinder pre-filled with day context
- [ ] Confirmed events show a "×" that reveals reason chooser (Incorrect data / Change of plan)
- [ ] Event details (tips/rating/location) always visible when present
- [ ] Map link text includes full address with city (not just venue name)

---

### 9. Vercel deployment config

- [ ] `vercel.json` has explicit pass-through rewrites for all `/api/*` routes before the catch-all
- [ ] Edge functions handle `OPTIONS` with `204 No Content` (CORS preflight)
- [ ] All required env vars set: `GROQ_API_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `lib/supabase.web.ts` uses `|| 'https://placeholder.supabase.co'` fallback (not `!` assertion)

---

### 10. Wayfinder — in-trip contextual mode

- [ ] Opening Wayfinder from inside a trip shows "About your [destination] trip" in the subtitle
- [ ] Asking a question gets a conversational reply — no trip update triggered
- [ ] Asking to add something triggers "Updating your [destination] trip…" then rebuilds the trip
- [ ] Adding to a specific day → suggestion is in the same neighbourhood as existing events on that day
- [ ] Removing something → Wayfinder gives a warm 1-sentence confirmation, not silence
- [ ] No duplicate venues suggested (already-booked restaurant not offered again)
- [ ] Venue suggestions include neighbourhood + brief reason (e.g. "Kyubey in Ginza, known for…")

---

### 11. Flight routing & smart transport

- [ ] Long-haul route generates `routeType: "direct"` with `routeNote` like "Direct · ~10h"
- [ ] No-direct route generates `routeType: "connecting"` naming the hub
- [ ] Short-haul within ~400km generates `kind: "transport"` (train/drive), NOT a flight
- [ ] No invented IATA codes in generated flight events
- [ ] No flight connection time shorter than 1h30 domestic / 2h international

---

### 13b. Supabase storage — full regression

- [ ] **First login**: localStorage folio migrates to Supabase (appears after reload)
- [ ] **Authenticated mode**: create folio → row appears in Supabase `folios` table
- [ ] **Authenticated mode**: add wishlist item → row appears in `wishlist_items` table
- [ ] **Authenticated mode**: update settings → row upserted in `user_settings` table
- [ ] RLS check: `curl` with anon key returns `[]` for all 3 tables (no data leakage between users)

---

### 14b. Auth & security — extended

- [ ] Rate limit: hitting `/api/compose` 11× in 10 min returns `429 Too Many Requests`
- [ ] Magic link login: entering email sends a link (Supabase dashboard confirms)
- [ ] Turnstile widget appears inline after tapping "Continue with email"
- [ ] "Send magic link" button stays disabled until Turnstile token is ready
- [ ] `googleAccessToken` is NOT written to `wl-settings` in localStorage

---

### 15. Settings — profile & account

- [ ] Settings shows correct email for signed-in user
- [ ] Tapping "Your name" expands inline input (no modal)
- [ ] Saving name shows ✓ Saved toast
- [ ] Tapping "Home city" expands inline search with live autocomplete
- [ ] Tapping "Travel preferences" expands inline chip selector + note input
- [ ] "Connect" buttons for Google Calendar / Gmail are **outlined** (ghost style, not solid black)
- [ ] "Sign out" displayed in **muted gray** (not red)
- [ ] Tapping "Sign out" navigates to `/login`

---

### 17. Home screen — greeting & avatar detail

- [ ] 05:00–11:59 → "Good morning", 12:00–16:59 → "Good afternoon", 17:00–20:59 → "Good evening", before 05:00 / after 21:00 → "Good night"
- [ ] Full name "Neha Monga" → greeting uses "Neha" (first name only)
- [ ] Top-right avatar shows first letter of name; "✦" when no name set
- [ ] Updating name in Settings reflects on Home immediately (no reload)

---

### 5b. Wayfinder — compose modes (P1)

- [ ] Tapping "Upload file" opens file picker (uses `meta-llama/llama-4-scout-17b-16e-instruct` vision model)
- [ ] Tapping "Paste link" pre-fills input with "https://" and focuses textarea
- [ ] Wayfinder dock cycles through **generic** travel prompts (not folio-specific)

---

### 12. Inspiration & Wishlist → Real Trip Conversion

- [ ] "Plan this trip" button visible on inspiration folio hero
- [ ] Tapping "Plan this trip" opens Wayfinder with destination + duration pre-filled
- [ ] After creating a trip, new folio appears in "Your Plans" on home screen

---

---

## Bug tracker

| # | Bug | Section |
|---|-----|---------|
| 1 | Destination images go gray | § 2 |
| 2 | Demo button disappeared from login | § 3 |
| 3 | "Connection lost" on Vercel and localhost | § 6 |
| 4 | JSON parse error from AI output | § 7 |
| 5 | Wayfinder chats forever, never creates folio | § 5 |
| 6 | Wikimedia 400 errors from wrong px width | § 2 |
| 7 | `supabaseUrl is required` during Vercel build | § 9 |
| 8 | Day-of-week wrong (AI was guessing) | § 8 dates |
| 9 | AI hallucinating confirmed events | § 8 suggested badge |
| 10 | Map link unresolvable (no city in address) | § 8 map address |
| 11 | Destination images missing again (tiles gray) | § 2 |
| 12 | Wayfinder never triggers folio creation (`[COMPOSE:]` ignored) | § 5 |
| 13 | Vercel compose 500 / timeout (edge fn waited on full Groq response) | § 6 |
| 14 | AI invents confirmed events user didn't provide | EVAL hallucination suite |
| 15 | Vision model 400 error (`llama-3.2-11b-vision-preview` decommissioned) | § 5 upload |
| 16 | Day cards had expand/collapse toggle — should always be open | § 8 |
| 17 | Day tabs did not scroll to correct card (`onLayout` race condition) | § 8 |
| 18 | Inspiration folio showed action buttons (×, Ask Wayfinder, +) | § 8b |
| 19 | Badge overcounted confirmed events (mock events lack `suggested` field) | § 8b |
| 20 | WayfinderDock showed folio-specific suggestions on every screen | § 4 |
| 21 | Wishlist stale messages bled between sessions (`wishlistMode` missing from dep array) | § 8c |
| 22 | Map address link not opening (Linking.openURL async; blocked by popup blocker on web) | § 8 |
| 23 | Settings name/city persisted after sign-out (localStorage not cleared on SIGNED_OUT event) | § 16 |
| 24 | Signed-in user's trips + wishlist visible in demo mode after sign-out (SIGNED_OUT not handled in folios/wishlist contexts) | § 16 |
| 25 | Home screen showed previous auth user's name in demo mode — `settings.name` read without `isAnonymous` guard | § 16, § 17 |
| 26 | `/api/suggest` called without auth headers — returned 401 silently; suggestion replaced with fallback | § 8 suggest |
| 27 | `/api/suggest` had no geographic context — replacement events ignored day area, sent traveller across the city | § 8 suggest |
