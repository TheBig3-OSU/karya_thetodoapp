# Karya frontend — context for Claude

Karya is a gamified todo app (tasks earn XP). This is the **frontend**; the backend lives in `../backend`.

**Learning context:** the maintainer is learning frontend from zero. Teach-first — explain the concept, then have them do the key steps themselves. Don't add automation layers or scaffold ahead of the lesson. Prefer the smallest change that teaches the idea.

## Read these first
- **`COMPONENTS.md`** — the living inventory/contract of every UI component: import line, what Karya feature uses it, variants, states. Check it before building UI; update it before adding a component.
- **`COMPONENT-WORKFLOW.md`** — how and *why* the component system is built: what shadcn/ui actually is, the setup, the variant/state/attribute model, and the 5-step loop for adding a component.

Don't duplicate those here — link to them.

## Stack
- **React 18 + TypeScript + Vite 5**
- **Tailwind CSS v4** — config lives in CSS (`src/index.css`), **no `tailwind.config.js`**. `@theme inline` turns CSS variables into utilities; rebranding = editing the variables in that one file.
- **Fonts** — **Inter** (`--font-sans`) for all UI text; **Cormorant** (`--font-title`, `font-title`) is *reserved* for earned titles and the brand wordmark only. Self-hosted via `@fontsource-variable/*`. Earned titles render gold via the `--title` token. See [docs/titles-feature.md](../docs/titles-feature.md).
- **Palette (light)** — the **Slack** scheme: white page (`--background`), cool purple-tinted **blocks** (`--card`/`--muted`/`--secondary` ≈ `#f3ecf4`/`#eee4ef`), `#611f69` brand ink, and the `#7c2e85→#4a154b` aubergine CTA gradient (`bg-primary-plum`, 135°). Dark mode still uses the neutral-dark tokens.
- **shadcn/ui, `base-nova` style** — components are *copied into the repo* (`src/components/ui/`), not a dependency. We own and edit that source. Built on **Base UI** primitives (`@base-ui/react`), not Radix.
- **react-router-dom v7** for routing.
- `@/` alias = `src/`, declared in **both** `tsconfig.json` and `vite.config.js` (must agree).
- `cn()` helper (`src/lib/utils.ts`) merges classes and resolves Tailwind conflicts; every component accepts `className` overrides.

## Current state (as of this file)
- **17 UI components installed & owned** in `src/components/ui/`: button, input, textarea, label, checkbox, card, badge, select, dropdown-menu, dialog, alert-dialog, sonner, skeleton, tooltip, tabs, avatar, progress. All documented in `COMPONENTS.md`.
- **`src/App.tsx` is still a bare skeleton** — it checks API health and renders tasks as a plain `<ul>`. The real task UI (cards, dialogs, XP badges) is **not built yet**; the installed components aren't wired into the app.
- **Showcase pages** live in `src/pages/components/`, built from `_shared.tsx` (`ShowcasePage` + `Example`: live component on top, code below). **Six** are written and routed so far: Button, Badge, Dialog, Tabs, Avatar, Progress (`/components/<name>`). `COMPONENTS.md` lists showcase routes for the others, but those pages don't exist yet.
- **Feature pages** (real app screens, not showcases) live directly under `src/pages/`, both **frontend-only with mock data** (no matching API yet):
  - **House onboarding** at `/house/new` (`HouseOnboardingPage.tsx`) — sliding Create/Join toggle, staged reveal, lucide sigil picker, styled from the `--primary-plum-*` brand tokens in `index.css`.
  - **Activity feed** — routes share `pages/feed/parts.tsx` (`FeedShell`, cards, `BottomNav`): **returning** at `/feed` (`ReturningFeedPage.tsx`), **new** at `/feed/new` (`NewFeedPage.tsx`). Tapping a card opens the **task detail** as its own page, animating out of the tapped card's position (origin passed via router state): `/feed/task/:id` (**expanded** — white page, one lavender card wrapping the task with white proof + white nested comments card, i.e. "a feed card opened up") and `/feed/task/:id/full` (**full page** — white page, task bare, lavender proof + lavender comments). A dev toggle on the feed picks which. The proof block is a **typed mock** (`ProofBlock` in `TaskDetail.tsx`): image / link / PDF renderings driven by `Activity.proof` in `data.ts`, plus an inert "Add proof" upload state when absent — all placeholder, no backend. Comments are a **Reddit-style thread** (`CommentThread.tsx`) in their own card; replies work in local state only. Mock data; nav is inert except **Feed → /feed**. `TODO(backend)` block in `data.ts` lists the endpoints/fields still needed.
- Routes are registered in `src/main.tsx`, which mounts `<TooltipProvider>` and `<Toaster />` (sonner) once around the app.
- **API layer:** `src/lib/api.ts` — `fetchHealth()`, `fetchTasks()`, and the `Task` type. API base comes from env (`.env.example`).

## Conventions
- Files are **kebab-case** (`dropdown-menu.tsx`); components are **PascalCase** (`DropdownMenu`). In JSX, capitalization is load-bearing: `<input>` = raw HTML, `<Input>` = our component.
- **Three-concept model** (see workflow doc §3): *variant* = visual style chosen in code via prop; *state* = automatic reaction to conditions (hover/focus/disabled/invalid); *type/attribute* = behavior on the underlying HTML. "Value states" (checkbox checked, dialog open) are driven by our data. Keep these distinct in docs and code.
- Variants live in a `cva()` map inside the component; adding a variant = adding one key. States live inside each variant string as Tailwind pseudo-prefixes.
- When adding a component, follow the 5-step loop in the workflow doc: document requirement → install (`npx shadcn@latest add <name>`) → **verify the doc against the generated source** (docs drift both ways) → showcase page → use it.

## Commands (run from `frontend/`)
- `npm run dev` — Vite dev server
- `npm run build` — runs `tsc --noEmit` (type-check) then `vite build`
- `npm run type-check` — `tsc --noEmit`
- `npm run lint` — eslint (max-warnings 0)
- `npm run test` — vitest

## Roadmap (finalized, not built)
login/signup, messaging, comments on tasks, group vouch, T&C acceptance. Uses tied to these must be tagged `(planned:)` in `COMPONENTS.md`.
