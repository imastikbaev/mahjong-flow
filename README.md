<div align="center">

# Mahjong Flow

**[Live Demo](https://2stage.vercel.app)** &nbsp;·&nbsp; **[AI Coach API](https://your-python-backend.onrender.com/docs)**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square)](https://nextjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-postgres-3ECF8E?style=flat-square)](https://supabase.com)
[![License](https://img.shields.io/badge/license-MIT-white?style=flat-square)](LICENSE)

</div>

---

## Table of Contents

1. [Abstract](#abstract)
2. [Core Philosophy](#core-philosophy)
3. [Architecture](#architecture)
4. [Key Engineering Solutions](#key-engineering-solutions)
5. [Business Logic](#business-logic)
6. [Tech Stack](#tech-stack)
7. [Installation](#installation)
8. [Database](#database)
9. [Environment Variables](#environment-variables)

---

## Abstract

Mahjong Flow is a 3D Mahjong Solitaire implementation built as a cognitive focus tool. The board engine operates on a coordinate-based tile graph; freedom is evaluated geometrically per tile in O(n) time. A FastAPI microservice runs a heuristic dead-end probability model on every board state and returns ranked advice. Supabase provides persistent auth, a global leaderboard, and a quest-progress store with atomic increment via PL/pgSQL.

---

## Core Philosophy

A 144-tile Turtle layout is a bounded, deterministic problem space. Every move has a traceable consequence; there is no randomness after the deal. The brain operating on a problem with this property enters narrow-focus — the same cognitive state as deep work.

The product is positioned as a structured alternative to passive consumption, not as entertainment. The design principle that follows: a session should end with the user feeling clearheaded, not depleted. There are no push notifications, no infinite scroll, no variable reward loops. The timer exists to measure the user, not pressure them.

---

## Architecture

```
Browser (Next.js 16 App Router)
  │
  ├── Zustand store          tile graph, game mode, sprint, skin, history
  ├── React components       board, modals, sidebar panels, FABs
  ├── @supabase/ssr client   auth session, leaderboard upsert, quest RPC
  │
  ├── /auth/callback         route handler: exchanges OAuth code for session cookie
  └── middleware.ts          refreshes Supabase session cookie on every request

Supabase (PostgreSQL + PostgREST + Auth)
  │
  ├── auth.users             managed by Supabase Auth
  ├── public.users           synced via handle_new_user() trigger on INSERT
  ├── public.leaderboard     personal-best upsert (user_id, date, type)
  └── public.quests_progress atomic increment via increment_quest_progress() RPC

FastAPI (Python 3.11+)
  │
  ├── BoardAnalyzer          mirrors isTileFree() logic from the TypeScript store
  ├── HeuristicPredictor     weighted sigmoid over 8 board features
  └── /api/analyze-board     stateless: client sends full tile array on every call
```

Auth flow:

```
signInWithOAuth / signInWithPassword
  → Supabase redirects to /auth/callback
  → route.ts: exchangeCodeForSession()
  → session cookie set
  → middleware.ts refreshes cookie on every subsequent request
  → useAuthUser(): onAuthStateChange mirrors live session state
```

---

## Key Engineering Solutions

### 1. Coordinate-based tile freedom engine

Tile freedom is computed geometrically without a graph traversal. A tile at `(x, y, z)` is free when:

- No tile occupies `z+1` within `±1` unit on both x and y axes (nothing above).
- At least one of `(x-2, y, z)` or `(x+2, y, z)` is unoccupied (one lateral side open).

This check runs in O(n) per tile against the active tile list. The Python microservice mirrors the identical predicate so board analysis and browser state are always in agreement.

### 2. Heuristic dead-end probability model

`HeuristicPredictor` computes a weighted linear combination of eight features extracted from the board state, then passes the result through a sigmoid:

| Feature | Weight | Rationale |
|---------|--------|-----------|
| `1 - mobility` | 2.5 | Low move variety is the strongest leading indicator of a dead end |
| `isolation_ratio` | 2.0 | Types with one free tile and a buried partner approach irreversibility |
| `1 - free_ratio` | 1.5 | Dense coverage reduces future options nonlinearly |
| `mean_burial_depth` | 0.8 | Lagging indicator of overall board openness |
| Zero pairs (hard penalty) | 3.0 | Board is already stuck |

The architecture uses a `Predictor` ABC. Swapping in a trained CatBoost model requires implementing one method (`predict(features) -> float`) and no changes to the endpoint.

### 3. Atomic quest progression via PL/pgSQL

The client previously read `current_value`, incremented it, then wrote back — a classic TOCTOU race when two game events fire within the same request cycle. The replacement is a server-side function:

```sql
create or replace function public.increment_quest_progress(
  u_id uuid, q_id text, inc_val int
)
returns table (current_value int, is_completed boolean)
language plpgsql security definer as $$
declare
  _row  public.quests_progress%rowtype;
  _new  int;
begin
  select * into _row from public.quests_progress
  where user_id = u_id and quest_id = q_id
  for update;                          -- row-level lock for duration of txn

  if not found or _row.is_completed then return; end if;

  _new := least(_row.current_value + inc_val, _row.target_value);

  update public.quests_progress
  set current_value = _new, is_completed = (_new >= _row.target_value)
  where user_id = u_id and quest_id = q_id;

  return query select _new, (_new >= _row.target_value);
end; $$;
```

The browser calls `supabase.rpc('increment_quest_progress', { ... })` — one network round-trip, no race condition possible.

---

## Business Logic

The freemium model is UI-driven: the upgrade sells a measurably better cognitive experience rather than locked features.

| Tier | Skin | Symbol system | Cognitive load |
|------|------|---------------|----------------|
| Free | Classic | Unicode Mahjong glyphs (🀙 🀐 🀇) | Higher — character recognition required |
| Pro | Elemental | Lucide icon system (Earth / Water / Fire / Air) | Lower — abstract shapes reduce visual parsing time |

The free tier is fully playable. Pro additionally unlocks Undo, Sprint mode, and the AI Coach panel. The AI Coach is gated at the UI level: the sidebar panel renders only when `isPro === true`; the FAB offers an upgrade prompt otherwise.

Quest progress and leaderboard participation require a free account (email/password or Google OAuth). Anonymous play stores state in `localStorage` only.

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
| AI Backend | FastAPI + Python 3.11, uvicorn |
| Fonts | Geist (variable, `next/font`) |
| Deployment | Vercel (frontend), Render / Railway (AI backend) |

---

## Installation

```bash
git clone https://github.com/imastikbaev/mahjong-flow
cd mahjong-flow
npm install
cp .env.local.example .env.local   # fill in Supabase + AI URL
npm run dev
```

AI backend:

```bash
cd ai-coach
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Database

Apply migrations in order via Supabase Dashboard → SQL Editor:

```
supabase/migrations/auth_and_quests.sql          -- users trigger, quests_progress, RLS
supabase/migrations/increment_quest_progress.sql -- atomic RPC function
```

The migrations are idempotent (`create or replace`, `drop trigger if exists`, `create table if not exists`).

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key — public-safe |
| `NEXT_PUBLIC_AI_URL` | AI Coach base URL. Use `http://127.0.0.1:8000` locally |

### Supabase Dashboard checklist

| Step | Location |
|------|----------|
| Run both SQL migrations | SQL Editor |
| Enable Email provider | Authentication → Providers → Email |
| Enable Google OAuth | Authentication → Providers → Google |
| Add redirect URL | Authentication → URL Configuration → `https://<domain>/auth/callback` |

---

## License

MIT
