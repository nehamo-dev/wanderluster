# Wanderluster — Claude Project Guide

AI travel planning app. Users describe a trip in natural language (or paste a link / upload a file), and Wayfinder (the AI concierge) builds a structured day-by-day folio. Folios, wishlist items, and settings all persist in localStorage; there is no backend database yet.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 54 · Expo Router 6 · React Native Web |
| Language | TypeScript (strict-ish) |
| AI | Groq `llama-3.3-70b-versatile` via `groq-sdk` |
| Hosting | Vercel (static web export + edge API routes) |
| Auth | Supabase (magic link) — not fully wired yet |
| Storage | `localStorage` via `lib/storage.ts` |

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
  suggest+api.ts       # POST /api/suggest
  feedback+api.ts      # POST /api/feedback

components/
  home/                # FolioTile, WishlistTile, AddTile, AddWishlistTile
  wayfinder/           # WayfinderDock, WayfinderSheet
  trip/                # DayCard, EventRow
  wishlist/            # WishlistComposerSheet (legacy, no longer used from home)

lib/
  folios-context.tsx   # planned folios — CRUD + localStorage
  wishlist-context.tsx # wishlist items — CRUD + localStorage
  settings-context.tsx # user settings — homeCity, travelTags, Google OAuth
  wayfinder-context.tsx# global openWayfinder / openWishlist / editFolio / openCompose
  parseCompose.ts      # JSON extraction + sanitisation for AI folio output
  storage.ts           # thin localStorage wrapper (SSR-safe)
  supabase.web.ts      # Supabase client for web (uses || fallback, not ! assertion)

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

## API routes

All routes in `app/api/` follow Expo Router convention (`export async function POST(request: Request)`).

| Route | Model | Streaming | Returns |
|---|---|---|---|
| /api/wayfinder | llama-3.3-70b-versatile | yes | plain text stream |
| /api/compose | llama-3.3-70b-versatile | yes (text mode) / no (image) | JSON folio |
| /api/wishlist | llama-3.3-70b-versatile | no | JSON WishlistItem fields |
| /api/suggest | llama-3.3-70b-versatile | no | suggestions array |
| /api/feedback | llama-3.3-70b-versatile | no | ack |

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

## localStorage keys

| Key | Context | Type |
|---|---|---|
| `wl-folios` | FoliosProvider | `Folio[]` |
| `wl-wishlist` | WishlistProvider | `WishlistItem[]` |
| `wl-settings` | SettingsProvider | `UserSettings` |

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
