import { useState } from 'react'
import { toast } from 'sonner'

import { type Activity } from './data'

// Shared non-component helpers. Kept in a plain .ts module so the feed's .tsx
// files can export only components (that's what keeps Fast Refresh working).

// Progress-bar presets (track height + indicator fill live together so the
// thickness travels with the color). TASK_BAR = thicker, punchy plum for the
// per-task bars; XP_BAR = gold for the top XP meter, so the two never look alike.
export const TASK_BAR =
  '[&_[data-slot=progress-track]]:h-2.5 [&_[data-slot=progress-indicator]]:bg-task-progress'
export const XP_BAR =
  '[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-indicator]]:bg-xp-gold'

// The fixed set of reactions offered in the card's long-press / react picker.
// NOTE: these are plain Unicode emoji with NO emoji pack (no Twemoji/OpenMoji/
// Noto). They render in each viewer's native OS set — Segoe on Windows, Apple
// on iOS/macOS, Noto on Android — so the look is inconsistent across platforms
// and not brand-controlled. Left as-is for now; if we want one consistent style
// we'd add a pack (likely Twemoji as inline SVG). See also the Figma mock, which
// uses emoji as placeholders for the lucide action icons.
export const REACTIONS = ['👍', '❤️', '🔥', '👏', '😂']

// Where a detail view should animate out of: the tapped card's centre, in
// viewport pixels. TaskDetailPage converts this into the animating column's own
// coordinate space (subtracting the column's top-left) before using it as a
// `transform-origin`, so the grow starts from the card on any screen size.
export interface Origin {
  x: number
  y: number
}

// Everything here is a stub — signal that clearly rather than failing silently.
export function notReady(what: string) {
  toast(`${what} isn't wired up yet`)
}

// Where the reaction picker was opened from, which decides where it renders:
//   'button' → tapping the React button → picker sits at the button.
//   'card'   → long-pressing the card (or tapping the chosen chip) → picker sits
//              at the card's top-right, where the chip lives.
export type PickerAnchor = 'button' | 'card'

// Reaction state shared by the feed card and the task detail so they behave
// identically. One reaction, toggle: picking the same emoji clears it, picking a
// different one swaps. The picker + chosen chip are rendered by ReactionOverlay.
export function useReactions() {
  const [chosen, setChosen] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<PickerAnchor | null>(null)
  const pickerOpen = anchor !== null
  const openPicker = (at: PickerAnchor) => setAnchor(at)
  const closePicker = () => setAnchor(null)
  const choose = (emoji: string) => {
    setChosen((prev) => (prev === emoji ? null : emoji))
    setAnchor(null)
  }
  return { chosen, anchor, pickerOpen, openPicker, closePicker, choose }
}

// Share a task via the OS's native share sheet (Web Share API). One call hands
// off to whatever the platform provides — the iOS/Android share sheet, the
// Windows/macOS share flyout — so there's nothing per-OS to build. It needs a
// secure context (HTTPS/localhost) and a user gesture; `navigator.share` runs
// before the first `await` here so the click's activation is preserved.
// Not supported on desktop Firefox → fall back to copying the link. A dismissed
// sheet rejects with AbortError, which is a normal cancel, not a failure.
export async function shareTask(activity: Activity) {
  const url = `${window.location.origin}/feed/task/${activity.id}`
  const data = { title: `${activity.user.name} on Karya`, text: activity.title, url }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data)
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      // Any other error (e.g. not allowed) → fall through to the copy fallback.
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    toast('Link copied')
  } catch {
    toast("Couldn't share on this device")
  }
}

// Smooth-scroll the task detail's comment thread into view. The thread root
// carries id="comments" (see CommentsCard); used by the detail's Comments button
// and by the deep-open path when the feed card's Comments button navigates in.
export function scrollToComments() {
  document
    .getElementById('comments')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Measures the Card that contains the tapped element, so the animation starts
// from the card's position rather than the button's.
export function originFromEvent(target: HTMLElement): Origin {
  const card = target.closest('[data-slot="card"]')
  const rect = (card ?? target).getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}


