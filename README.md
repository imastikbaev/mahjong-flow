<div align="center">

<br />

# Mahjong Flow

**A cognitive focus tool built as a 3D Mahjong Solitaire puzzle.**  
Structured play over passive scrolling. Flow state over frustration.

<br />

<img src="demo.gif" width="720" alt="Mahjong Flow demo" />

### 🚀 **[Play Live Demo on Vercel](2stage.vercel.app)**
🧠 **[AI Coach Backend API](https://your-python-backend.onrender.com/docs)**

<br />

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square)](https://nextjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-postgres-3ECF8E?style=flat-square)](https://supabase.com)
[![License](https://img.shields.io/badge/license-MIT-white?style=flat-square)](LICENSE)

</div>

---

## The Philosophy

Most games are designed to extend session time. Mahjong Flow is designed to end it — with the user feeling calm and sharp, not depleted.

The 144-tile board is a bounded problem space. Every move has consequence. There is no randomness after the deal, no timers forcing panic, no notifications. The brain enters a narrow-focus state researchers call *flow* — the same state experienced during deep work.

This is the niche: **cognitive recovery through structured play**, positioned as a digital detox tool rather than entertainment.

---

## Features

### Freemium Skin System — a UX-driven business model

| Tier | Skin | Symbol type | Cognitive load |
|------|------|-------------|----------------|
| Free | Classic | Unicode Mahjong glyphs (🀙 🀐 🀇) | Higher — character recognition required |
| Pro  | Elemental | Lucide icon system (Earth / Water / Fire / Air) | Lower — abstract shapes induce flow faster |

The free tier is fully functional. The upgrade sells a measurably better experience, not locked features.

### AI Coach

A real-time board analysis engine that runs on every state change:

- Counts available free pairs and warns when < 2 remain
- Detects isolated tile types whose match is buried beneath other layers
- Calculates which single move unlocks the most blocked tiles
- Identifies when the top layer is fully clear (highest-value moment to act)

The coach surfaces tips without interrupting play — no modal popups, no forced pauses.

### Daily Challenge + Global Leaderboard

Every player worldwide receives the same seeded board each day. Scores are ranked globally and by city. The seed is derived deterministically from the date — no server call required to generate the board.

### Auth — Email & Google Sign-in

Players can create an account with email + password or continue with Google OAuth. Authentication is powered by Supabase Auth:

- On first sign-up a database trigger automatically creates a matching row in `public.users`
- Sessions persist across tabs via a cookie-refreshing middleware
- The game is fully playable without an account — auth unlocks quest tracking and cross-device streaks

### Quest Engine

Six time-boxed quests reset automatically based on UTC time — no cron job required:

| Period | Quest | Goal |
|--------|-------|------|
| Daily  | Daily Challenger | Complete 1 Daily Challenge |
| Daily  | Sprint Session | Play 3 Sprint matches |
| Daily  | Pair Streak | Clear 50 pairs in any mode |
| Weekly | Flow State | Score 8 000+ in one game |
| Weekly | Tile Master | Clear 500 pairs total |
| Weekly | Committed | Complete the Daily 7 days in a row |

Progress is stored in `quests_progress` (Supabase, RLS-protected). Expired quests are detected client-side by comparing `expires_at` to `now()` and upserted fresh on the next sync — zero scheduled jobs.

### Sprint Mode *(Pro)*

Three minutes. Clear as many pairs as possible. Score = `pairs × 100 + remaining_seconds × 10`. The timer turns red at 30 seconds.

### Focus Analytics *(Pro)*

A 7-day bar chart of solving times, best time, average time, and daily streak — stored locally via `localStorage`, no account required.

### Board Guarantee

Easy and Medium difficulties use a two-phase solvable generator: Phase 1 simulates a full solve to determine a valid removal order; Phase 2 assigns tile types along that path. The board is always winnable.

---

## Architecture

```
mahjong-flow/
├── app/                    # Next.js 16 App Router
│   ├── page.tsx            # Root client page — game state orchestration
│   └── layout.tsx          # Theme provider, fonts
├── components/
│   ├── MahjongBoard.tsx    # Auto-scaling canvas with ResizeObserver
│   ├── TileCell.tsx        # Framer Motion tile — glassmorphism surface
│   ├── AICoach.tsx         # Board analysis panel
│   ├── TopBar.tsx          # Mode toggle, sprint, difficulty, skin
│   ├── Leaderboard.tsx     # Global / city-scoped score table
│   ├── FocusStats.tsx      # 7-day analytics chart
│   └── WinModal.tsx        # Result screen (win + sprint timeout)
├── store/
│   └── mahjongStore.ts     # Zustand — tiles, game modes, sprint, skins
└── lib/
    ├── hooks/
    │   ├── useGameHistory.ts   # localStorage-backed session history
    │   ├── useLeaderboard.ts   # Supabase leaderboard queries
    │   └── useSubmitScore.ts   # Score upsert with user profile sync
    └── supabaseClient.ts
```

### Board engine

The 144-tile Turtle layout is hardcoded as `[x, y, z]` coordinates. Tile freedom is determined geometrically — a tile is free when nothing covers it from above (`z+1`, within ±1 unit on both axes) and at least one horizontal side is open. This check runs in O(n) per tile.

### Supabase schema

Three tables:

- **`users`** — `(uuid, nickname, city, is_pro)`. Populated automatically by a `handle_new_user()` trigger on `auth.users` INSERT. Anonymous players generate a stable UUID in localStorage; signed-in players use their Supabase auth UUID.
- **`leaderboard`** — `(user_id, date, score, time_seconds, type)`. Scores are upserted with a unique constraint on `(user_id, date, type)` — only the personal best survives.
- **`quests_progress`** — `(user_id, quest_id, current_value, target_value, expires_at, is_completed)`. RLS policy restricts every row to its owner (`auth.uid() = user_id`). Expired quests are reset client-side and re-upserted; no server cron needed.

### Auth flow

```
Browser → supabase.auth.signInWithOAuth / signInWithPassword
       → Supabase redirects to /auth/callback
       → route.ts exchanges code for session cookie
       → middleware.ts refreshes cookie on every subsequent request
       → useAuthUser() mirrors session state via onAuthStateChange
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 + React 19 (App Router) |
| Styling | Tailwind CSS v4, glassmorphism surfaces |
| Animation | Framer Motion 12 |
| State | Zustand 5 |
| Icons | lucide-react |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Database | Supabase (PostgreSQL via PostgREST + RLS) |
| Fonts | Geist (variable, `next/font`) |
| Deployment | Vercel |

---

## Quick Start

### Prerequisites

- Node.js 20+
- A Supabase project with the schema below applied

### Frontend

```bash
git clone https://github.com/your-org/mahjong-flow
cd mahjong-flow
npm install

# Set environment variables
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

Apply the full migration in one step:

```bash
# Paste the file contents into Supabase Dashboard → SQL Editor → Run
supabase/migrations/auth_and_quests.sql
```

The migration creates:
- `public.users` with `handle_new_user()` trigger syncing from `auth.users`
- `public.leaderboard` with unique personal-best constraint
- `public.quests_progress` with RLS (`auth.uid() = user_id`) and auto `updated_at` trigger
- Open RLS policies on `users` and `leaderboard` for anonymous score submission

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public-safe) |
| `NEXT_PUBLIC_AI_URL` | AI Coach FastAPI backend URL (use `http://127.0.0.1:8000` locally) |

### Supabase Dashboard checklist

| Step | Where |
|------|-------|
| Run migration SQL | SQL Editor → paste `supabase/migrations/auth_and_quests.sql` → Run |
| Enable Email auth | Authentication → Providers → Email |
| Enable Google OAuth | Authentication → Providers → Google → add Client ID + Secret |
| Add redirect URL | Authentication → URL Configuration → add `https://your-domain/auth/callback` |

---

## License

MIT
