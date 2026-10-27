import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  MessageCircle,
  HeartHandshake,
  Newspaper,
  Plus,
  SmilePlus,
  SquareArrowOutUpRight,
  SquareCheckBig,
  User,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CATEGORY_META, type Activity, type VouchState } from './data'
import {
  TASK_BAR,
  XP_BAR,
  REACTIONS,
  notReady,
  originFromEvent,
  shareTask,
  useReactions,
  type Origin,
  type PickerAnchor,
} from './utils'

// This file exports ONLY components — types/data live in `data.ts`, helpers in
// `utils.ts`. (Mixing a data/helper export here would disable Fast Refresh.)

// A name plus its earned title ("Harsha the Loyal"). The title is the one place
// Cormorant appears in the feed — italic serif, gold. No title → just the name.
export function NameWithTitle({
  name,
  title,
  className,
}: {
  name: string
  title?: string
  className?: string
}) {
  return (
    <p className={className}>
      {name}
      {title && (
        <>
          {' '}
          <span className="font-title text-title italic">{title}</span>
        </>
      )}
    </p>
  )
}

// `onVouch` makes a `needs-vouch` badge interactive (used on the task detail,
// where you've opened the post to vouch for it): it renders as a tappable
// button — icon + "Vouch", in the brand tint — that fires `onVouch`. Without it
// (e.g. the feed, where you're only browsing) `needs-vouch` is a static status.
export function VouchBadge({
  state,
  onVouch,
}: {
  state: VouchState
  onVouch?: () => void
}) {
  if (state === 'vouched') {
    return (
      <Badge className="gap-1 border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        <HeartHandshake className="size-3" />
        Vouched
      </Badge>
    )
  }
  if (state === 'needs-vouch') {
    if (onVouch) {
      return (
        <Badge
          render={<button type="button" />}
          aria-label="Vouch for this task"
          className="cursor-pointer gap-1 border-transparent bg-primary-plum-tint text-primary-plum-ink transition-all hover:brightness-95 active:scale-95"
          onClick={(e) => {
            e.stopPropagation()
            onVouch()
          }}
        >
          <HeartHandshake className="size-3" />
          Vouch
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Needs vouch
      </Badge>
    )
  }
  return null
}

// Long-press duration before the reaction picker opens (touch/mouse hold).
const LONG_PRESS_MS = 500

/**
 * The reaction overlay — the emoji picker and the chosen-reaction chip, both
 * pinned to the card's TOP-RIGHT, OUTSIDE it (WhatsApp-style). Render it as a
 * sibling of the `Card` inside a `relative` wrapper: the `Card` is
 * `overflow-hidden`, so the picker/chip must live outside it to peek past the
 * corner without being clipped. Shared by the feed card and the task detail.
 */
export function ReactionOverlay({
  chosen,
  anchor,
  onChoose,
  onClose,
  onReopen,
}: {
  chosen: string | null
  anchor: PickerAnchor | null
  onChoose: (emoji: string) => void
  onClose: () => void
  onReopen: () => void
}) {
  const stopPointer = (e: PointerEvent) => e.stopPropagation()

  // The picker sits where it was opened from: at the React button (bottom-left,
  // where the row is) for a button tap, or above the card's top-right for a
  // long-press (the corner the chosen chip lives in).
  const pickerPos =
    anchor === 'button'
      ? 'bottom-14 left-2'
      : '-top-2 right-2 -translate-y-full'

  return (
    <>
      {/* Click-away layer while the picker is open. */}
      {anchor && (
        <div
          className="fixed inset-0 z-10"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          onPointerDown={stopPointer}
        />
      )}

      {/* Emoji picker — rendered outside the card's clip so it can peek past the
          top-right corner; positioned by where it was opened from. */}
      {anchor && (
        <div
          className={cn(
            'absolute z-20 flex gap-1 rounded-full bg-popover px-2 py-1.5 shadow-lg ring-1 ring-foreground/10 duration-200 animate-in fade-in zoom-in-95',
            pickerPos,
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={stopPointer}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React ${emoji}`}
              onClick={(e) => {
                e.stopPropagation()
                onChoose(emoji)
              }}
              onPointerDown={stopPointer}
              className={cn(
                'flex size-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125',
                chosen === emoji && 'bg-primary-plum-tint',
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chosen reaction — a chip half in / half out over the top-right corner,
          pinned to the card. Tapping it reopens the picker (at the top). */}
      {chosen && (
        <button
          type="button"
          aria-label="Change reaction"
          onClick={(e) => {
            e.stopPropagation()
            onReopen()
          }}
          onPointerDown={stopPointer}
          className="absolute -top-4 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-card text-base shadow-md ring-1 ring-foreground/10"
        >
          {chosen}
        </button>
      )}
    </>
  )
}

/**
 * The react / comments / share action row — shared by the feed card and the task
 * detail so they stay identical when you open a post (the Reddit/X pattern). The
 * React button opens the picker AT the button (ReactionOverlay renders it); the
 * chosen emoji shows in the pinned chip, not in the button. Share sits at the
 * right end (`ml-auto`) — the outbound action, kept apart.
 */
export function CardActions({
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  onComments,
  onShare,
}: {
  pickerOpen: boolean
  onOpenPicker: () => void
  onClosePicker: () => void
  // Gets the click so the feed card can measure the tapped card for its
  // open-animation origin; the detail ignores the arg and just scrolls.
  onComments: (e: MouseEvent<HTMLButtonElement>) => void
  onShare: () => void
}) {
  const stopPointer = (e: PointerEvent) => e.stopPropagation()

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="React"
        onClick={(e) => {
          e.stopPropagation()
          if (pickerOpen) onClosePicker()
          else onOpenPicker()
        }}
        onPointerDown={stopPointer}
      >
        <SmilePlus />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Comments"
        onClick={(e) => {
          e.stopPropagation()
          onComments(e)
        }}
        onPointerDown={stopPointer}
      >
        <MessageCircle />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Share"
        className="ml-auto"
        onClick={(e) => {
          e.stopPropagation()
          onShare()
        }}
        onPointerDown={stopPointer}
      >
        <SquareArrowOutUpRight />
      </Button>
    </div>
  )
}

export function ActivityCard({
  activity,
  index,
  onOpen,
}: {
  activity: Activity
  index: number
  onOpen: (
    activity: Activity,
    origin: Origin,
    opts?: { focusComments?: boolean },
  ) => void
}) {
  const { user, title, progress, categories, vouch } = activity

  const { chosen, anchor, pickerOpen, openPicker, closePicker, choose } =
    useReactions()
  // Once the entrance animation finishes we drop the animation entirely so the
  // card leaves its GPU compositing layer — a lingering layer renders SVG icons
  // and text with grayscale AA on Windows, making them look soft / "low-poly".
  const [entered, setEntered] = useState(false)
  // Long-press timer, and a flag so the click fired on release after a
  // long-press doesn't also open the detail.
  const pressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)

  function openDetail(el: HTMLElement) {
    onOpen(activity, originFromEvent(el))
  }

  // Whole-card tap → open, unless a long-press just fired or the picker is open.
  function handleCardClick(e: MouseEvent<HTMLDivElement>) {
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    if (pickerOpen) return
    openDetail(e.currentTarget)
  }

  function handleCardKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetail(e.currentTarget)
    }
  }

  function clearPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function handlePointerDown() {
    longPressFired.current = false
    clearPress()
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      // Feedback: a haptic tick where supported; the picker popping up is the
      // visible cue. No card scale — scaling would soften the card's text.
      if (typeof navigator.vibrate === 'function') navigator.vibrate(12)
      openPicker('card')
    }, LONG_PRESS_MS)
  }

  return (
    <div className="relative">
      {/* Reaction picker + chosen chip, pinned to the card's top-right (outside
          the card's clip). Long-press or the React button opens the picker. */}
      <ReactionOverlay
        chosen={chosen}
        anchor={anchor}
        onChoose={choose}
        onClose={closePicker}
        onReopen={() => openPicker('card')}
      />

      <Card
        role="button"
        tabIndex={0}
        aria-label={`Open ${user.name}'s task: ${title}`}
        className={cn(
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          // Staggered entrance — removed on completion (below) so the finished
          // card holds no animation/transform and drops its compositing layer.
          // `backwards` keeps it hidden through the stagger delay; it leaves no
          // lingering transform (that was the earlier faded-text fix).
          !entered &&
            'animate-in fade-in slide-in-from-bottom-4 duration-500',
        )}
        style={
          entered
            ? undefined
            : { animationDelay: `${index * 70}ms`, animationFillMode: 'backwards' }
        }
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setEntered(true)
        }}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onContextMenu={(e) => e.preventDefault()}
      >
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary-plum-tint text-primary-plum-ink">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 leading-tight">
            <NameWithTitle
              name={user.name}
              title={user.title}
              className="font-medium"
            />
            <p className="text-xs text-muted-foreground">Lv {user.level}</p>
          </div>
          <VouchBadge state={vouch} />
        </div>

        <div className="space-y-2">
          <p className="font-heading text-base font-medium">{title}</p>
          <Progress value={progress} className={TASK_BAR} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((key) => {
            const { label, Icon } = CATEGORY_META[key]
            return (
              <Badge
                key={key}
                className="gap-1 border-transparent bg-primary-plum-tint text-primary-plum-ink"
              >
                <Icon className="size-3" />
                {label}
              </Badge>
            )
          })}
        </div>

        <CardActions
          pickerOpen={pickerOpen}
          onOpenPicker={() => openPicker('button')}
          onClosePicker={closePicker}
          // Comments opens this task's detail already scrolled to the thread.
          onComments={(e) =>
            onOpen(activity, originFromEvent(e.currentTarget), {
              focusComments: true,
            })
          }
          onShare={() => void shareTask(activity)}
        />
      </CardContent>
      </Card>
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center duration-500 animate-in fade-in zoom-in-95">
      <div className="flex size-20 items-center justify-center rounded-full bg-primary-plum-tint">
        <Plus className="size-8 text-primary-plum-ink" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">No activity yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first task to get your house moving.
        </p>
      </div>
      <Button
        onClick={() => notReady('Task creation')}
        className="bg-primary-plum text-white"
      >
        <Plus className="size-4" />
        Create a task
      </Button>
    </div>
  )
}

// `to` makes a tab navigate; without it the tab is still inert (per spec).
const NAV: {
  key: string
  Icon: LucideIcon
  label: string
  primary?: boolean
  to?: string
}[] = [
  { key: 'home', Icon: Home, label: 'Home' },
  { key: 'feed', Icon: Newspaper, label: 'Feed', to: '/feed' },
  { key: 'create', Icon: Plus, label: 'Create', primary: true },
  { key: 'tasks', Icon: SquareCheckBig, label: 'Tasks', to: '/tasks/1' },
  { key: 'profile', Icon: User, label: 'Profile' },
]

export function BottomNav({ active }: { active: string }) {
  const navigate = useNavigate()
  return (
    <nav className="fixed inset-x-0 bottom-0">
      <div className="mx-auto flex max-w-md items-center justify-around border-t bg-card px-4 py-2">
        {NAV.map(({ key, Icon, label, primary, to }) =>
          primary ? (
            <button
              key={key}
              aria-label={label}
              onClick={() => notReady('Task creation')}
              className="flex size-12 items-center justify-center rounded-full bg-primary-plum text-white shadow-sm transition-transform active:translate-y-px"
            >
              <Icon className="size-6" />
            </button>
          ) : (
            <button
              key={key}
              aria-label={label}
              aria-current={active === key ? 'page' : undefined}
              onClick={() => (to ? navigate(to) : notReady(label))}
              className={cn(
                'flex size-10 items-center justify-center rounded-lg transition-colors',
                active === key
                  ? 'text-primary-plum-ink'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-6" />
            </button>
          ),
        )}
      </div>
    </nav>
  )
}

// Shared feed chrome: white screen, tinted header + bottom nav, and a scrollable
// content slot. Both feed pages (/feed, /feed/new) render inside this.
export function FeedShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        {/* XP header — mock user */}
        <header className="flex items-center gap-3 bg-card px-4 py-4">
          <div className="flex-1">
            <NameWithTitle
              name="Harsha"
              title="the Loyal"
              className="font-semibold leading-tight"
            />
            <p className="text-xs text-muted-foreground">Lv 16</p>
            <Progress value={62} className={cn('mt-2', XP_BAR)} />
          </div>
          <Avatar size="lg">
            <AvatarFallback className="bg-primary-plum-tint text-primary-plum-ink">
              HL
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="space-y-3 px-4 pb-28 pt-3">{children}</main>
      </div>

      <BottomNav active="feed" />
    </div>
  )
}
