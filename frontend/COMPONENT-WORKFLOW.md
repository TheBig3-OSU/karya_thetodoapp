# Karya UI: how we build and document components

A guide to our component system — what shadcn/ui is, how it was set up, the
concepts behind it, and the workflow to follow for every component.

Companion docs: [COMPONENTS.md](./COMPONENTS.md) (the component requirements
inventory) · DEPENDENCIES.md (what every package is for).

---

## 1. What shadcn/ui actually is

**shadcn is not a component library — it's a code generator.** Libraries like
MUI live in `node_modules` as black boxes. shadcn instead *copies source code
into our repo*: running `npx shadcn@latest add button` creates
`src/components/ui/button.tsx`, and from then on that file is **ours** — we
read it, edit it, and own it. There is no version to upgrade and no API we're
locked into.

Each component is built from two ingredients:

- **Base UI primitives** (`@base-ui/react`) — headless, unstyled components
  that handle the hard parts: keyboard navigation, focus trapping,
  accessibility. (Classic shadcn used Radix; our `base-nova` style uses Base UI.)
- **Tailwind CSS classes** — all of the styling.


## 2. The setup 


1. **Tailwind CSS v4** — installed as `tailwindcss` + `@tailwindcss/vite`
   plugin. v4 has **no `tailwind.config.js`**: configuration lives in CSS.
   Old tutorials showing config files + `@tailwind base;` directives are v3.
2. **The `@/` import alias** — `@/` means `src/`. Declared in **two places
   that must agree**: `tsconfig.json` (`paths`) for TypeScript/editor, and
   `vite.config.js` (`resolve.alias`) for the bundler. Configure only one and
   you get red squiggles or build failures.
3. **`src/index.css`** — the design system. `:root { --primary: ... }` defines
   light-theme colors as CSS variables, `.dark { ... }` redefines them for dark
   mode, and the `@theme inline` block turns each variable into a Tailwind
   utility (`bg-primary`, `text-muted-foreground`). **Rebranding the app =
   editing ~30 variables in this one file.** No component changes.
4. **`npx shadcn init`** — wrote `components.json` (the CLI's settings: style
   `base-nova`, where files go) and `src/lib/utils.ts` with the `cn()` helper.

`cn()` deserves a line: it merges class names *and resolves conflicts* — if a
component has `px-4` and a caller passes `px-2`, the caller wins. Every
component uses it, which is why every component accepts `className` overrides.

## 3. The three-concept model (the core idea)

Everything about a component's appearance/behavior falls into exactly one of
three buckets. Mixing them up is the most common documentation mistake:

| Concept | What it is | Who controls it | Example |
|---|---|---|---|
| **Variant** | A visual style *chosen in code* via prop | The developer | `<Button variant="destructive">` stays red forever |
| **State** | Appearance *reacting* to conditions, automatic | The browser/user | hover, focus ring, disabled, invalid |
| **Type / attribute** | *Behavior* passed to the underlying HTML | The HTML spec | `type="password"`, `required`, `maxLength` |

Two refinements discovered along the way:

- **Value states** — Checkbox's checked/unchecked isn't hover-like (mouse) or
  variant-like (developer's choice); it's driven by **our data**
  (`is_completed`). Same category: Select's selected item, Dialog open/closed.
- The full matrix is **variants × states**: every variant defines its own
  hover/focus/disabled look.

## 4. Where variants live: cva

Open any component with variants (e.g. `badge.tsx`) and you'll find this
anatomy — `cva()` from `class-variance-authority`:

```tsx
const badgeVariants = cva(
  "inline-flex items-center rounded-4xl px-2 text-xs ...", // base: every badge
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground ...",  // only the differences
        secondary: "bg-secondary ...",
        destructive: "bg-destructive/10 text-destructive ...",
      },
    },
    defaultVariants: { variant: "default" },  // what <Badge> with no props means
  }
)
```

**Adding a custom variant = adding one key to that map.** That's the whole
trick. States live *inside* each variant's string as Tailwind pseudo-class
prefixes (`hover:`, `focus-visible:`, `disabled:`).

## 5. Component shapes to know

- **Simple** (Button, Badge, Input, Skeleton): one import, use directly.
- **Composed** (Card, Dialog, AlertDialog, Select, DropdownMenu, Tooltip):
  one file exports many pieces — `Dialog, DialogTrigger, DialogContent,
  DialogTitle...` — that you assemble like HTML. These have **no variants**;
  flexibility comes from composition.
- **Provider-requiring** (Tooltip): needs `<TooltipProvider>` wrapped around
  the app once (in `main.tsx`) so all tooltips share timing/settings.
- **Function-based** (Sonner/toast): mount `<Toaster />` once, then *call*
  `toast.success("Task added")` from anywhere — no JSX at the call site.
- The `render={<Button>...</Button>}` prop (Base UI pattern): lets a Trigger
  *be* one of our styled components instead of a bare element. (Classic shadcn
  calls this `asChild`.)

Naming conventions that bite: files are **kebab-case** (`dropdown-menu.tsx`),
components are **PascalCase** (`DropdownMenu`) — and PascalCase is
load-bearing in JSX: lowercase `<input>` means the raw HTML tag, capitalized
`<Input>` means our component.

## 6. The workflow: how a component gets into Karya

Every component follows the same five-step loop:

1. **Document the requirement first** — add/update its entry in
   `COMPONENTS.md`: what Karya feature needs it, expected variants, states.
   Roadmap-driven uses are welcome but **must** be tagged `(planned:)` so
   readers can tell "buildable today" from "team roadmap".
2. **Install**: `npx shadcn@latest add <kebab-name>` from `frontend/`.
3. **Verify the doc against the source** — open the generated file and check
   the actual variants/exports. Docs drift from source in both directions:
   entries can list variants that don't exist and miss ones that do (our
   `base-nova` Badge ships `ghost` and `link` beyond the standard four).
   Write verified, not plausible.
4. **Showcase it** — a page under `src/pages/components/` (route
   `/components/<kebab-name>`) built from the shared helpers in `_shared.tsx`:
   each `Example` block renders the component **live** on top and the code to
   write below. Show every variant, every size, and the statically
   demonstrable states.
5. **Use it** — components prove themselves in real features.
To use any component afterward: check `COMPONENTS.md` for the import line and
just import it. That's the payoff of the whole system.

## 6.5 Worked example: adding Checkbox

Checkbox is the clearest single illustration of §3's concepts, so here is the
five-step loop run end-to-end on it, with real results.

**Step 1 — the COMPONENTS.md entry (before running anything):**

- *Used for:* task completion toggle — the `is_completed` field on Task.
- *Variants:* expected `none` (simple toggle; nothing to choose). Confirm
  after install — don't guess in the doc.
- *States:* checked / unchecked / disabled — with checked/unchecked flagged as
  a **value state** (driven by data, per §3), not a variant.
- No `(planned:)` tag: the task list exists today; only the toggle UI is new.

**Step 2 — install:**

- From `frontend/`: `npx shadcn@latest add checkbox`
- Generated: `src/components/ui/checkbox.tsx` (one file).
- `package.json` unchanged (Base UI + lucide were already installed by
  earlier components; the CLI only adds what's missing).

**Step 3 — verify the doc against the source.** Opening `checkbox.tsx`:

- Exports exactly one thing: `Checkbox`. There is **no `cva()` in the file at
  all** — the cleanest possible confirmation of "Variants: none". Not every
  component has a variants map; simple ones are just a styled primitive.
- Props come from Base UI (`CheckboxPrimitive.Root.Props`): `checked`,
  `onCheckedChange`, `disabled`, and — *the mismatch we didn't predict* —
  `indeterminate` (the "some but not all selected" state). The primitive
  supports it, but our copy only renders a check icon, so indeterminate has
  no distinct visual until we add one. Doc updated to note it as
  "supported by primitive, not yet styled".
- Bonus find in the class string: `after:absolute after:-inset-x-3
  after:-inset-y-2` — an invisible expanded hit area, so the 16px box accepts
  clicks from a comfortably larger zone. Owned source means you find these.

**Step 4 — showcase page:** `src/pages/components/CheckboxPage.tsx`, route
`/components/checkbox`. `Example` blocks to include: unchecked, checked,
disabled, disabled+checked, and one with a `Label` wired via `htmlFor`/`id`
(clicking the text toggles the box — that pairing is the real-world usage).
Each block uses `_shared.tsx`'s `Example`: live component on top, code below.

**Step 5 — real usage:** the task card in the task list. The DB's
`is_completed` drives `checked`, and `onCheckedChange` calls the API to
persist the flip:

```tsx
<Checkbox
  checked={task.is_completed}
  onCheckedChange={(checked) => updateTask(task.task_id, { is_completed: checked })}
/>
```

That line is §3 made concrete: the checkbox's appearance is a **value state**
— the database decides what the pixel looks like.

Every component follows this same loop; Checkbox just happens to demonstrate
variant vs. state vs. value-state in one small file.

## 7. Documentation principles to follow

- `COMPONENTS.md` is a **living contract**: check it before building UI,
  update it before adding components.
- **No blank cells** — write `none` explicitly. Blank is ambiguous between
  "none" and "forgot".
- **"Used for" names real Karya features** (current or `(planned:)`), never
  generic capabilities. "Input: used for inputs" tells a teammate nothing.
- Docs are the team's **shared memory** — they onboard the next person (or AI
  assistant) without a meeting.

## 8. Build facts worth knowing

- **JS bundles by import-graph**: code not imported from `main.tsx` ships zero
  bytes — installing 13 components didn't grow the JS bundle at all until
  something imported them.
- **Tailwind scans by file**: it greps source files for class names regardless
  of imports — so CSS *did* grow. Two build steps, two definitions of "used".
- `npm run build` here runs `tsc --noEmit` first — the build is also our
  type-check. Identical output hashes = nothing changed.

## 9. Resources to learn from

Grouped by the layer you're touching. Each line is *what it's for → when to open
it*. You don't need to read these front-to-back — reach for the one that matches the
step you're on.

**The component system (§1–§5)**
- **shadcn/ui docs** — https://ui.shadcn.com/docs — the registry every
  `npx shadcn add` pulls from. Read a component's page before installing (to see its
  intended API/examples) and after (to compare against the source you now own, §6
  step 3). Caveat: their examples import from **Radix**; ours use **Base UI** (§1), so
  the class names match but the primitive import line differs.
- **Base UI** — https://base-ui.com — the headless primitives under our components
  (`@base-ui/react`). Open it when you need the real props a `Trigger`/`Tab`/`Panel`
  accepts, the `value`-pairing on Tabs, or the `render={<Button/>}` pattern (§5).
- **class-variance-authority (cva)** — https://cva.style/docs — how the variant maps
  work (§4). Read before adding a key to a component's `cva()`.
- **tailwind-merge** — https://github.com/dcastil/tailwind-merge — the conflict
  resolver inside `cn()` (§2). One read explains why a caller's `px-2` beats a
  component's `px-4`.

**Styling (§2)**
- **Tailwind CSS v4 docs** — https://tailwindcss.com/docs — every utility class.
  **Filter for v4**: v3 tutorials show `tailwind.config.js` and `@tailwind base;`,
  neither of which exists here. Live in: flex/grid, spacing, colors, state prefixes
  (`hover:`, `focus-visible:`, `disabled:`), and arbitrary values (`bg-[...]`).
- **Theme variables / `@theme`** — https://tailwindcss.com/docs/theme — how the
  tokens in `src/index.css` become utilities like `bg-primary`. Read before adding
  tokens (e.g. the `--house-*` set powering the onboarding gradient).
- **tw-animate-css** — https://www.npmjs.com/package/tw-animate-css — the
  `animate-in fade-in slide-in-from-*` enter animations. Pair with plain Tailwind
  `transition-*` for things that move *while on screen* (the two are different tools —
  see the House toggle vs. its reveal animations).

**Framework, routing, types**
- **React** — https://react.dev — start with *Describing the UI* and *Adding
  Interactivity*. The "UI is a function of state" model (`useState`, events,
  conditional rendering) is what every page here assumes.
- **React Router v7** — https://reactrouter.com — `Routes`/`Route`/`Link`; how a page
  file in `src/pages/` becomes a URL in `main.tsx`.
- **TypeScript handbook** — https://www.typescriptlang.org/docs/handbook/intro.html —
  typing props and understanding what `npm run type-check` is complaining about.
- **Vite** — https://vite.dev — the dev server and build. Mostly you just run the npm
  scripts; open this only when config (aliases, env vars) is involved.

**Icons & feedback**
- **Lucide** — https://lucide.dev/icons — search the icon set (`lucide-react`). Every
  name maps to a PascalCase import: `Castle` → `import { Castle } from 'lucide-react'`.
- **Sonner** — https://sonner.emilkowal.ski — the toast system: mount `<Toaster/>`
  once, then call `toast.success(...)` from anywhere.

**How to use this list:** match the resource to the step. Adding a variant? → cva +
Tailwind. Wiring a new page? → React + React Router. Styling from the mockup? →
Tailwind utilities + our `@theme` tokens. Stuck on a prop? → Base UI (not shadcn's
Radix examples).

---

*Maintained alongside COMPONENTS.md — update this when the workflow changes,
not just when components do.*
