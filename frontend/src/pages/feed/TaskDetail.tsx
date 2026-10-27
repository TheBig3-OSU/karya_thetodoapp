import { useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  Upload,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { type Activity, type Proof } from './data'
import { CardActions, NameWithTitle, ReactionOverlay, VouchBadge } from './parts'
import {
  TASK_BAR,
  notReady,
  scrollToComments,
  shareTask,
  useReactions,
} from './utils'
import { CommentsCard } from './CommentThread'

// Components only — helpers live in `utils.ts`, data in `data.ts`.

export type DetailVariant = 'expanded' | 'full'

/**
 * The proof a user attached to close out a task, rendered by kind. All four
 * states are MOCK and inert — real proof needs storage + a backend (the
 * `task_attachments` table has no kind/mime or link type yet). `surface` is the
 * block surface so proof reads on either page (white on the lavender expanded
 * card, lavender on the white full page).
 */
function ProofBlock({
  proof,
  surface,
}: {
  proof?: Proof
  surface: string
}) {
  const block = cn('rounded-xl ring-1 ring-foreground/10', surface)

  // No proof yet → the upload affordance (the "media button" for attaching one).
  if (!proof) {
    return (
      <button
        type="button"
        onClick={() => notReady('Uploading proof')}
        className={cn(
          block,
          'flex w-full flex-col items-center justify-center gap-2 border border-dashed border-foreground/15 py-8 text-muted-foreground transition-colors hover:text-foreground',
        )}
      >
        <Upload className="size-6" />
        <span className="text-sm font-medium">Add proof</span>
        <span className="text-xs">Image · PDF · Link</span>
      </button>
    )
  }

  // Image → a tall media placeholder (no real asset).
  if (proof.kind === 'image') {
    return (
      <div
        className={cn(
          block,
          'flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-muted-foreground',
        )}
      >
        <ImageIcon className="size-8" />
        <p className="text-xs">{proof.label}</p>
        {proof.detail && <p className="text-[11px]">{proof.detail}</p>}
      </div>
    )
  }

  // Link / PDF → a compact row with a leading icon and a trailing action.
  const isLink = proof.kind === 'link'
  const LeadIcon = isLink ? Link2 : FileText
  const TrailIcon = isLink ? ExternalLink : Download
  return (
    <button
      type="button"
      onClick={() => notReady(isLink ? 'Opening links' : 'Downloading files')}
      className={cn(
        block,
        'flex w-full items-center gap-3 p-3 text-left transition-colors hover:ring-foreground/20',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-plum-tint text-primary-plum-ink">
        <LeadIcon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-medium">{proof.label}</span>
        {proof.detail && (
          <span className="block truncate text-xs text-muted-foreground">
            {proof.detail}
          </span>
        )}
      </span>
      <TrailIcon className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

/**
 * The task block: back control, the POST'S AUTHOR (not the signed-in user, so
 * task pages stay consistent), the task itself, and its proof.
 */
function TaskBlock({
  activity,
  onClose,
  blockSurface,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
}: {
  activity: Activity
  onClose: () => void
  blockSurface: string
  // Reaction state lives in TaskDetailContent (which also renders the overlay);
  // the row's React button opens the picker at the button.
  pickerOpen: boolean
  onOpenPicker: () => void
  onClosePicker: () => void
}) {
  const { user, title, progress } = activity

  // Vouching is active on the detail: open the post, look it over, then tap
  // "Needs vouch" to back it. Local/mock state — it doesn't persist back to the
  // feed (that needs shared state or a backend).
  const [vouch, setVouch] = useState(activity.vouch)
  function handleVouch() {
    setVouch('vouched')
    if (typeof navigator.vibrate === 'function') navigator.vibrate(12)
    toast(`You vouched for ${user.name}`)
  }

  return (
    <div className="space-y-4">
      {/* Author header — replaces the feed's XP header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={onClose}
        >
          <ArrowLeft />
        </Button>
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
        <VouchBadge state={vouch} onVouch={handleVouch} />
      </div>

      {/* Task + progress */}
      <div className="space-y-2">
        <p className="font-heading text-lg font-medium">{title}</p>
        <Progress value={progress} className={TASK_BAR} />
      </div>

      {/* Proof of completion — image / link / PDF, or an "Add proof" upload
          state when none. Takes the block surface so it reads on both pages. */}
      <ProofBlock proof={activity.proof} surface={blockSurface} />

      {/* Same react / comments / share row as the feed card. */}
      <CardActions
        pickerOpen={pickerOpen}
        onOpenPicker={onOpenPicker}
        onClosePicker={onClosePicker}
        onComments={scrollToComments}
        onShare={() => void shareTask(activity)}
      />
    </div>
  )
}

/**
 * Shared detail body for both routes. The page is white in both variants; what
 * differs is how the task and comments are framed:
 *
 *   expanded → Reddit model. The task + proof live in ONE lavender card — a feed
 *              card that moved to the top of the page — and the comments are "the
 *              next part of the page": bare, edge-to-edge, no card. Proof reads as
 *              a white block inside the lavender card.
 *   full     → the task sits bare on the white page; proof + comments are their
 *              own LAVENDER cards.
 */
export function TaskDetailContent({
  activity,
  variant,
  onClose,
}: {
  activity: Activity
  variant: DetailVariant
  onClose: () => void
}) {
  const { chosen, anchor, pickerOpen, openPicker, closePicker, choose } =
    useReactions()

  // The reaction picker + chosen chip, pinned to the card (outside its clip) —
  // same as the feed card. Shared across both variants.
  const overlay = (
    <ReactionOverlay
      chosen={chosen}
      anchor={anchor}
      onChoose={choose}
      onClose={closePicker}
      onReopen={() => openPicker('card')}
    />
  )

  const pickerProps = {
    pickerOpen,
    onOpenPicker: () => openPicker('button'),
    onClosePicker: closePicker,
  }

  if (variant === 'expanded') {
    return (
      <div className="space-y-4">
        <div className="relative">
          {overlay}
          <Card>
            <CardContent className="space-y-4">
              <TaskBlock
                activity={activity}
                onClose={onClose}
                blockSurface="bg-background"
                {...pickerProps}
              />
            </CardContent>
          </Card>
        </div>
        <CommentsCard bare />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        {overlay}
        <TaskBlock
          activity={activity}
          onClose={onClose}
          blockSurface="bg-card"
          {...pickerProps}
        />
      </div>
      <CommentsCard className="bg-card" />
    </div>
  )
}
