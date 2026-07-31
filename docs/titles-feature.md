# Earned Titles — feature design

An **earned title** is an epithet appended to a user's name — "Harsha **the Loyal**" —
that reflects *how* they behave in Karya, not just how much XP they have. Titles are
awarded from a user's whole interaction history across three behavioural dimensions:

- **Consistency** — how frequently/reliably they complete their own tasks (streaks,
  cadence). → *the Steady, the Relentless*
- **Sociability** — how they interact with friends (comments, encouragement,
  reactions). → *the Kind, the Connector*
- **Accountability** — how they take responsibility for friends' success (vouching,
  helping others finish). → *the Loyal, the Guardian*

"Every interaction is considered" is the guiding principle — so the design is
**event-sourced**: we keep the raw signal, not just counters.

Status: **frontend renders titles from mock data today** (`FeedPage.tsx`); the engine
below is the proposal for the backend. Nothing here is built yet.

---

## Backend

### 1. Event log (the raw signal, append-only)

Every meaningful interaction appends one row. The schema already has pieces to build
on — `xp_events`, `threads` (comments), and the vouch fields on `tasks`
([backend/db/schema.sql](../backend/db/schema.sql)) — which can be unified behind a
general event table:

```
user_events(id, user_id, type, subject_id, weight, created_at)
  type ∈ { task_completed, comment_posted, vouch_given, vouch_received,
           reaction_given, friend_helped, ... }
```

Why event-sourced rather than just counters: it lets us (a) **re-compute** trait scores
when rules change, (b) **add new titles later** without having lost the history, and
(c) show **progress toward** a title. Counter-only storage can't retro-compute.

### 2. Trait scoring (aggregate → traits)

A job (nightly to start; event-triggered later) rolls events into per-user trait scores,
ideally **time-decayed** so recent behaviour weighs more than old:

```
user_traits(user_id PK, consistency, sociability, accountability, updated_at)
  score = Σ (event.weight × decay(age))   per dimension
```

Each event type contributes to one or more dimensions (e.g. `vouch_given` →
accountability + a little sociability).

### 3. Title catalog + resolver (traits → titles)

Titles are **data, not code** — a catalog where each entry is a predicate over traits
and simple counters:

```
title_catalog(id, label, dimension, predicate)     # "the Loyal": accountability ≥ X AND vouches_given ≥ N
```

A resolver evaluates the catalog for a user, writes newly-crossed titles to
`user_titles(user_id, title_id, awarded_at)`, and marks one **active** (auto-pick the
highest, or let the user choose among earned ones on a Titles screen).

### 4. API surface

- `GET /api/me` and each feed activity return `{ name, title }` where `title` is the
  **active earned title** (or null).
- `GET /api/titles` → the user's earned titles + progress toward locked ones (fuels a
  future Titles screen).
- Compute in a **service layer**, not the route handler.
- **Server-authoritative**: title text is only ever set by the backend. The client
  never sends it — otherwise anyone can spoof "the Loyal".

### MVP → full

Ship small first: a few **counter** columns (`tasks_completed`, `vouches_given`,
`comments_posted`), ~5 threshold titles, and a nightly resolver. Graduate to the full
event log + decay once it earns its kee p.

---

## Frontend

The frontend is a **pure renderer** — it never computes titles.

- Data shape: user objects carry an optional `title`. Absent → render just the name
  (covers new users). Already modelled in `FeedPage.tsx`
  (`user: { name; initials; level; title? }`).
- Styling lives in one place — the `NameWithTitle` component: the title is the sole use
  of **Cormorant** in the feed (`font-title`), rendered *italic* and **gold**
  (`text-title`, the `--title` token in `index.css`). Names stay Inter.
- Future **Titles screen**: list earned titles, let the user pick the active one, and
  show progress bars toward locked titles — reuse the `Progress` component.

## Data flow (once wired)

```
interaction  →  user_events (append)  →  nightly resolver
                                            ├─ user_traits (scores)
                                            └─ user_titles (awarded, one active)
                                                     │
                    GET /api/me · /api/feed ─────────┘  → { name, title }
                                                     │
                              NameWithTitle renders name + gold Cormorant title
```
