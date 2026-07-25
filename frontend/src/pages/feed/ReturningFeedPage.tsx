import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { ActivityCard, FeedShell } from './parts'
import { ACTIVITIES, type Activity } from './data'
import type { Origin } from './utils'

type DetailStyle = 'expanded' | 'fullpage'

// Returning user: the populated activity feed. Route: /feed
export default function ReturningFeedPage() {
  const navigate = useNavigate()

  // Dev-only: two detail treatments to compare. Drop this once one is chosen.
  const [style, setStyle] = useState<DetailStyle>('expanded')

  function handleOpen(activity: Activity, origin: Origin) {
    // Both variants are real pages; pass the tapped card's position so the
    // detail grows out of it.
    const path =
      style === 'expanded'
        ? `/feed/task/${activity.id}`
        : `/feed/task/${activity.id}/full`
    navigate(path, { state: { origin } })
  }

  return (
    <FeedShell>
        {/* Dev-only preview switch for the two detail styles */}
        <div className="flex items-center gap-2 pb-1 text-xs text-muted-foreground">
          <span>Detail:</span>
          {(
            [
              ['expanded', 'Expanded card'],
              ['fullpage', 'Full page'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStyle(value)}
              className={cn(
                'rounded-md px-2 py-0.5 transition-colors',
                style === value
                  ? 'bg-foreground text-background'
                  : 'hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {ACTIVITIES.map((activity, index) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            index={index}
            onOpen={handleOpen}
          />
        ))}
    </FeedShell>
  )
}
