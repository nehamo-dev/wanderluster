# Wanderluster — To Do

## Branding & Polish
- [ ] **Branded auth emails** — customize Supabase magic link emails with Wanderluster styling
  - Update template in Supabase → Authentication → Email Templates → Magic Link
  - Set up custom SMTP via [Resend](https://resend.com) (free tier: 3k emails/month)
  - Sender name: `Wanderluster`, address: `noreply@yourdomain.com`
  - Subject: `Your Wanderluster sign-in link`

## Features
- [ ] Price tracking for wishlist destinations
- [ ] Calendar sync (Google Calendar)
- [ ] Email import (Gmail — auto-detect bookings)
- [ ] One-tap booking suggestions
- [ ] Native iOS + Android apps
- [ ] Shared folios / collaborative planning
- [ ] Offline mode

## Infrastructure
- [ ] Replace in-memory rate limiter with Upstash Redis for distributed limiting across Vercel instances
- [ ] Add screenshots to README (`docs/screenshots/`)
