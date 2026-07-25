import { BookOpen, Brain, Dumbbell, Sparkles, type LucideIcon } from 'lucide-react'

// Feed types + mock data live here (a plain .ts module, no components) so the
// component file `parts.tsx` can export only components — that's what keeps
// Vite's React Fast Refresh working (mixed exports disable HMR).

export type CategoryKey = 'body' | 'mind' | 'learn' | 'focus'
export type VouchState = 'vouched' | 'needs-vouch' | 'none'

export const CATEGORY_META: Record<CategoryKey, { label: string; Icon: LucideIcon }> = {
  body: { label: 'body', Icon: Dumbbell },
  mind: { label: 'mind', Icon: Brain },
  learn: { label: 'learn', Icon: BookOpen },
  focus: { label: 'focus', Icon: Sparkles },
}

// The proof a user attaches to show they finished a task. MOCK ONLY — real proof
// would map to the `task_attachments` table (file_url/filename), which today has
// no `kind`/mime column and no link type, so nothing here is wired to a backend.
export type ProofKind = 'image' | 'link' | 'pdf'
export interface Proof {
  kind: ProofKind
  label: string // filename or link title
  detail?: string // host, size, or page count — display only
}

export interface Activity {
  id: number
  // `user.title` is the earned epithet ("the Loyal"); `Activity.title` below is
  // the task title ("Run 2 miles") — different things, kept on separate paths.
  user: { name: string; initials: string; level: number; title?: string }
  title: string
  progress: number
  categories: CategoryKey[]
  vouch: VouchState
  // Absent → the detail view shows an inert "Add proof" upload state.
  proof?: Proof
}

// TODO(backend): the feed runs on MOCK DATA. None of it is wired to the API,
// which today exposes only GET /health and GET /api/tasks
// ({task_id,title,description,is_completed,xp}). To make the feed real we need:
//   1. GET /api/feed            — activities across the team (no endpoint yet;
//                                  /api/tasks is a flat, userless list)
//   2. user fields on activities — TaskOut has no user (name, initials, level)
//   3. GET /api/me              — current user's name, level, current/next XP
//                                  for the header bar (schema has user_profile +
//                                  user_team_xp; no API)
//   4. vouch state             — tasks.vouched_by/at, requires_vouch exist in
//                                  schema but aren't exposed in the API
//   5. categories              — task_categories table exists; not in TaskOut
//   6. per-task progress       — tasks.intermediary_progress exists; not in API
//   7. GET /api/tasks/{id}      — task detail ("Tap to view"); none
//   8. GET /api/tasks/{id}/comments — threads table exists; no API
//   9. POST /api/tasks         — create task (the "+"); none
//  10. task attachments        — task_attachments table exists (file_url,
//                                  filename); no API. The detail view's image
//                                  block is a placeholder until that lands.
// The new-user vs returning-user split is two routes (/feed/new, /feed); once
// auth exists, redirect based on whether the user has any activity.
export const ACTIVITIES: Activity[] = [
  {
    id: 1,
    user: { name: 'Sasank', initials: 'SK', level: 16, title: 'the Loyal' },
    title: 'Run 2 miles',
    progress: 100,
    categories: ['body'],
    vouch: 'vouched',
    proof: { kind: 'image', label: 'run-tracker.jpg', detail: 'Photo · 2.4 MB' },
  },
  {
    id: 2,
    user: { name: 'Harsha', initials: 'HL', level: 21, title: 'the Steady' },
    title: 'Read the article about Claude',
    progress: 40,
    categories: ['mind', 'learn'],
    vouch: 'needs-vouch',
    proof: { kind: 'link', label: 'Introducing Claude', detail: 'anthropic.com' },
  },
  {
    id: 3,
    user: { name: 'Meera', initials: 'MR', level: 8, title: 'the Kind' },
    title: 'Meal prep for the week',
    progress: 65,
    categories: ['body', 'mind'],
    vouch: 'vouched',
  },
  {
    id: 4,
    user: { name: 'Diego', initials: 'DG', level: 13 },
    title: 'Finish the design review',
    // (no earned title yet — renders as just the name)
    progress: 80,
    categories: ['focus'],
    vouch: 'none',
    proof: { kind: 'pdf', label: 'design-review-v3.pdf', detail: 'PDF · 8 pages' },
  },
  {
    id: 5,
    user: { name: 'Priya', initials: 'PV', level: 30, title: 'the Wise' },
    title: 'Morning meditation streak',
    progress: 100,
    categories: ['mind', 'focus'],
    vouch: 'vouched',
  },
  {
    id: 6,
    user: { name: 'Sam', initials: 'SM', level: 5, title: 'the Bold' },
    title: 'Write team standup notes',
    progress: 20,
    categories: ['learn'],
    vouch: 'needs-vouch',
  },
]

// Comments are a tree — anyone can reply to anyone (Reddit-style hierarchy).
export interface Comment {
  id: number
  author: { name: string; initials: string }
  text: string
  replies: Comment[]
}

// Placeholder thread shown on every task detail until the comments API exists
// (the `threads` table exists in the schema; there's no endpoint yet).
export const MOCK_COMMENTS: Comment[] = [
  {
    id: 1,
    author: { name: 'Meera', initials: 'MR' },
    text: 'Nice pace today — you were way ahead of last week.',
    replies: [
      {
        id: 2,
        author: { name: 'Sasank', initials: 'SK' },
        text: 'Thanks! The new route is flatter, helps a lot.',
        replies: [
          {
            id: 3,
            author: { name: 'Priya', initials: 'PV' },
            text: 'Which route? I keep dying on the hill by the park.',
            replies: [],
          },
        ],
      },
      {
        id: 4,
        author: { name: 'Sam', initials: 'SM' },
        text: 'Seconded, that split was quick.',
        replies: [],
      },
    ],
  },
  {
    id: 5,
    author: { name: 'Diego', initials: 'DG' },
    text: 'Vouched. Saw the route on the group map.',
    replies: [],
  },
]
