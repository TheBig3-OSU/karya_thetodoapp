import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Home,
  MessageCircle,
  Newspaper,
  Plus,
  ShieldCheck,
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
import { PLUM_BAR, notReady, originFromEvent, type Origin } from './utils'

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

export function VouchBadge({ state }: { state: VouchState }) {
  if (state === 'vouched') {
    return (
      <Badge className="gap-1 border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        <ShieldCheck className="size-3" />
        Vouched
      </Badge>
    )
  }
  if (state === 'needs-vouch') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Needs vouch
      </Badge>
    )
  }
  return null
}

export function ActivityCard({
  activity,
  index,
  onOpen,
}: {
  activity: Activity
  index: number
  onOpen: (activity: Activity, origin: Origin) => void
}) {
  const { user, title, progress, categories, vouch } = activity
  return (
    <Card
      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'both' }}
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
          <Progress value={progress} className={PLUM_BAR} />
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

        <Button
          variant="secondary"
          className="w-full"
          onClick={(e) =>
            onOpen(activity, originFromEvent(e.currentTarget as HTMLElement))
          }
        >
          Tap to view
        </Button>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Comments"
            onClick={() => notReady('Comments')}
          >
            <MessageCircle />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Share"
            onClick={() => notReady('Sharing')}
          >
            <ArrowUpRight />
          </Button>
        </div>
      </CardContent>
    </Card>
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
  { key: 'tasks', Icon: SquareCheckBig, label: 'Tasks' },
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
            <Progress
              value={62}
              className={cn('mt-2 [&_[data-slot=progress-track]]:h-2', PLUM_BAR)}
            />
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
