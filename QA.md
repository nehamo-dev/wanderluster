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

## 3. Login page

Regression: demo button disappeared when `__DEV__` gating was used.

- [ ] "Continue with email" card is visible
- [ ] "Try the demo" card is visible with "No account needed" subtitle
- [ ] Tapping "Try the demo" navigates to `/(app)` home screen
- [ ] Magic link field appears when "Continue with email" is tapped

---

## 4. Home screen

- [ ] "YOUR PLANS" section shows AddTile ("A Blank Folio · Throw it at me")
- [ ] "ON YOUR WISHLIST" section shows wishlist tiles (Patagonia, Kyoto, Rome, Marrakech at minimum)
- [ ] "ADD DESTINATION / Somewhere new" tile appears at end of wishlist row
- [ ] "INSPIRATION" section shows 3 tiles (Tokyo, Salzburg, Yosemite)
- [ ] "PAST TRIPS" section shows 3 tiles (Rome, Kyoto, Lisbon) with past dates
- [ ] Tapping a folio tile navigates to the trip detail screen
- [ ] Wayfinder dock (bottom) cycles through **generic** travel prompts (not folio-specific)

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
- [ ] Tapping "Upload file" opens file picker (uses `meta-llama/llama-4-scout-17b-16e-instruct` vision model)
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

## 8. Trip detail — user-created folios

- [ ] Hero image shows for known destinations (Tokyo, Salzburg, Yosemite)
- [ ] Day cards render with correct date and day-of-week
- [ ] All day cards are **always expanded** — there is no collapse toggle
- [ ] Day tabs (DAY 1 · DAY 2 …) scroll the page to the corresponding card when tapped
- [ ] Each day card has a dashed "+ Add to this day" row at the bottom
- [ ] Tapping "+ Add to this day" opens Wayfinder pre-filled with day context
- [ ] Suggested events show "Suggested" badge + "+" confirm and "×" remove action buttons
- [ ] Confirmed events do NOT show "+" action button
- [ ] Confirmed events show a "×" that reveals a reason chooser (Incorrect data / Change of plan)
- [ ] Tapping an event row with tips/rating/location expands to show details (∨ chevron visible)
- [ ] Map address link opens Google Maps in a **new browser tab** (not same tab, not blocked by popup blocker)
- [ ] Map link text includes full address with city (not just bare venue name)
- [ ] Wayfinder opens from within the trip screen and receives folio context

---

## 8b. Trip detail — inspiration folios (read-only)

Regression: inspiration folios showed action buttons that mutated local state.

- [ ] "INSPIRATION" badge shown in top-right (not "Folio · Draft")
- [ ] No ⋯ menu button visible
- [ ] "Plan this trip →" button visible on hero
- [ ] Day cards visible and always expanded (same visual as user folios)
- [ ] NO "+ Add to this day" button on any day card
- [ ] NO "+" / "×" action buttons on any events (suggested or confirmed)
- [ ] NO "Ask Wayfinder for ideas" button on empty days ("A blank day. Often the best ones." text still shows)
- [ ] Badge counts: "2 CONFIRMED" on Day 1 Tokyo (confirmed && !suggested), not overcounting
- [ ] Tapping "Plan this trip" opens Wayfinder with destination + trip details pre-filled

---

## 8c. Wishlist add flow

Regression: WishlistItem.flight required; wishlistMode missing from useEffect deps causing stale messages.

- [ ] Tapping "ADD DESTINATION / Somewhere new" tile opens Wayfinder in wishlist mode
- [ ] Wayfinder header shows "Add to wishlist" subtitle (not "Your AI travel concierge")
- [ ] Body shows "Where do you dream of going?" heading
- [ ] Typing a destination and tapping → calls `/api/wishlist` (non-streaming JSON)
- [ ] Wayfinder shows "[destination] added to your wishlist ✦" confirmation message
- [ ] Sheet auto-closes after ~1.4 seconds
- [ ] New wishlist tile appears at front of wishlist row with correct name, season, and vibe tags
- [ ] Re-opening wishlist Wayfinder shows a clean blank state (no stale messages from previous session)

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

## 10. Wayfinder — in-trip contextual mode

- [ ] Opening Wayfinder from inside a trip shows "About your [destination] trip" in the header subtitle
- [ ] Header subtitle shows "Editing your folio" when editMode is true
- [ ] Asking a question gets a conversational reply — no trip update triggered, no `[EDIT:]` in reply
- [ ] Asking to add something triggers "Updating your [destination] trip…" then rebuilds the trip
- [ ] `[EDIT: ...]` tag is never visible in the chat UI — stripped from the displayed reply
- [ ] `[COMPOSE:]` tag is never visible in the chat UI — stripped from the displayed reply

---

## 11. Flight routing & smart transport

- [ ] Long-haul route (e.g. Seattle → Tokyo) generates `routeType: "direct"` with `routeNote` like "Direct · ~10h"
- [ ] No-direct route (e.g. Seattle → Dubrovnik) generates `routeType: "connecting"` naming the hub
- [ ] Short-haul within ~400km (e.g. Paris → Amsterdam) generates `kind: "transport"` (train/drive), NOT a flight
- [ ] Suggested flight events show "Verify before booking" label in trip detail view
- [ ] Confirmed flight events do NOT show "Verify before booking"
- [ ] No invented IATA codes in generated flight events
- [ ] No flight event connection time shorter than 1h30 domestic / 2h international

---

## 12. Inspiration & Wishlist → Real Trip Conversion

- [ ] Tapping an Inspiration tile navigates to the trip detail screen
- [ ] Trip detail for inspiration folio shows "Inspiration" badge (not "Folio · Draft")
- [ ] "Plan this trip" button visible on hero of inspiration folio
- [ ] Tapping "Plan this trip" opens Wayfinder with destination + duration pre-filled
- [ ] After creating a trip, the new folio appears in "Your Plans" on home screen

---

## 13. Supabase storage

Regression: data not persisting across sessions for authenticated users; demo mode broken by Supabase errors.

- [ ] **Demo mode**: tap "Try the demo" → home screen loads with mock wishlist and no folios
- [ ] **Demo mode**: create a folio via Wayfinder → appears in "YOUR PLANS" on home screen
- [ ] **Demo mode**: refresh page → folio still present (persisted in localStorage)
- [ ] **Authenticated mode**: log in via magic link → home screen loads folios from Supabase
- [ ] **First login**: if localStorage had a folio before login, it migrates to Supabase (appears after reload)
- [ ] **Authenticated mode**: create a folio → verify row appears in Supabase `folios` table
- [ ] **Authenticated mode**: add a wishlist item → verify row appears in `wishlist_items` table
- [ ] **Authenticated mode**: update settings → verify row upserted in `user_settings` table
- [ ] **Sign out → sign back in**: folios/wishlist are reloaded from Supabase correctly
- [ ] RLS check: `curl` with anon key returns `[]` for all 3 tables (no data leakage between users)

---

## 14. Auth & security

- [ ] All AI API routes (`/api/compose`, `/api/wayfinder`, `/api/wishlist`, `/api/suggest`, `/api/feedback`) return `401` if the `Authorization` header is missing
- [ ] Demo users (anonymous sign-in) can still use Wayfinder — their Supabase JWT is accepted
- [ ] Rate limit: hitting `/api/compose` 11× in 10 min returns `429 Too Many Requests`
- [ ] Magic link login: entering an email and submitting sends a link (Supabase dashboard confirms request)
- [ ] Cloudflare Turnstile widget appears inline after tapping "Continue with email" — not on the splash/idle state
- [ ] "Send magic link" button stays disabled until the Turnstile token is ready (shows "Verifying…")
- [ ] Pressing Enter in the email field does NOT submit while Turnstile is still verifying
- [ ] Security headers present on Vercel responses: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`
- [ ] `googleAccessToken` is NOT written to `wl-settings` in localStorage (open DevTools → Application → Local Storage to verify)

---

## 15. Settings — profile & account

- [ ] Settings page shows correct email address for signed-in user
- [ ] Tapping "Your name" row makes a text input appear inline (no modal/sheet)
- [ ] Saving a name shows the ✓ Saved toast
- [ ] Tapping "Home city" row expands an inline search field with live autocomplete
- [ ] Selecting a city result fills the input and hides the suggestions list
- [ ] Saving home city shows the ✓ Saved toast and collapses the section
- [ ] Cancelling home city edit leaves the previous value unchanged
- [ ] Tapping "Travel preferences" expands inline chip selector + note input
- [ ] Selecting a chip adds it as an active tag above the note field
- [ ] Saving prefs shows ✓ Saved toast and collapses section
- [ ] "Connect" buttons for Google Calendar and Gmail are **outlined** (ghost style, not solid black)
- [ ] Avatar circle shows a tappable ✎ badge when signed in; clicking opens a file picker
- [ ] Uploading a photo updates the avatar and shows ✓ Saved toast
- [ ] "Sign out" is displayed in **muted gray** (not red)
- [ ] Tapping "Sign out" navigates to `/login`

---

## 16. Settings — sign out data isolation (regression: name persisted after sign out)

- [ ] Sign in as User A, set a name (e.g. "Nemo") → name appears in home screen greeting and Settings
- [ ] Sign out → immediately lands on login screen
- [ ] Choose "Try the demo" (unauthenticated) → home screen greeting says "Good [time], Traveler." (NOT "Nemo")
- [ ] Open Settings in demo mode → "Your name" row shows placeholder "Add your name" (not User A's name)
- [ ] Open DevTools → Application → Local Storage → `wl-settings` should be absent or contain an empty name after sign-out

---

## 17. Home screen — dynamic greeting & avatar

- [ ] Between 05:00–11:59 the greeting reads "Good morning, [name]."
- [ ] Between 12:00–16:59 the greeting reads "Good afternoon, [name]."
- [ ] Between 17:00–20:59 the greeting reads "Good evening, [name]."
- [ ] Before 05:00 or after 21:00 the greeting reads "Good night, [name]."
- [ ] When no name is set, greeting reads "Good [time], Traveler."
- [ ] When name is "Neha Monga", greeting reads "Good [time], Neha." (first name only)
- [ ] Top-right avatar shows the first letter of the user's name (e.g. "N" for Neha)
- [ ] When no name is set, top-right avatar shows "✦" glyph
- [ ] After setting a name in Settings, returning to Home updates the greeting and avatar without reload

---

## 18. Reported bugs tracker

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
| 24 | Signed-in user's trips + wishlist visible in demo mode after sign-out (same root cause: SIGNED_OUT not handled in folios/wishlist contexts) | § 16 |
