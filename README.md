# Marasim (مَراسِم) — Luxury Digital Wedding Invitation Studio

Bilingual (Arabic RTL / English LTR) digital wedding invitation & poster studio built with React 19, TypeScript, Tailwind CSS v4, Vite, Supabase, and Cloudflare Pages.

## Key Features
- **Interactive Invitation Atelier (`/studio`)**: Live customization of typography, gold/arabesque ornaments, color palettes, couple photos, galleries, schedules, ambient Web Audio soundscapes, and Google Maps venue coordinates.
- **Luxury Card & 2-Night Poster Modes**: Supports classic royal cards, Stage Spotlight 3D posters (`stage_poster`), and Arab Heritage split 2-night posters (`split_poster`).
- **Interactive Guest Experience (`/i/:slug`)**: Wax-seal envelope opening gate, countdown clock, localized event schedules, QR pass, PNG/PDF export, WhatsApp sharing, RSVP form, and public guestbook wishes wall.
- **Phone + PIN Recovery Auth**: Custom Supabase Edge Function (`marasim-pin-auth`) for registration/sign-in with any phone number and 4–8 digit PIN password recovery.
- **Dashboards**: Couple invitation & RSVP manager (`/dashboard`) with CSV export, and full Platform Admin console (`/admin`).

## Architecture
- **Frontend Hosting**: Cloudflare Pages (`invite-cart.pages.dev`)
- **Database & Auth**: Supabase (`invite_cart` isolated schema, RLS policies, Storage bucket `invite-cart-media`, Edge Function `marasim-pin-auth`)

## Automated CI/CD (GitHub -> Cloudflare Pages & Supabase)
This repository includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) which automatically builds and deploys updates pushed to `main`.

Configure the following Repository Secrets in GitHub (`Settings -> Secrets and variables -> Actions`):
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token with **Cloudflare Pages: Edit** permission
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare Account ID
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable/anon key
- `SUPABASE_ACCESS_TOKEN` — Supabase Personal Access Token
- `SUPABASE_PROJECT_ID` — Supabase Project Ref ID
