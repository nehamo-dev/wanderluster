<div align="center">

<br />

<img src="assets/icon.png" width="80" height="80" style="border-radius: 18px" />

<br /><br />

# Wanderluster

**AI-powered travel planning — from idea to itinerary in seconds.**

<br />

[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://wanderluster-six.vercel.app)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Groq](https://img.shields.io/badge/AI-Groq%20LLaMA%203.3-F55036?style=flat-square)](https://groq.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)](LICENSE)

<br />

</div>

---

## What is it?

Wanderluster is a travel planning app with an AI concierge called **Wayfinder**. Tell it where you want to go — or paste a link, upload a PDF, describe a vibe — and it builds a structured, day-by-day **Folio**: your trip plan, ready to tweak, share, or book from.

No forms. No dropdowns. Just a conversation.

<br />

## Screenshots

> **To add screenshots:** take a snapshot of each screen below, save to `docs/screenshots/`, and replace the placeholder paths.

<table>
  <tr>
    <td align="center" width="33%">
      <img src="docs/screenshots/home.png" alt="Home — your folios and wishlist" /><br />
      <sub><b>Home</b> — folios &amp; wishlist</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/wayfinder.png" alt="Wayfinder — AI trip planning chat" /><br />
      <sub><b>Wayfinder</b> — AI concierge</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/folio.png" alt="Folio — day-by-day trip detail" /><br />
      <sub><b>Folio</b> — day-by-day plan</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="docs/screenshots/day-detail.png" alt="Day detail — events with venue photos" /><br />
      <sub><b>Day detail</b> — events &amp; venues</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/wishlist.png" alt="Wishlist — dream destinations" /><br />
      <sub><b>Wishlist</b> — dream destinations</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/login.png" alt="Login — magic link sign in" /><br />
      <sub><b>Sign in</b> — magic link</sub>
    </td>
  </tr>
</table>

<br />

## Features

**✦ Wayfinder AI**
Chat naturally. Wayfinder asks the right questions, then generates a complete itinerary — with flights, hotels, restaurants, and activities laid out by day. Upload a confirmation email or paste an Airbnb link and it reads what you've already booked.

**✦ Folios**
Every trip lives in a Folio — a structured plan with confirmed and suggested events, visa notes, packing context, and a hero photo. Edit any detail by asking Wayfinder to change it.

**✦ Venue photos**
Each hotel, restaurant, and activity shows a live thumbnail pulled from Google Places — so your folio looks as good as the trip itself.

**✦ Wishlist**
Save dream destinations. Add anything to your wishlist through the same Wayfinder interface — it captures the best time to visit, typical budget, and vibes.

**✦ Inspiration**
Curated example trips you can open, explore, and convert into your own Folio with one tap.

**✦ Smart transport routing**
Wayfinder knows when to suggest a flight vs. a train. Short-haul trips get surface transport; long-haul gets the right airline and a realistic layover when no direct service exists.

**✦ Auth + sync**
Magic link sign-in via Supabase. Folios, wishlist, and settings sync across devices for signed-in users. Demo mode works without an account — no sign-up required.

**✦ Beautiful, minimal design**
Warm bone palette. No stock photos — every destination image is sourced from Wikimedia Commons. Typography-first. Works in any browser, no app store required.

<br />

## How it works

```
User types: "10 days in Tokyo, late March, food and culture"
                          │
                Wayfinder (LLaMA 3.3 via Groq)
                          │
          ┌───────────────┴───────────────┐
      Streaming JSON                  Streamed chat
     (folio structure)            (questions & replies)
          │
 Parse + validate dates
          │
  Fetch hero photo (Wikipedia API)
  Fetch venue photos (Google Places)
          │
   Save to Supabase (auth) / localStorage (demo)
          │
    Open trip detail screen
```

<br />

## Tech stack

| | |
|---|---|
| **Framework** | [Expo](https://expo.dev) SDK 54 · Expo Router 6 · React Native Web |
| **Language** | TypeScript |
| **AI** | [Groq](https://groq.com) · LLaMA 3.3 70B (chat/compose) · LLaMA 4 Scout 17B (vision) |
| **Deployment** | [Vercel](https://vercel.com) (static export + edge functions) |
| **Auth** | [Supabase](https://supabase.com) (magic link + anonymous) |
| **Storage** | Supabase (authenticated) · `localStorage` (demo fallback) |
| **Venue photos** | [Google Places API](https://developers.google.com/maps/documentation/places) |
| **Hero photos** | [Wikimedia Commons](https://commons.wikimedia.org) (CC-licensed) |
| **CAPTCHA** | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) |

<br />

## Getting started

**Prerequisites:** Node ≥ 20, a [Groq API key](https://console.groq.com) (free tier works fine)

```bash
git clone https://github.com/nehamo-dev/wanderluster.git
cd wanderluster
npm install
```

Create `.env.local`:

```env
GROQ_API_KEY=your_groq_key_here
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Optional — enables venue photo thumbnails on events
GOOGLE_MAPS_API_KEY=your_google_maps_key_here

# Optional — enables Cloudflare Turnstile CAPTCHA on login
EXPO_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
```

Run the dev server:

```bash
npm run web
# → http://localhost:8082
```

<br />

## Deployment

The app is a standard Expo web export deployed to Vercel. API routes live in `app/api/` and are served as Vercel Edge Functions.

```bash
npm run build          # builds to dist/
vercel --prod          # deploy
```

Set these environment variables in your Vercel project:

| Variable | Required |
|---|---|
| `GROQ_API_KEY` | ✅ |
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `EXPO_PUBLIC_TURNSTILE_SITE_KEY` | recommended |
| `GOOGLE_MAPS_API_KEY` | optional |

<br />

## Project structure

```
app/
  (app)/
    index.tsx          ← home screen
    trip/[id].tsx      ← folio detail + inspiration
    settings.tsx       ← user profile + preferences
  api/
    compose+api.ts     ← streaming folio generation
    wayfinder+api.ts   ← streaming chat
    wishlist+api.ts    ← wishlist item generation
    suggest+api.ts     ← alternative event suggestions
    place-photo+api.ts ← Google Places venue photo proxy
    feedback+api.ts    ← event feedback collection

components/
  wayfinder/           ← WayfinderDock + WayfinderSheet (the AI modal)
  home/                ← FolioTile, WishlistTile, AddTile
  trip/                ← DayCard, EventRow (with venue photos)
  auth/                ← TurnstileWidget

lib/
  folios-context.tsx   ← trip state (Supabase + localStorage)
  wishlist-context.tsx ← wishlist state (Supabase + localStorage)
  settings-context.tsx ← user preferences (Supabase + localStorage)
  api-auth.ts          ← JWT auth + rate limiting for API routes
  parseCompose.ts      ← AI output → typed Folio

constants/
  theme.ts             ← design tokens (bone, stone, ivory, ink palettes)
  photos.ts            ← Wikimedia URLs + fetchWikiPhoto()
```

<br />

## Security

All AI API routes require a valid Supabase JWT and are rate-limited per user. Demo users receive an anonymous JWT so auth works seamlessly without an account. SSRF protection, security headers (CSP, HSTS, X-Frame-Options), and Cloudflare Turnstile CAPTCHA are all active in production.

<br />

## AI evals

A nightly eval suite runs against the deployed app to catch AI regressions — hallucinated events, broken JSON, invented flight details, and drift in Wayfinder's persona.

```bash
npm run eval                    # run all suites vs localhost
npm run eval:suite compose      # single suite
npm run eval:baseline           # update baseline after a good run
```

Suites: `hallucination · compose · wayfinder · drift · tool-misuse`

To enable the nightly GitHub Actions run, add `GROQ_API_KEY` and `EVAL_BASE_URL` to your repo secrets.

<br />

## Design principles

- **Warm, typographic, editorial.** The app should feel like a well-designed travel journal, not a SaaS dashboard.
- **No stock photos.** All images are sourced from Wikimedia Commons at 960px. URLs are verified before shipping.
- **Language matters.** Trips are *Folios*. The AI is *Wayfinder*. Days are not *itineraries*.
- **Conversation first.** Every creation flow — new trip, wishlist item, edits — goes through the same Wayfinder interface. No separate forms.

<br />

## Roadmap

- [ ] Price tracking for wishlist destinations
- [ ] Calendar sync (Google Calendar)
- [ ] Email import (Gmail — auto-detect bookings)
- [ ] One-tap booking suggestions
- [ ] Native iOS + Android apps
- [ ] Shared folios / collaborative planning
- [ ] Offline mode

<br />

---

<div align="center">

Built with ✦ by Neha · Powered by Groq + LLaMA

</div>
