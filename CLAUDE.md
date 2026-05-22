# Wanderluster — Claude Project Guide

AI travel planning app. Users describe a trip in natural language (or paste a link / upload a file), and Wayfinder (the AI concierge) builds a structured day-by-day folio. Folios, wishlist items, and settings persist in Supabase for authenticated users, and in localStorage for demo (unauthenticated) users.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 54 · Expo Router 6 · React Native Web |
| Language | TypeScript (strict-ish) |
| AI | Groq `llama-3.3-70b-versatile` via `groq-sdk` |
| Venue photos | Google Places API (Find Place + Photos) |
| Hosting | Vercel (static web export + edge API routes) |
| Auth | Supabase (magic link) |
| Storage | Supabase (authenticated) · `localStorage` (demo/offline fallback) |

---

## Commands

```bash
npm run web          # dev server (localhost:8082)
npm run build        # expo export --platform web → dist/
npm run eval         # run all AI eval suites against localhost
npm run eval:prod    # run evals against EVAL_BASE_URL (Vercel)
```

Always run `npm run build` before committing. It catches TypeScript errors. Zero errors is the bar — no exceptions.

---

## Project layout

```
app/
  _layout.tsx          # root layout (auth gate)
  (app)/
    _layout.tsx        # app shell: WayfinderSheet + Dock + all context providers
    index.tsx          # home screen
    trip/[id].tsx      # folio detail / inspiration detail
    settings.tsx       # user settings

app/api/               # Expo Router API routes (edge functions on Vercel)
  compose+api.ts       # POST /api/compose — streaming JSON folio generation
  wayfinder+api.ts     # POST /api/wayfinder — streaming chat
  wishlist+api.ts      # POST /api/wishlist — non-streaming wishlist item generation
  place-photo+api.ts   # GET  /api/place-photo — Google Places venue photo lookup
  suggest+api.ts       # POST /api/suggest
  feedback+api.ts      # POST /api/feedback

components/
  home/                # FolioTile, WishlistTile, AddTile, AddWishlistTile
  wayfinder/           # WayfinderDock, WayfinderSheet
  trip/                # DayCard, EventRow
  wishlist/            # WishlistComposerSheet (legacy, no longer used from home)

lib/
  folios-context.tsx   # planned folios — CRUD + Supabase (authed) / localStorage (demo)
  wishlist-context.tsx # wishlist items — CRUD + Supabase (authed) / localStorage (demo)
  settings-context.tsx # user settings — homeCity, travelTags, Google OAuth + Supabase sync
  wayfinder-context.tsx# global openWayfinder / openWishlist / editFolio / openCompose
  parseCompose.ts      # JSON extraction + sanitisation for AI folio output
  storage.ts           # thin localStorage wrapper (SSR-safe)
  supabase.web.ts      # Supabase client for web (uses || fallback, not ! assertion)
  supabase-server.ts   # Supabase client for API routes (no browser storage, persistSession: false)
  api-auth.ts          # requireAuth() + checkRateLimit() + rateLimitedResponse() — used by all API routes

constants/
  theme.ts             # Palette type + 4 palettes (bone, stone, ivory, ink)
  photos.ts            # Wikimedia URLs + fetchWikiPhoto() + getDestinationPhoto()

types/index.ts         # Folio, TripDay, TripEvent, WishlistItem, ChatMessage
data/mock.ts           # FOLIOS (tokyo, salzburg, yosemite) · WISHLIST · PAST_TRIPS · FOLIO_LIST
```

---

## Core data model

**Folio** — a full trip plan  
`id · title · destination · country · dates · duration · season · vibe · palette · visa · teaser · days[] · docs[] · photo?`

**TripDay** — one day in a folio  
`n · date ("Mon · Mar 25") · label · events[] · confirmed · empty?`

**TripEvent** — a single event  
`kind (flight|hotel|food|activity|transport|flag) · time · title · meta · confirmed · suggested? · tips[]? · location? · routeNote? · routeType?`

**WishlistItem** — a dream destination  
`id · name · season · vibe · visa · budget · palette · photo? · priceAlert? · bestTime? · flight?`  
(flight is optional — not returned by the API, not shown in UI)

---

## Design system

**Palette: Bone** (`DEFAULT_PALETTE`)  
- `bg` #f5f2ec · `ink` #1c1a17 · `accent` #a8624c · `muted` #8a7f6e  
- 4 palettes total: bone · stone · ivory · ink (dark mode)

**Rules that must never be broken:**
- No photos from Unsplash (expired IDs). All images from Wikimedia Commons only.
- Wikimedia URLs must use `960px-` prefix. Other widths are untested.
- Never use stock-photo services or random URLs — they 404.
- Text overlaid on images always needs a multi-stop LinearGradient + `textShadowColor`.
- No emojis in UI (except the `✦` glyph used as a design mark).
- The app is named **Wanderluster**. The AI is **Wayfinder**. Trip plans are **Folios**. Never say "itinerary" in copy.

---

## Wayfinder — how it works

WayfinderSheet is the single modal for everything: new trip, edit trip, wishlist, compose (file/link/image).

**Mode routing in `_layout.tsx`:**
- `openWayfinder(q?)` — chat mode, optional seed question
- `openWishlist()` — wishlist mode (wishlistMode=true)
- `openCompose(kind)` — compose mode ('screenshots' | 'words' | 'link')
- `editFolio(id)` — edit mode with folioId set

**`send()` routing in WayfinderSheet:**
- `wishlistMode && !composed` → `sendCompose()` (hits /api/wishlist, non-streaming JSON)
- `effectiveMode && !composed` → `sendCompose()` (hits /api/compose, streaming)
- otherwise → `sendChat()` (hits /api/wayfinder, streaming)

**Auto-compose trigger:** after 2nd user message in no-folio chat mode, `autoCompose()` is called automatically — the model does not need to emit `[COMPOSE:]` for this to work.

**Folio creation flow:** `sendCompose` or `autoCompose` → parse JSON → `fetchWikiPhoto(destination)` → `addFolio()` → navigate to `/trip/[id]`.

**Wishlist creation flow:** `sendCompose` (wishlist branch) → POST /api/wishlist → parse JSON → `fetchWikiPhoto()` → `addWishlistItem({ ...data, id: wl-${Date.now()} })` → show confirmation → `onClose()`.

---

## Security architecture

### Authentication on API routes

All AI routes (`/api/compose`, `/api/wayfinder`, `/api/wishlist`, `/api/suggest`, `/api/feedback`) require a valid Supabase JWT. The shared helper in `lib/api-auth.ts` handles this:

```ts
const auth = await requireAuth(request);  // extracts Authorization: Bearer <token>
if (auth.error) return auth.error;        // 401 if missing/invalid
```

**Demo users are not excluded** — `signInAnonymously()` in `login.tsx` gives demo users a real Supabase JWT, so auth works transparently for them too.

The client (`WayfinderSheet.tsx`) calls `supabase.auth.getSession()` before every API request and injects the token via `getAuthHeaders()`. If no session is active, the `Authorization` header is simply omitted and the route returns 401.

### Rate limiting

In-memory sliding-window rate limiter in `lib/api-auth.ts` (`checkRateLimit`). Limits per route per user:

| Route | Limit |
|---|---|
| /api/compose | 10 per 10 min |
| /api/wayfinder | 30 per 5 min |
| /api/wishlist | 20 per 5 min |
| /api/suggest | 60 per 5 min |

⚠️ In-memory only — resets when Vercel spins down a function instance. For production-grade distributed limiting, replace with Upstash Redis + `@upstash/ratelimit`.

### SSRF protection (compose link mode)

`fetchUrl()` in `compose+api.ts`:
- `https:` scheme only — rejects `http:`, `file:`, `ftp:` etc.
- Blocks RFC-1918 private ranges, loopback, APIPA, IPv6 link-local via `PRIVATE_HOST_RE`
- Validates `Content-Type` header (must contain `text/`) before reading body
- 500 KB byte cap via `ReadableStream` reader with `reader.cancel()` on overflow
- 8-second timeout via `AbortSignal.timeout`

### Security headers (vercel.json)

Applied to all routes (`source: "/(.*)"`) on Vercel:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` — allows Cloudflare Turnstile iframe, Supabase API calls, Wikimedia images, Google Maps images

### Token handling

`googleAccessToken` in `UserSettings` is **memory-only** — `sanitizeForPersistence()` strips it before any write to localStorage or Supabase. Tokens are never stored at rest.

---

## API routes

All routes in `app/api/` follow Expo Router convention (`export async function POST/GET(request: Request)`).

| Route | Model | Streaming | Returns |
|---|---|---|---|
| /api/wayfinder | llama-3.3-70b-versatile | yes | plain text stream |
| /api/compose | llama-3.3-70b-versatile | yes (text mode) / no (image) | JSON folio |
| /api/wishlist | llama-3.3-70b-versatile | no | JSON WishlistItem fields |
| /api/suggest | llama-3.3-70b-versatile | no | suggestions array |
| /api/feedback | llama-3.3-70b-versatile | no | ack |
| /api/place-photo | Google Places API | no | `{ url: string \| null }` |

**vercel.json** has explicit pass-through rewrites for every `/api/*` route before the `/(.*) → /index.html` catch-all. Always add a new route to vercel.json when adding an API file.

---

## Photos

`fetchWikiPhoto(destination)` calls the Wikipedia pageimages API and filters out maps, flags, SVGs, logos, and coat-of-arms images. Returns null if nothing suitable found.

`getDestinationPhoto(folioId, destination)` looks up the static `FOLIO_PHOTOS` / `WISHLIST_PHOTOS` maps first (fast, no network), falls back to `fetchWikiPhoto`.

Photos are stored on the Folio/WishlistItem at creation time (`folio.photo`). Never re-fetch on revisit — the field is the source of truth.

To add a new static photo:
1. Find the file on Wikimedia Commons
2. Construct URL: `https://upload.wikimedia.org/wikipedia/commons/thumb/{hash}/{filename}/960px-{filename}`
3. `curl -sI -A "Mozilla/5.0" "<url>" | head -1` — must return `HTTP/2 200`
4. Add to `FOLIO_PHOTOS` or `WISHLIST_PHOTOS` in `constants/photos.ts`

Note: `curl` without `-A "Mozilla/5.0"` returns 403 from Wikimedia — that's a bot-block, not a real 404.

---

## Venue photos (EventRow)

Each event with `kind: hotel | food | activity` shows a 48×48 rounded thumbnail fetched from Google Places.

**Flow:**
1. `EventRow` calls `GET /api/place-photo?q=<title+location>` on mount
2. Server calls Google Places "Find Place" → gets `photo_reference`
3. Server resolves `place/photo?photo_reference=…&key=KEY` → follows redirect → returns the public `lh3.googleusercontent.com` URL
4. Client renders `<Image source={{ uri: url }} />` — the API key never reaches the browser

**Caching:** results are stored in a module-level `Map<string, string | null>` (`_photoCache` in `EventRow.tsx`). Each unique `title|location` key is only fetched once per page session.

**Graceful degradation:** if `GOOGLE_MAPS_API_KEY` is unset or the lookup fails, the endpoint returns `{ url: null }` and no image is shown — no broken image states.

**Required env var:** `GOOGLE_MAPS_API_KEY` (server-side only, not `EXPO_PUBLIC_`). Needs **Places API** and **Maps JavaScript API** enabled in Google Cloud Console. Add to `.env.local` and Vercel Environment Variables.

**Event kinds that get photos:** `hotel`, `food`, `activity`. Flights, transport, and flag events never fetch a photo.

---

## Storage

### Supabase tables (authenticated users)

| Table | Key column | Data column | Notes |
|---|---|---|---|
| `folios` | `id TEXT PK` | `data JSONB` | Full `Folio` object. `user_id UUID FK → auth.users`. RLS: `auth.uid() = user_id`. |
| `wishlist_items` | `id TEXT PK` | `data JSONB` | Full `WishlistItem` object. Same RLS. |
| `user_settings` | `user_id UUID PK` | `data JSONB` | One row per user. Upserted on every `updateSettings()` call. |

### localStorage keys (demo / offline fallback)

| Key | Context | Type |
|---|---|---|
| `wl-planned` | FoliosProvider | `Folio[]` |
| `wl-wishlist` | WishlistProvider | `WishlistItem[]` |
| `wl-settings` | SettingsProvider | `UserSettings` |

### How dual-mode works

Each provider subscribes to `supabase.auth.onAuthStateChange`:
- **No session** (demo mode) → reads/writes localStorage only.
- **Session present** → loads from Supabase on mount; all writes go to Supabase + localStorage cache.
- **First login with local data** → migrates localStorage data to Supabase automatically (one-time upsert).
- `addFolio()` must stay **synchronous** (returns the new ID immediately for navigation). Supabase write happens in the background via a fire-and-forget async call.

---

## Evals

```bash
npm run eval                          # all suites vs localhost
npm run eval:suite hallucination      # single suite
npm run eval:baseline                 # update baseline.json after a good run
EVAL_BASE_URL=https://... npm run eval:prod
```

Suites: `hallucination · drift · tool-misuse · compose · wayfinder`

Nightly eval runs on GitHub Actions at 2am UTC. It requires two repo secrets:
- `GROQ_API_KEY` — Groq API key
- `EVAL_BASE_URL` — deployed Vercel URL

The eval fails fast with "GROQ_API_KEY environment variable is required" if the secret is missing — not an eval failure, just a missing secret.

---

## QA before every push

Run `QA.md` checklist. The most important regressions to check:
1. `npm run build` exits 0 — no TypeScript errors
2. Wayfinder opens and creates a folio end-to-end
3. Hero images not gray on folio tiles (Wikimedia URLs still valid)
4. Wishlist add flow works (Wayfinder → wishlist mode → item appears on home)
5. Trip detail shows correct hero photo, day cards, and event badges
6. Inspiration folios are fully read-only (no action buttons anywhere)
7. Day tab tapping scrolls to the correct card

---

## Known gotchas

- **Supabase URL fallback**: `lib/supabase.web.ts` uses `|| 'https://placeholder.supabase.co'` — do not change to `!` assertion or the Vercel build will crash when the env var is unset.
- **Wikimedia bot blocks**: `curl` without a User-Agent header gets 403. Always use `-A "Mozilla/5.0"` when testing URLs. The browser works fine.
- **`WishlistItem.flight`** is optional — it's not returned by the API and not displayed in the UI. Don't make it required again.
- **WayfinderSheet state reset**: the `useEffect` that clears messages depends on `[folioId, composeMode, editMode, wishlistMode]` — all four must be in the array or stale messages will bleed between sessions.
- **`[COMPOSE:]` and `[EDIT:]` tags** from the AI must be stripped from the displayed chat text — they are control signals, not user-facing content.
- **Day-of-week in folios**: always derived from the actual date string, never guessed by the AI. The AI generates `YYYY-MM-DD` dates and `parseCompose.ts` / `correctDates` formats them.
- **Day tab scroll — use `measureLayout`, not `onLayout` accumulation**: in `trip/[id].tsx`, day card Y-positions are found via `cardRef.measureLayout(scrollRef.current, ...)` at tap time. Do not go back to storing positions in `onLayout` — child `onLayout` fires before the parent container's `onLayout` sets `dayCardsSectionY`, so stored values are always 0 + relative offset, losing the section offset.
- **Inspiration folio read-only guards**: `isInspirationFolio` is `!planned.some(f => f.id === id)`. Pass `undefined` (not arrow fns) for `onConfirmEvent`, `onRemoveEvent`, `onRemoveConfirmedEvent`, `onAskWayfinder`, `onAddSomething` on inspiration folios. Arrow functions are always truthy — passing `() => prop?.(i)` to EventRow means the button always renders even when the underlying prop is undefined.
- **Badge counting**: `confirmedCount = events.filter(e => e.confirmed && !e.suggested).length`. Mock data events have no `suggested` field, so `!undefined === true` — without the `e.confirmed` guard every event would be counted as confirmed.
- **Map links on web**: `Linking.openURL` resolves asynchronously on web (fires `window.open` outside the user gesture context), which popup blockers kill. Use `Platform.OS === 'web' ? (globalThis as any).open(url, '_blank', 'noopener,noreferrer') : Linking.openURL(url)` in EventRow's `openMap()`.
- **Vision model**: screenshot / image upload uses `meta-llama/llama-4-scout-17b-16e-instruct` (Groq). `llama-3.2-11b-vision-preview` is decommissioned — do not use it.
- **WayfinderDock suggestions**: the `SUGGESTIONS` array in `WayfinderDock.tsx` must be generic travel prompts, not folio-specific ("What should I do on Day 4?" etc.). The dock appears on every screen, not just trip detail.
- **Supabase storage — dual-mode pattern**: all three context providers (folios, wishlist, settings) support two modes: Supabase when a session is present, localStorage when demo/unauthenticated. The `userIdRef` pattern (a `useRef` updated inside `onAuthStateChange`) lets CRUD functions fire-and-forget Supabase writes without needing the userId in their closure scope.
- **`wl-planned` not `wl-folios`**: the localStorage key for user folios is `wl-planned` (matches the original key). Do not rename it or existing demo-mode data will be lost.
- **Wishlist mock items not migrated**: on first login, only user-created wishlist items (those not in the mock `WISHLIST` array) are migrated to Supabase. Mock items are always injected client-side from `data/mock.ts`.
- **Supabase DDL requires dashboard access**: there's no service role key in `.env.local`, so you cannot run DDL via `curl` or the JS client. Use the SQL Editor at `https://supabase.com/dashboard/project/fxhyqtyhxcdzrozmabxr/sql/new`. The Monaco editor instance is accessible via `window.monaco.editor.getEditors()[0]`. When the user asks for DB schema changes, provide the SQL to paste — do not automate the browser.
- **Event details always expanded**: `EventRow` no longer has an expand/collapse toggle. The details panel (tips, location/map link) is always visible when the event has them. There is no `expanded` state, no chevron, and the row's `TouchableOpacity` has `onPress={undefined}`.
- **Compose skips suggested flights/hotels when booked**: the compose system prompt includes a `FLIGHTS & HOTELS — SKIP IF ALREADY BOOKED` rule. If the user's input says their flights or hotel are sorted/booked/handled, the AI omits suggested flight/hotel events and focuses on activities and food instead.
- **Venue photo cache key**: `_photoCache` in `EventRow.tsx` uses `"${event.title}|${event.location}"` as the key. If a venue has no location, it falls back to just the title. The cache is module-level (not React state) so it persists across re-renders but resets on page reload.
- **`/api/suggest` requires auth headers**: the suggest endpoint is authenticated like all other AI routes. `trip/[id].tsx` fetches the Supabase session and injects `Authorization: Bearer <token>` before calling `/api/suggest`. Without this the call returns 401 silently and the fallback placeholder appears instead of a real suggestion.
- **Geographic clustering in suggest + Wayfinder**: `api/suggest.ts` now receives `dayArea` (from `TripDay.area`) and `location`/`meta` fields on both the removed event and existing events. The prompt instructs the AI to suggest replacements in the same neighbourhood. `api/wayfinder.ts` injects `[area: …]` tags into the itinerary when `day.area` is set, and its GEOGRAPHIC CLUSTERING rule tells Wayfinder to check existing event areas before adding new ones.
- **Wayfinder [EDIT:] tag format**: the compose AI needs the neighbourhood in the `[EDIT:]` description to set `meta` correctly. Always include `[neighbourhood]` in the Wayfinder [EDIT:] output — e.g. `[EDIT: Add a food event on Day 3 at 19:00 — Narisawa, Minami-Aoyama. ...]`.
- **Folio lookup — always use `planned` first**: `FOLIOS` is a static mutable map populated at runtime via `injectIntoFoliosMap`. For user-created folios loaded from Supabase on page refresh, the map won't be populated until `FoliosProvider` finishes its async load. Always derive `folio` as `planned.find(f => f.id === id) ?? FOLIOS[id]` so the component re-renders correctly when the context updates. Use `foliosLoading` from `useFolios()` to show a spinner instead of immediately bouncing.
- **FoliosContext `loading` flag**: `FoliosProvider` now exposes `loading: boolean` in context. It starts `true` and flips to `false` once the initial auth check + Supabase/localStorage load completes. Trip screen and any screen that conditionally renders based on folio availability should check `loading` before calling `router.back()`.
- **SSRF protection in Vercel functions**: the deployed API lives in `api/*.ts` (Vercel edge functions), NOT `app/api/*+api.ts` (skipped during build). Any security logic added to `app/api/compose+api.ts` must be duplicated in `api/compose.ts`. Both now have the same private-IP blocking, https-only, content-type, and 500 KB cap.
- **Feedback auth headers**: `/api/feedback` is authenticated like all other routes. The fire-and-forget call in `removeConfirmedEvent` must include `Authorization: Bearer <token>` or every event removal silently drops its feedback.
