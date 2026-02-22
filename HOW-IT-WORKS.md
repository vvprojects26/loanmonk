# How CreditMind Works

CreditMind is a psychometric credit assessment disguised as a 3-minute mobile game. It measures Big Five (OCEAN) personality traits through two phases, then converts those traits into a Probability of Default (PD) score used for SME lending decisions.

The applicant never sees scores, traits, or lending language. They play a game. We measure everything.

---

## The Two Phases

### Phase 1: Adaptive Questionnaire (~2 minutes)

The applicant answers 8-15 scenario-based questions. These are not personality quiz questions — they're business dilemmas ("Your restaurant gets a bulk discount offer but you'd need to skip rent this month...").

**How questions are generated:**

1. The backend calls Claude with the applicant's current trait variances (which traits still need measurement)
2. Claude generates 3 candidate questions in different formats (grid, slider bars, budget allocation, timeline, reaction, tradeoff)
3. The system picks the question that targets the highest-variance trait
4. After each answer, trait variances update — when all 5 traits have variance below 0.30, Phase 1 ends
5. This means confident applicants finish in 8 questions, ambiguous ones go up to 15

**Question formats:**
- **Grid**: 2x2 choice matrix (quick, forces tradeoff)
- **Bars**: Drag sliders to allocate weight between competing priorities
- **Budget**: Allocate a fixed amount across categories
- **Timeline**: Choose when to act (now vs. later, measuring impulsivity)
- **Reaction**: Timed response to a sudden scenario (measures N under pressure)
- **Tradeoff**: Pick between two mutually exclusive business options

Each response maps to 1-3 OCEAN traits with a score of 1.0-5.0. Response time and hesitation are also recorded.

### Phase 2: Supply Run Mini-Game (60 seconds)

A top-down delivery game built in Phaser 3. The applicant drives a cart around a village, picking up crates from a warehouse and delivering them to customers.

**What the applicant sees:** A simple, fun delivery game with a score counter.

**What we measure (10 behavioral signals):**

| Signal | What it reveals | Maps to |
|---|---|---|
| **Cargo stacking** (BART) | How many crates they load before delivering — more crates = higher risk of tip-over and losing everything | Risk tolerance (N, C) |
| **Banking frequency** | How often they deliver partial loads to "bank" safe points | Loss aversion (C, N) |
| **Path efficiency** | Shortest-path vs. wandering | Planning ability (C) |
| **Exploration ratio** | % of map tiles visited | Openness (O) |
| **Crowd vs. quiet time** | Time spent near NPCs vs. alone | Extraversion (E) |
| **Sharing events** | Giving crates to helper NPCs | Agreeableness (A) |
| **Tap velocity** | Speed/urgency of movement inputs | Impulsivity (N, C) |
| **Loss recovery** | Behavior after losing cargo (give up vs. try harder) | Emotional stability (N) |
| **Multi-order handling** | Juggling multiple deliveries at once | Executive function (C, O) |
| **Event responses** | Reactions to random events (thief, shortcut, premium customer) | Adaptability (O, E) |

**The BART mechanic is key:** The Balloon Analogue Risk Task is the most validated behavioral risk measure in psychology. Here it's disguised as cargo stacking — each extra crate increases reward but the tip-over probability escalates: 0%, 5%, 15%, 30%, 50%, 75%, 90%. Most people bank at 3-4 crates. Risk-takers push to 5-6.

---

## Scoring Pipeline

### Step 1: OCEAN Trait Scores (Phase 1)

Each question response maps to a trait score. After all questions, the system computes average scores per trait:
- **O**penness: 1.0 - 5.0
- **C**onscientiousness: 1.0 - 5.0
- **E**xtraversion: 1.0 - 5.0
- **A**greeableness: 1.0 - 5.0
- **N**euroticism: 1.0 - 5.0

### Step 2: PD Calculation

Traits convert to risk contributions (C is inverted — low conscientiousness = high risk):

```
Risk_C = (5 - C) / 4     ← inverted
Risk_N = (N - 1) / 4     ← direct
Risk_A = (A - 1) / 4
Risk_O = (O - 1) / 4
Risk_E = (E - 1) / 4
```

Weighted risk (based on Nyhus & Webley 2001, Donnelly et al. 2012):

```
WeightedRisk = 0.35×Risk_C + 0.25×Risk_N + 0.18×Risk_A + 0.12×Risk_O + 0.10×Risk_E
```

Map to PD (calibrated 2%-35% range):

```
PD = clamp(0.02 + WeightedRisk × 0.33, 0.02, 0.35)
```

### Step 3: Money Attitudinal Profile

The system matches the applicant's OCEAN scores to one of 10 profiles using Euclidean distance:

| Profile | Key traits | PD modifier |
|---|---|---|
| Prudent Planner | High C, Low N | -3% |
| Anxious Saver | High N, Moderate C | -1% |
| Social Spender | High A, High E | +2% |
| Impulsive Optimist | High O, Low N, Low C | +5% |
| Cautious Traditionalist | Low O, High C | -2% |
| Balanced Operator | All moderate | 0% |
| Driven Achiever | High C, High E, Low N | -1% |
| Cautious Innovator | High O, High C | -2% |
| Social Planner | High A, High C | -1% |
| Stressed Reactor | High N, Low C | +6% |

The modifier adjusts PD up or down based on attitudinal fit.

### Step 4: Behavioral Blending (Phase 2)

Phase 2 behavioral signals produce a second set of OCEAN scores (0.0-1.0 normalized). These blend with Phase 1:

| Trait | Phase 1 Weight | Phase 2 Weight | Why |
|---|---|---|---|
| C | 55% | 45% | Behavior strongly reveals planning discipline |
| N | 50% | 50% | Equally measurable both ways |
| A | 60% | 40% | Harder to measure in a solo game |
| O | 45% | 55% | Exploration behavior is very revealing |
| E | 55% | 45% | Moderate behavioral signal |

### Step 5: Consistency Check

The system computes the discrepancy between Phase 1 (what they said) and Phase 2 (what they did):

| Consistency Score | Interpretation | Action |
|---|---|---|
| < 0.20 | Highly consistent | Trust scores |
| 0.20 - 0.40 | Normal variance | Trust scores |
| 0.40 - 0.60 | Moderate discrepancy | Flag for review |
| > 0.60 | High discrepancy (possible gaming) | Force manual review |

### Step 6: Loan Decision

| PD Range | Decision | Loan Terms |
|---|---|---|
| < 8% | Auto-approve | Up to $50K, 36mo, 8.5% APR |
| 8% - 18% | Manual review | Up to $25K, 24mo, 14% APR |
| > 18% | Decline / escalate | Up to $10K, 12mo, 22% APR |

Consistency score > 0.40 forces manual review regardless of PD.

---

## Admin Dashboard

Accessible at `/admin`. Protected by a shared secret (`ADMIN_SECRET` env var), not per-user accounts.

**What admins see:**
- Session list with filters (risk rating, status, date range)
- Per-session detail: OCEAN radar chart, PD breakdown, behavioral heatmap, consistency index
- Loan recommendation with basis for each parameter
- Override capability: approve/decline with justification

**Admin auth:** Enter the `ADMIN_SECRET` on the login page. It's stored in localStorage and sent as a Bearer token. This is a static shared secret, not Supabase Auth. The `admin_users` table exists in the schema but is not currently used for authentication — it's a placeholder for future per-user admin accounts.

---

## Security Model

- **Anthropic API key**: Server-side only. Never reaches the browser. Stored in Vercel Environment Variables.
- **Supabase service key**: Server-side only. Used by Vercel functions to bypass RLS.
- **Supabase anon key**: Client-side (embedded in build). RLS restricts access — users can only read their own session status.
- **Supabase Auth**: Not enabled. Supabase is used purely as a PostgreSQL database.
- **Admin secret**: Server-side env var. Client stores it in localStorage after manual entry.
- **User identity**: No authentication. Each session gets a random `user_id`. The applicant is anonymous.
- **RLS**: Enabled on all 6 tables. Service role (Vercel) bypasses. End users have read-only access to their own session row.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Game engine | Phaser 3.80 (TypeScript) |
| Admin UI | React 18 + React Router 6 + Recharts |
| Build tool | Vite 5 (multi-entry: game + admin) |
| API | Vercel Serverless Functions (Node.js) |
| Database | Supabase (PostgreSQL + RLS) |
| AI | Anthropic Claude (question generation) |
| PWA | Service worker + manifest (offline static caching) |

---

## Data Flow

```
Applicant opens PWA
  → POST /api/game/start (creates session)
  → Loop:
      POST /api/game/next (Claude generates question)
      Applicant answers
      (repeat until trait variances converge)
  → POST /api/game/complete (compute Phase 1 OCEAN + PD)
  → Supply Run game starts (60 seconds)
      Behavioral signals captured frame-by-frame
  → POST /api/game/behavioral-signals (store raw data)
  → POST /api/game/behavioral-score (blend, consistency, loan decision)
  → Applicant sees result screen (money profile, not raw scores)

Admin opens /admin
  → Enters ADMIN_SECRET
  → GET /api/admin/sessions (browse all assessments)
  → GET /api/admin/detail?id=xxx (full breakdown)
  → POST /api/admin/override (manual decision change)
```
