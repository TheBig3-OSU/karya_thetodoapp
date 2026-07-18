# Karya UI components

Living requirements doc for our shadcn/ui component set.

**Rules:**
- Check here before building UI; update here before adding a new component.
- **Variants** = visual styles chosen via prop (`variant="destructive"`). **States** = appearance reacting to conditions (hover, focus, disabled, invalid) — styled automatically inside each variant. **Types/attributes** = behavior passed to the underlying HTML (`type`, `required`, `maxLength`).
- Uses marked *(planned:)* are team-finalized roadmap features not yet in the codebase.
- After installing a component (`npx shadcn@latest add <name>`), verify its entry against the real source in `src/components/ui/`.

**Roadmap features (finalized, not yet built):** login/signup, messaging, comments on tasks, group vouch, T&C acceptance.

## Button
- **Status:** installed
- **Import:** `import { Button } from '@/components/ui/button'`
- **Used for:** Add task, Save/Cancel in dialogs, icon-only actions (edit, delete)
- **Variants:** `default` (primary action — one per view), `secondary`,
  `outline`, `ghost` (low-emphasis, e.g. icon buttons), `destructive`
  (delete actions), `link`
- **Sizes:** `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`
- **States:** hover, focus-visible (keyboard ring), active (pressed), disabled
- **Showcase:** /components/button (coming in Lesson 5)

## Input
- **Status:**    installed
- **Import:**    `import { Input } from '@/components/ui/input'`
- **Used for:**  task title field (add/edit dialog); *(planned:)* login/signup fields, search
- **Types:**     text; *(planned:)* email, password (login/signup)
- **Variants:**  none
- **Sizes:**     none
- **States:**    focus, invalid, disabled, placeholder shown
- **Showcase:**  /components/input

## Textarea
- **Status:**    installed
- **Import:**    `import { Textarea } from '@/components/ui/textarea'`
- **Used for:**  task description entry; *(planned:)* comments, messaging
- **Types:**     none (textareas have no `type`; attributes we'll use: `rows`, `maxLength`)
- **Variants:**  none
- **Sizes:**     none
- **States:**    focus, invalid, disabled, placeholder shown
- **Showcase:**  /components/textarea

## Label
- **Status:**    installed
- **Import:**    `import { Label } from '@/components/ui/label'`
- **Used for:**  "Title"/"Description" labels in the task dialog, paired to fields via `htmlFor`/`id`; also labels Checkboxes
- **Types:**     none
- **Variants:**  none
- **Sizes:**     none
- **States:**    disabled (grays out with its field)
- **Showcase:**  /components/label

## Checkbox
- **Status:**    installed
- **Import:**    `import { Checkbox } from '@/components/ui/checkbox'`
- **Used for:**  toggling task `is_completed`; *(planned:)* group vouch confirmation, T&C acceptance
- **Types:**     none
- **Variants:**  none
- **Sizes:**     none
- **States:**    checked / unchecked (value state ← `is_completed`), hover, focus-visible, disabled, invalid; `indeterminate` supported by the Base UI primitive but not yet visually styled in our copy
- **Showcase:**  /components/checkbox

## Card
- **Status:**    installed
- **Import:**    `import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'`
- **Used for:**  each task in the task list (title + description + XP badge + checkbox boxed together); *(planned:)* login form container
- **Types:**     none
- **Variants:**  none — composed from subcomponents (Header/Title/Description/Content/Footer)
- **Sizes:**     none (fills its container; size via layout/`className`)
- **States:**    none (static container)
- **Showcase:**  /components/card

## Badge
- **Status:**    installed
- **Import:**    `import { Badge } from '@/components/ui/badge'`
- **Used for:**  XP display on tasks ("+50 XP"), "Done" tag on completed tasks
- **Types:**     none
- **Variants:**  `default`, `secondary`, `outline`, `destructive`, `ghost`, `link`; **custom `xp` (planned — Lesson 6):** amber/gold for XP values
- **Sizes:**     none
- **States:**    none (informative, not interactive)
- **Showcase:**  /components/badge

## Select
- **Status:**    installed
- **Import:**    `import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'`
- **Used for:**  task list filter (All / Active / Completed), sort order
- **Types:**     none
- **Variants:**  none — composed from subcomponents (Trigger/Value/Content/Item)
- **Sizes:**     none
- **States:**    open/closed, item selected/highlighted, focus-visible, disabled (whole select or single item)
- **Showcase:**  /components/select

## DropdownMenu
- **Status:**    installed
- **Import:**    `import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'`
- **Used for:**  per-task ⋯ actions menu (Edit, Delete). Actions, not values — that's Select's job.
- **Types:**     none
- **Variants:**  menu items: `default`, `destructive` (Delete); composed from subcomponents
- **Sizes:**     none
- **States:**    open/closed, item highlighted (hover/arrow keys), item disabled
- **Showcase:**  /components/dropdown-menu

## Dialog
- **Status:**    installed
- **Import:**    `import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'`
- **Used for:**  Add Task / Edit Task form (modal over the list)
- **Types:**     none
- **Variants:**  none — composed from subcomponents
- **Sizes:**     none (width via `className` on DialogContent)
- **States:**    open/closed (dismissible: Esc, X, click outside)
- **Showcase:**  /components/dialog

## AlertDialog
- **Status:**    installed
- **Import:**    `import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'`
- **Used for:**  "Delete this task?" confirmation — interrupts destructive actions
- **Types:**     none
- **Variants:**  none — composed from subcomponents
- **Sizes:**     none
- **States:**    open/closed (NOT dismissible by clicking outside — user must pick Cancel or Confirm; that's the difference from Dialog)
- **Showcase:**  /components/alert-dialog

## Sonner (toast)
- **Status:**    installed
- **Import:**    `import { Toaster } from '@/components/ui/sonner'` (mounted once in the app); fired via `import { toast } from 'sonner'` → `toast.success("Task added")`
- **Used for:**  feedback after add/edit/delete, API-unreachable errors
- **Types:**     message kinds: success, error, info (function calls, not props)
- **Variants:**  none
- **Sizes:**     none
- **States:**    auto-dismisses after a few seconds; hover pauses the timer
- **Showcase:**  /components/sonner

## Skeleton
- **Status:**    installed
- **Import:**    `import { Skeleton } from '@/components/ui/skeleton'`
- **Used for:**  gray task-shaped placeholder bars while `fetchTasks()` loads (currently that gap shows nothing)
- **Types:**     none
- **Variants:**  none (shape/size via `className`)
- **Sizes:**     none
- **States:**    none (always pulsing; it exists only during loading)
- **Showcase:**  /components/skeleton

## Tooltip
- **Status:**    installed
- **Import:**    `import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'`
- **Used for:**  hover hints on icon-only buttons (edit , ⋯ menu)
- **Types:**     none
- **Variants:**  none — composed from subcomponents
- **Sizes:**     none
- **States:**    hidden/visible (appears on hover or keyboard focus after a short delay)
- **Showcase:**  /components/tooltip

## Tabs
- **Status:**    installed
- **Import:**    `import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'`
- **Used for:**  *(planned:)* Create / Join toggle on the House (team) onboarding screen — one panel to create a house, one to join by code. **Note:** the House screen (`/house/new`) uses a *custom* segmented control instead of this, because its design needs the active pill to **slide** between tabs; base-nova Tabs gives each trigger its own background (appears in place), so it can't animate a shared pill. Tabs remains the default for non-animated tab switching elsewhere.
- **Types:**     none
- **Variants:**  **on `TabsList`** (drift from classic shadcn, which has none): `default`
  (filled segmented pill on `bg-muted` — what the House toggle uses), `line`
  (transparent list, active tab underlined). `Tabs`/`TabsTrigger`/`TabsContent`
  have no variants — composed from subcomponents; each `TabsTrigger`/`TabsContent`
  is paired by a `value` prop (Base UI API)
- **Sizes:**     none. `Tabs` root takes `orientation` (`horizontal` default / `vertical`) — an attribute, not a variant
- **States:**    active/inactive tab (value state ← selected `value`), hover, focus-visible (keyboard ring), disabled
- **Showcase:**  /components/tabs
