# Karya frontend — session handoff

Everything built in this working session: new components, new pages, the design
language, the conventions we settled on, **what we got wrong**, and what comes next.

Companion docs: [frontend/COMPONENTS.md](../frontend/COMPONENTS.md) (component contract) ·
[frontend/COMPONENT-WORKFLOW.md](../frontend/COMPONENT-WORKFLOW.md) (how components get
added) · [docs/titles-feature.md](./titles-feature.md) (earned-titles engine design).

---

## 0. Status at a glance — READ FIRST

Three things, in order of urgency.

### a) There is an open PR to delete all of this

**PR #12 — "Revert 10 sasank/shadcn components", OPEN, targeting `main`.** Opened by
`sasank0501` on 2026-07-18 at 20:17 UTC — three minutes after PR #11 pushed this work from
`staging` to `main`. The branch name (`revert-10-…`) is what GitHub's **Revert button**
generates, so it reads as an un-followed-through "undo that" click. No reviews, no human
comments.

**It is −6,306 lines across 32 files:** all 14 UI components, `index.css` (the whole design
system), `lib/utils.ts` (`cn`), `HouseOnboardingPage.tsx`, every showcase page, and it strips
the `@` alias *and the Tailwind plugin* from `vite.config.js`. (GitHub's API reports
`changedFiles: 0` for this PR — that is stale; compute the diff locally against the
merge-base.)

**Merging it today would break `main`, not cleanly undo anything.** It was branched from
`63c2c1d` and `main` has moved 11 commits since — main's own `LoginPage.tsx` now imports
`@/components/ui/{button,input,label}` and `@/lib/utils`, all of which this PR deletes, while
`main.tsx` still imports the deleted `index.css`.

It would also **delete a teammate's work**: `LoginPage`/`SignupPage` are Harsha's
(`4082b75`, 2026-07-22), built on top of these components. They almost certainly don't know
this PR is open.

**Recommended: close it.** If backing out the component system is genuinely wanted, that
decision has to be re-made against today's code. Either way, settle #12 before writing more
frontend code.

### b) The branch is behind, not ahead

`sasank/shadcn-components` is **11 commits behind `origin/main` and 0 ahead**. The earlier
claim that it was "4 commits ahead with no conflicts" was read from **stale remote refs**;
after `git fetch` the picture reverses. `a3c0eae` is already contained in both `origin/main`
and `origin/staging`.

Main gained a **complete backend** and a **login/signup flow** while this session's work sat
in the working tree — see §7, which is the most changed section in this document.

### c) The session's work is uncommitted *and* now conflicts

Everything after `a3c0eae` is working-tree only:

| State | Files |
|---|---|
| Modified, unstaged | `CLAUDE.md`, `COMPONENT-WORKFLOW.md`, `COMPONENTS.md`, `package.json`, `package-lock.json`, `src/index.css`, `src/main.tsx`, `src/components/ui/input.tsx`, `src/pages/HouseOnboardingPage.tsx` |
| Untracked | `docs/`, `src/components/ui/avatar.tsx`, `src/components/ui/progress.tsx`, `src/pages/components/AvatarPage.tsx`, `src/pages/components/ProgressPage.tsx`, `src/pages/feed/` (8 files) |

A trial three-way merge (`git merge-tree`, working tree vs `origin/main`) gives the exact
damage — **one real conflict, not three**:

| File | Result |
|---|---|
| `src/main.tsx` | **auto-merges cleanly** — our feed routes and their `/login`+`/signup` land in different regions |
| `frontend/package-lock.json` | **auto-merges cleanly** |
| `src/pages/HouseOnboardingPage.tsx` | **CONFLICT** — our redesign vs Harsha's `createTeam`/`joinTeam` wiring. Resolution: our markup + their `handleContinue`. |

### The token rename is a silent break — and it's bigger than one file

The dangerous part produces **no conflict marker and no build error**. We renamed
`--house-grad-from/to`, `--house-tint`, `--house-ink` → `--primary-plum-*` (§6). Harsha's
code still uses the old names in **20 places across 3 files**:

| File | Refs |
|---|---|
| `pages/LoginPage.tsx` | 4 |
| `pages/SignupPage.tsx` | 4 |
| `pages/HouseOnboardingPage.tsx` (their side) | 6 |

Post-merge, `bg-house-tint` / `text-house-ink` are **classes Tailwind no longer generates**,
and `var(--house-grad-from)` is **undefined**. Tailwind emits nothing, CSS silently drops the
declaration: the login/signup **CTA buttons lose their gradient entirely — white text on no
background** — and logo circles and links lose their colour. `tsc`, `eslint`, `vitest` and
`vite build` **all pass**. Only a human looking at the page catches it.

Fix is mechanical: rename the 20 refs, and replace the copy-pasted
`HOUSE_GRADIENT` const with the `bg-primary-plum` utility (§3).

Per the README the PR target is **`staging`**, not `main` (`feature → staging → main`).

**How everything was verified:** `npm run type-check`, `npm run lint` (max-warnings 0),
and `npm run build` after each change — all green. **Nothing was verified visually in a
browser.** Several design decisions below are therefore unconfirmed by eye.

---

## 1. Components added (17 total now)

Three added this session via the repo's 5-step loop (document → install → **verify against
source** → showcase → use). Each had real drift from classic shadcn worth knowing:

| Component | base-nova drift we found | Showcase |
|---|---|---|
| **Tabs** | `TabsList` **has a `cva`** (`default` \| `line`) — classic shadcn has none. Root takes `orientation`. Triggers/panels pair by `value` (Base UI). | `/components/tabs` |
| **Avatar** | Ships **more than the classic three**: a `size` prop (`sm`/`default`/`lg`) plus `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`. | `/components/avatar` |
| **Progress** | **Self-contained** — `<Progress value={60}/>` renders its own track + indicator; Base UI drives the fill width. Height/colour via descendant selectors on the root `className`. | `/components/progress` |

Full inventory (17): alert-dialog, avatar, badge, button, card, checkbox, dialog,
dropdown-menu, input, label, progress, select, skeleton, sonner, tabs, textarea, tooltip.

`input.tsx` was **edited** (we own the source): light background `bg-transparent` →
`bg-card` so inputs read as tinted blocks.

---

## 2. Pages & routes

| Route | File | What it is |
|---|---|---|
| `/` | `App.tsx` | untouched API-health stub |
| `/house/new` | `HouseOnboardingPage.tsx` | House onboarding — sliding Create/Join, staged reveal, sigil picker |
| `/feed` | `feed/ReturningFeedPage.tsx` | populated activity feed |
| `/feed/new` | `feed/NewFeedPage.tsx` | new-user empty state |
| `/feed/task/:id` | `feed/TaskDetailPage.tsx` (`variant="expanded"`) | task detail as a tinted card on white |
| `/feed/task/:id/full` | `feed/TaskDetailPage.tsx` (`variant="full"`) | task detail bare, edge-to-edge |
| `/components/*` | `pages/components/*` | 6 showcase galleries |

**House onboarding** — a custom sliding Create/Join segmented control, a **live** house-name
preview (updates per keystroke, height reserved so nothing shifts), a lucide heraldic sigil
picker that reveals after the name is confirmed, a Continue CTA that appears only when both
are set, and a minimal Join-by-code stub. Frontend state only.

**Feed** — shared chrome in `feed/parts.tsx` (`FeedShell` = white screen + tinted XP header
+ tinted bottom nav). Activity cards show avatar, name + **earned title**, level, vouch
badge, task title, plum progress bar, category chips, and inert actions. Cards animate in
staggered. `NewFeedPage` reuses the same shell with an empty state.

**Task detail** — both variants are **real pages with their own footer**, sharing
`TaskDetailContent` so they can't drift. The header shows the **post's author**, not the
signed-in user. Contains task + progress, an image placeholder, and a threaded comments
card. A dev toggle on the feed picks which variant a tap opens.

---

## 3. Design language

### Colour — the Slack palette (light theme)
All in `src/index.css` as CSS variables; changing them re-themes the app with **zero
component edits**.

| Token | Value | Role |
|---|---|---|
| `--background` | white | page |
| `--card`, `--popover` | `#f3ecf4` | tinted blocks/tiles |
| `--muted`, `--secondary`, `--accent` | `#eee4ef` | tracks, chips, hover |
| `--border`, `--input` | `#ece2ed` | block borders |
| `--foreground` | `#1d1c1d` | ink |
| `--muted-foreground` | `#6b626b` | secondary ink |
| `--primary-plum-from` → `--primary-plum-to` | `#7c2e85` → `#4a154b` | brand CTA gradient (135°) |
| `--primary-plum-tint` / `--primary-plum-ink` | `#efe4f0` / `#611f69` | brand surfaces / brand ink |
| `--title` | gold | earned-title colour |

The gradient is exposed once as a Tailwind utility: `@utility bg-primary-plum`. Used by the
House toggle pill, Continue, the feed's create button, and progress fills — **one
definition, two pages**.

### Type
- **Inter** (`--font-sans`) for all UI text.
- **Cormorant** (`--font-title` → `font-title`) is **reserved** — earned titles and the
  brand wordmark only, rendered italic + gold. Self-hosted via `@fontsource-variable/*`.

### Motion
One consistent vocabulary, all `tw-animate-css`:
- **Entrances**: `animate-in fade-in slide-in-from-bottom-4` (+ staggered
  `animationDelay` for feed cards).
- **Things that move while on screen**: plain `transition-transform` (the sliding pill).
  *These are different mechanisms — picking the wrong one is why an animation "spawns"
  instead of gliding.*
- **Origin-aware zoom** (task detail): see §5.

---

## 4. Conventions established

- **Feature pages** live in `src/pages/`; **showcases** in `src/pages/components/`.
  Routes registered in `main.tsx` — a file is invisible until routed.
- **Module split for Fast Refresh** (learned the hard way, §6): a `.tsx` file must export
  **only components**. Data/types → `.ts` (`feed/data.ts`), helpers/constants → `.ts`
  (`feed/utils.ts`). Mixing kills HMR.
- **Colour never hardcoded** — always a token, so theming stays possible.
- **Naming**: `user.title` (earned epithet) vs `Activity.title` (task title) — deliberately
  on separate paths to avoid collision.
- **Inert-by-design stubs** call `notReady(label)` → a toast, so nothing fails silently.
- Docs are a living contract: `COMPONENTS.md` updated **before** using a component;
  `CLAUDE.md` current-state refreshed after each addition.

---

## 5. Custom controls — and why not the shadcn one

Two places where the installed component genuinely couldn't do the job:

1. **Sliding Create/Join toggle** (House) — base-nova `Tabs` gives **each trigger its own
   background**, so switching makes the active state *appear in place* ("spawn"). A smooth
   slide needs **one shared pill** that translates. Built custom; noted in `COMPONENTS.md`.
2. **Task-detail open animation** — `Dialog`'s enter animation is fixed/centred and can't
   take a **dynamic per-open `transform-origin`**. Built a custom page transition.

**The origin technique** (`feed/utils.ts` → `originFromEvent`): on tap, walk up to the
enclosing `[data-slot="card"]`, take its centre in viewport pixels, and use that as the
detail container's `transform-origin` with `animate-in fade-in zoom-in-95`. Because a
`fixed inset-0` element shares the viewport's coordinate space, a top card grows from the
top, a middle card from the middle, a bottom card from the bottom — **no per-position
special-casing**. The origin travels to the detail route via router state, with a centred
fallback for deep links.

**Threaded comments** (`feed/CommentThread.tsx`) — a recursive `CommentNode`, Reddit-style
indent with a left rule, capped at 4 levels so deep threads don't run off a phone. Replies
are **functional in local state** (recursive `addReply`), lost on refresh.

---

## 6. What we got wrong — the honest record

Kept because the lessons generalise.

| What happened | Fix / lesson |
|---|---|
| Documented Tabs as "no variants" from memory; the source had a `cva` on `TabsList`. | **Always verify against generated source** — the repo's own workflow rule exists for this. |
| Named the brand tokens `--house-*`. | Wrong abstraction — it's a *primary brand colour*, not a House-screen colour. Renamed `--primary-plum-*` so future themes can add siblings. **Caught by the user, not me.** |
| House name preview was conditionally rendered → the form **jumped** when it appeared. | Reserve space with `min-h-7` and animate opacity instead of mounting. |
| Preview only appeared after pressing the arrow. | User wanted it **live per keystroke**; decoupled from submit. |
| After removing the placeholder text, an empty `<span>` was left behind. | Dead markup — the whole `|| fallback` should go; React renders empty content as nothing and CSS reserves the height. |
| Rounded the header/footer for "smooth edges". | **Misread the request** — user disliked it, fully reverted. The likelier issue (footer bleeding full-width on desktop) is still unaddressed. |
| `parts.tsx` exported `ACTIVITIES` + components together. | **Broke Vite Fast Refresh** ("export is incompatible"). Split into `data.ts` / `utils.ts`. |
| A Vite parse error appeared mid-refactor. | Sequential edits left a transient broken state the watcher caught. Not a real bug — but batch related edits when possible. |
| Feed screen used `bg-muted/30`; retinting `--muted` would have purple-washed the page. | Caught before shipping — changed to `bg-background`. Token changes have blast radius. |
| Assumed `.dc.html` design files could be rendered. | They're a proprietary Design Canvas format — readable as **source only**, never as pixels. |
| Repeatedly claimed things looked right. | **Everything was verified by type-check/lint/build, never visually.** Treat all visual claims in this doc as unconfirmed. |
| **Read git state without fetching.** Reported "4 commits ahead, no conflicts, PR #10 open." The truth after `git fetch`: **11 behind, 0 ahead, PR #10 long merged, PR #12 open to revert it,** and three files in conflict. | The worst error here — it made §0 and §7 confidently wrong, and the whole feed was designed around a backend that **already existed**. `git fetch` before *any* claim about remote state; local refs are a cache, not the truth. |
| Built the entire feed against mock data and a hand-written `TODO(backend)` gap list. | The endpoints had **already shipped** on `main` (§7). Check the actual API surface before declaring it missing — that list cost a page of speculative design. |

**Known off-token leftovers:** the "Vouched" badge green (`emerald-*`) and `text-white` on
plum CTAs are hardcoded, outside the token system.

---

## 7. Backend reality — **this section was inverted; read it again**

The feed was built against "the API exposes only `/health` and `/api/tasks`." **That is no
longer true, and it is the single most important correction in this document.** While this
session worked in an unfetched tree, `main` gained a full FastAPI backend (routers for
`auth`, `tasks`, `teams`, `users`) *and* a 358-line typed client at `src/lib/api.ts`.

**All of it is Harsha's** — every commit on `main` since `a3c0eae` is theirs: `595406e`
(the API), `b455a05`/`6a7aabb` (Railway deploy), `4082b75`/`12e867f` (login/signup, API
wrappers, ~890 lines of tests). The ownership split is clean — **this session owns the
frontend design system, Harsha owns the backend and auth screens** — with exactly one file
overlapping: `HouseOnboardingPage.tsx`, where their API wiring meets our redesign. Ask
Harsha before changing API shapes (§7 mismatches).

**Nearly every gap the feed's `TODO(backend)` block lists is now filled.** That comment is
obsolete and actively misleading — delete it when wiring up.

| `data.ts` TODO | Status | Real endpoint / client fn |
|---|---|---|
| 1. feed endpoint | **exists** | `GET /teams/{id}/feed` → `getTeamFeed()` |
| 2. user on activities | **exists** | `FeedItem.doer_id` / `doer_username` |
| 3. current user | **exists** | `GET /auth/me` → `getMe()`; `GET /users/{id}/xp` → `getUserXp()` (level, floor, next) |
| 4. vouch state | **exists** | `FeedItem.requires_vouch` / `vouched`; `POST /tasks/{id}/vouch` |
| 5. categories | **exists** | `FeedItem.category_name`; `GET /teams/{id}/categories` |
| 6. per-task progress | **exists** | `FeedItem.intermediary_progress` |
| 7. task detail | **exists** | `GET /tasks/{id}` → `getTask()` |
| 8. comments | **exists** | `GET/POST /tasks/{id}/thread` → `getThread()` / `postReply()` |
| 9. create task | **exists** | `POST /tasks` → `createTask()` |
| 10. attachments | **exists** | `GET/POST /tasks/{id}/attachments` |

Also landed: **auth** (`register`/`login`/`me`), **join-by-code** (migration
`001_team_invite_code.sql` adds `teams.invite_code`; `POST /teams/join`), **reactions**
(migration `002`), **leaderboard**, and **member management**.

### Mismatches to resolve when wiring

The API's shape and the feed's mock shape are close but **not identical** — this is design
work, not plumbing:

- **Category is singular** (`category_name: string | null`); our `ActivityCard` renders an
  **array** of chips. Either loosen the UI or extend the API.
- **No `level` on `FeedItem`** — the per-card "Lv 16" needs a second call (`getUserXp`) or a
  backend join. Don't N+1 this per card.
- **`ThreadPost` is flat** (`task_id, user_id, username, posted_at, reply`) — there is **no
  `parent_id`**. Our Reddit-style nesting **cannot be persisted** as-is. Needs a schema
  change (self-referencing `parent_id`) or the thread degrades to a flat list.
- **Earned titles don't exist server-side.** `user.title` is pure mock. See
  [titles-feature.md](./titles-feature.md).
- **Houses still have no sigil column** — the picker's selection has nowhere to go.
- **`reply_count` and `reactions[]` exist and we don't render them** — free wins.

---

## 8. Next steps

**Immediate — in this order**
1. **Resolve PR #12** (the open revert of this whole component system). Nothing else matters
   until that's settled.
2. **Commit the working tree**, then **rebase/merge `origin/main`** (11 commits behind).
   Resolve the three known conflicts from §0c — and specifically check that the House page
   ends up on `bg-primary-plum`, not the deleted `--house-grad-*`.
3. **Delete the `TODO(backend)` block in `feed/data.ts`** — it describes a backend that no
   longer matches reality (§7).
4. **Wire the feed to `getTeamFeed()`**, resolving the shape mismatches in §7 as you go.
   This is now unblocked and is the highest-value next feature.
5. **Pick a task-detail variant** (expanded vs full page), delete the loser, drop the dev
   toggle.
6. **Eyeball everything in a browser** — especially the origin animation, the tint-on-tint
   contrast (cards `#f3ecf4` vs brand tint `#efe4f0`), and dark mode.

**Design debt**
7. **Dark mode is partly themed** — more precisely than stated earlier: the **brand** tokens
   *are* defined for dark (`--primary-plum-*`, `--title` all have `.dark` values), but the
   **neutral surfaces** (`--background`, `--card`, `--muted`, `--border`) are still the stock
   neutral-greys. So dark mode works but **loses the purple-tinted-block character** that
   defines the light theme. Retint the dark neutrals or accept the split deliberately.
8. Tokenize the leftover hardcoded colours (vouch green, `text-white`).
9. Add an **exit animation** for closing the detail (it currently unmounts instantly).
10. Revisit the bottom nav bleeding full-width on desktop.

**Features**
11. **Replace the new-vs-returning route split with auth.** `/feed/new` vs `/feed` was a
    workaround for having no login. `getMe()` now exists — branch on whether the user has
    activity and drop the second route.
12. **Threaded comments need a schema change** to persist: `ThreadPost` has no `parent_id`
    (§7). Until then `CommentThread.tsx` stays local-state-only.
13. **Theme switcher** — `next-themes` is already installed but **no `ThemeProvider` is
    mounted**. Mount it in `main.tsx`, add a Sun/Moon toggle; colour themes then come from
    sibling `--primary-*` token sets.
14. **Titles engine** — fully designed in [titles-feature.md](./titles-feature.md); nothing
    built. Start with counters + threshold titles before event-sourcing.
15. Wire the remaining nav tabs (only **Feed → `/feed`** works today); Profile can now point
    at real user endpoints, and `/login` + `/signup` already exist on main.
16. Build the task-create flow behind the "+" button — `createTask()` is ready.

**Housekeeping**
17. Add `.gitattributes` (`* text=auto eol=lf`) — Windows `core.autocrlf` is producing
    CRLF warnings on every commit.
18. Remove `@fontsource-variable/geist` (unused since the Inter switch).
19. Remove the dev toggles (`/feed` detail switch) once auth decides these states.
20. **Reconcile the two showcase/test conventions** — this session added showcase pages under
    `src/pages/components/`; main added a `frontend/tests/` suite. Neither knows about the
    other. None of the feed work has tests.
