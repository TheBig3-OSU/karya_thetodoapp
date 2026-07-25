import { toast } from 'sonner'

// Shared non-component helpers. Kept in a plain .ts module so the feed's .tsx
// files can export only components (that's what keeps Fast Refresh working).

// Plum brand fill for progress bars — matches the onboarding gradient.
export const PLUM_BAR = '[&_[data-slot=progress-indicator]]:bg-primary-plum'

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

// Measures the Card that contains the tapped element, so the animation starts
// from the card's position rather than the button's.
export function originFromEvent(target: HTMLElement): Origin {
  const card = target.closest('[data-slot="card"]')
  const rect = (card ?? target).getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}


