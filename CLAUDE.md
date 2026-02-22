# CreditMind (LoanMonk)

Gamified psychometric credit assessment for SME lending. Two-phase system:
Phase 1 = Claude-generated adaptive questionnaire, Phase 2 = behavioral mini-game (Supply Run).

## Architecture

```
Frontend (Vite + Phaser + React)  →  Vercel Serverless API  →  Supabase (PostgreSQL)
                                          ↕
                                   Anthropic Claude API
```

- **Game UI**: Phaser 3 (TypeScript) — `src/game/`
- **Admin UI**: React SPA at `/admin` — `src/admin/`
- **API**: Vercel serverless functions — `api/game/`, `api/admin/`
- **Scoring engine**: `lib/scoring/` (OCEAN, PD, behavioral, blending, profiles, loan)
- **Database**: Supabase PostgreSQL with RLS — `supabase/migrations/`

## Key Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000), proxies /api to :3001
npm run build        # Production build (game + admin)
npm run test         # Run vitest tests
npm run typecheck    # TypeScript check
npm run lint         # ESLint
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

### Server-side only (Vercel Environment Variables)
| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API for question generation |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Anon key |
| `ADMIN_SECRET` | Shared secret for admin Bearer auth |
| `GAME_SESSION_SECRET` | Session signing key |

### Client-side (VITE_ prefix, embedded in build)
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon key (public, RLS-protected) |
| `VITE_API_URL` | API base URL (leave empty on Vercel — same origin) |

## Deployment

**Vercel** (not GitHub Pages — API routes require server-side execution).

1. Import repo into Vercel
2. Set all env vars above in Vercel Project Settings → Environment Variables
3. Push to `main` → auto-deploys (game + API + admin)
4. Each PR gets a preview URL

`vercel.json` is already configured with routes, CORS headers, and function runtime.

## Database Setup

Run the migration in Supabase SQL Editor:
```
supabase/migrations/001_initial_schema.sql
```

Creates 6 tables: `admin_users`, `sessions`, `responses`, `behavioral_signals`, `assessments`, `loan_recommendations`. RLS enabled on all tables. Service role bypasses RLS. Default admin seed: `admin@creditmind.app` / `changeme`.

## Admin Dashboard

Separate SPA served at `/admin`. Uses a shared `ADMIN_SECRET` as Bearer token (not Supabase Auth).

- Login: enter the `ADMIN_SECRET` value → stored in localStorage
- Session list: filterable by risk rating, status, date
- Session detail: OCEAN charts, behavioral heatmap, PD score, loan recommendation
- Override: manual decision override with justification

API endpoints: `GET /api/admin/sessions`, `GET /api/admin/detail?id=`, `POST /api/admin/override`

## Auth Model

- **End users**: No authentication. Each game session gets a random `user_id`.
- **Admin**: Static Bearer token (`ADMIN_SECRET` env var). Not per-user auth.
- **Supabase Auth**: NOT enabled. Supabase is used as database only.
- **RLS**: Enabled. Service role (Vercel functions) bypasses. End users can only read own session status via JWT.

## API Routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/game/start` | POST | Create new session |
| `/api/game/next` | POST | Get next adaptive question (calls Claude) |
| `/api/game/complete` | POST | Finalize Phase 1, compute OCEAN + PD |
| `/api/game/behavioral-config` | GET | Phase 2 game config |
| `/api/game/behavioral-signals` | POST | Submit behavioral data |
| `/api/game/behavioral-score` | POST | Compute blended score + loan recommendation |

## Scoring Pipeline

1. **Phase 1**: Adaptive questions → OCEAN trait scores (1-5 each)
2. **PD Calculation**: Weighted risk → PD (2%-35% range)
3. **Money Profile**: Euclidean distance match to 10 profiles → PD modifier
4. **Phase 2**: Behavioral signals → normalized OCEAN scores
5. **Blending**: Phase 1 + Phase 2 weighted blend per trait
6. **Consistency Check**: Discrepancy triggers manual review if >0.40
7. **Loan Decision**: Auto-approve (<8% PD), manual review (8-18%), decline (>18%)

## Project Structure

```
api/
  game/          # 6 game API routes
  admin/         # 3 admin API routes
lib/
  scoring/       # OCEAN, PD, behavioral, blending, profiles, loan
  constants/     # Weights, thresholds, config, money profiles
  types/         # TypeScript interfaces
  utils/         # Supabase client, session helpers, Claude prompt builder
src/
  game/          # Phaser game (Phase 1 scenes, Phase 2 Supply Run)
  admin/         # React admin dashboard (login, sessions, detail)
public/          # PWA manifest, service worker, icons
supabase/        # SQL migrations
tests/           # Unit, integration, e2e tests
```
