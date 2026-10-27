import { useEffect, useRef } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { ACTIVITIES } from './data'
import { BottomNav } from './parts'
import { TaskDetailContent, type DetailVariant } from './TaskDetail'
import { scrollToComments, type Origin } from './utils'

// Grow-from-the-card animation. Two things the old version got wrong:
//   1. `zoom-in-95` only scaled 95%→100% — a 5% change you can't see.
//   2. the origin was measured in VIEWPORT pixels but applied to the centred
//      content column, whose box doesn't start at (0,0) — so transform-origin
//      landed in the wrong place on anything wider than a phone.
// Fix: a real scale, with the origin converted into the column's own coordinate
// space (subtract the column's top-left). Close mirrors open.
const OPEN_MS = 280
const CLOSE_MS = 220
const START_SCALE = 0.4
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)' // decelerate as it grows
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)' // accelerate as it collapses

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The task detail, as a real page with its own footer.
 *
 *   /feed/task/:id       → variant="expanded"  (one lavender card on white)
 *   /feed/task/:id/full  → variant="full"      (task bare on white)
 *
 * The tapped card's centre (viewport px) arrives via router state; the detail
 * grows out of it and, on Back, shrinks back toward it. On a deep link there's
 * no origin — fall back to a centred grow.
 */
export default function TaskDetailPage({
  variant,
}: {
  variant: DetailVariant
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const state = useLocation().state as {
    origin?: Origin
    focusComments?: boolean
  } | null
  const origin = state?.origin
  const focusComments = state?.focusComments

  const elRef = useRef<HTMLDivElement>(null)
  // Origin in the column's own coordinate space, computed once at open and
  // reused on close so the exit mirrors the entrance exactly.
  const originStr = useRef('50% 50%')
  const closing = useRef(false)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    // Convert the card's viewport-space origin into the column's own coordinate
    // space by subtracting the column's top-left. `getBoundingClientRect()`
    // INCLUDES transforms, so this must measure an UNtransformed element.
    // StrictMode runs this effect twice; the cleanup's `anim.cancel()` reverts
    // the first run's scale before the second run measures — without it the
    // second measurement reads an already-scaled box and the origin collapses
    // to the top-left corner (with two animations stacked).
    const cx = origin ? origin.x : window.innerWidth / 2
    const cy = origin ? origin.y : window.innerHeight / 2
    const r = el.getBoundingClientRect()
    originStr.current = `${cx - r.left}px ${cy - r.top}px`
    el.style.transformOrigin = originStr.current
    if (prefersReducedMotion()) return
    const anim = el.animate(
      [
        { transform: `scale(${START_SCALE})`, opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: OPEN_MS, easing: EASE_OUT },
    )
    return () => anim.cancel()
  }, [origin])

  // Opened via a card's Comments button → land on the thread. Wait out the grow
  // animation first so the scroll and the transform don't fight.
  useEffect(() => {
    if (!focusComments) return
    const t = window.setTimeout(scrollToComments, OPEN_MS)
    return () => window.clearTimeout(t)
  }, [focusComments])

  const activity = ACTIVITIES.find((a) => String(a.id) === id)
  if (!activity) return <Navigate to="/feed" replace />

  // Shrink back toward the card, then navigate. (Only the in-app Back button
  // routes through here; the browser/hardware back can't be intercepted for an
  // animation, so it just returns instantly — an accepted limitation.)
  function handleClose() {
    const el = elRef.current
    if (closing.current) return
    closing.current = true
    if (!el || prefersReducedMotion()) {
      navigate(-1)
      return
    }
    const anim = el.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: `scale(${START_SCALE})`, opacity: 0 },
      ],
      { duration: CLOSE_MS, easing: EASE_IN, fill: 'forwards' },
    )
    anim.onfinish = () => navigate(-1)
  }

  return (
    <div className="min-h-screen bg-background">
      <div ref={elRef} className="mx-auto max-w-md px-4 pb-32 pt-4">
        <TaskDetailContent
          activity={activity}
          variant={variant}
          onClose={handleClose}
        />
      </div>

      <BottomNav active="feed" />
    </div>
  )
}
