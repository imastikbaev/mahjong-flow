<div align="center">

<br />

# Mahjong Flow

**A cognitive focus tool built as a 3D Mahjong Solitaire puzzle.**  
Structured play over passive scrolling. Flow state over frustration.

<br />

<img src="demo.gif" width="720" alt="Mahjong Flow demo" />

### 🚀 **[Play Live Demo on Vercel](https://your-vercel-link.vercel.app)**
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

Two tables: `users` (uuid, nickname, city) and `leaderboard` (user\_id, date, score, time\_seconds, type). Scores are upserted with a unique constraint on `(user_id, date, type)` — only the personal best survives. No auth dependency; the client generates a stable UUID on first visit.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 + React 19 (App Router) |
| Styling | Tailwind CSS v4, glassmorphism surfaces |
| Animation | Framer Motion 12 |
| State | Zustand 5 |
| Icons | lucide-react |
| Database | Supabase (PostgreSQL via PostgREST) |
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

```sql
-- users
create table users (
  id         uuid primary key,
  nickname   text not null,
  city       text,
  is_pro     boolean default false,
  created_at timestamptz default now()
);

-- leaderboard
create table leaderboard (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id),
  date         date not null,
  time_seconds int  not null,
  score        int  not null,
  type         text check (type in ('daily', 'practice')),
  created_at   timestamptz default now(),
  unique (user_id, date, type)
);

-- open RLS for client-side upserts
alter table users       enable row level security;
alter table leaderboard enable row level security;
create policy "public_users"       on users       for all using (true) with check (true);
create policy "public_leaderboard" on leaderboard for all using (true) with check (true);
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public-safe) |

---

## License

MIT
