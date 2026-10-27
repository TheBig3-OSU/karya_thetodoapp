import { useRef, useState, type FormEvent } from 'react'
import { CornerDownRight } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MOCK_COMMENTS, type Comment } from './data'

// Components only — data lives in `data.ts`, helpers in `utils.ts`.
//
// TODO(backend): replies are held in React state and vanish on refresh. The
// `threads` table exists in the schema but there's no comments endpoint yet
// (see the TODO block in data.ts).

// Stop indenting past this depth so deep threads don't run off a phone screen.
const MAX_INDENT_DEPTH = 4

// Recursively insert a reply under its parent. Module-private on purpose: a
// non-component export here would disable Fast Refresh for this file.
function addReply(list: Comment[], parentId: number, reply: Comment): Comment[] {
  return list.map((comment) =>
    comment.id === parentId
      ? { ...comment, replies: [...comment.replies, reply] }
      : { ...comment, replies: addReply(comment.replies, parentId, reply) },
  )
}

function CommentComposer({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string
  onSubmit: (text: string) => void
  onCancel?: () => void
}) {
  const [text, setText] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (text.trim() === '') return
    onSubmit(text.trim())
    setText('')
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="h-9 flex-1"
        autoComplete="off"
        autoFocus={Boolean(onCancel)}
      />
      <Button type="submit" size="sm" disabled={text.trim() === ''}>
        Post
      </Button>
      {onCancel && (
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </form>
  )
}

function CommentNode({
  comment,
  depth,
  replyingTo,
  onStartReply,
  onCancelReply,
  onReply,
}: {
  comment: Comment
  depth: number
  replyingTo: number | null
  onStartReply: (id: number) => void
  onCancelReply: () => void
  onReply: (parentId: number, text: string) => void
}) {
  const isReplying = replyingTo === comment.id

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Avatar size="sm">
          <AvatarFallback className="bg-primary-plum-tint text-primary-plum-ink">
            {comment.author.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 leading-snug">
          <p className="text-sm font-medium">{comment.author.name}</p>
          <p className="text-sm text-muted-foreground">{comment.text}</p>
          <Button
            variant="ghost"
            size="xs"
            className="mt-1 -ml-2 text-muted-foreground"
            onClick={() => onStartReply(comment.id)}
          >
            <CornerDownRight />
            Reply
          </Button>
        </div>
      </div>

      {isReplying && (
        <div className="pl-8">
          <CommentComposer
            placeholder={`Reply to ${comment.author.name}…`}
            onSubmit={(text) => onReply(comment.id, text)}
            onCancel={onCancelReply}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div
          className={cn(
            'space-y-3 border-l pl-3',
            // Indent each level until the cap, then stay put.
            depth < MAX_INDENT_DEPTH ? 'ml-4' : 'ml-0',
          )}
        >
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              replyingTo={replyingTo}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The comments thread. Replies nest under whichever comment you answer,
 * Reddit-style. Two shapes, per detail variant:
 *
 *   bare  → no card wrapper: the thread sits directly on the page and spans it
 *           edge-to-edge (the Reddit model — the post is a card, the comments
 *           are "the next part of the page"). Used by the expanded view.
 *   card  → wrapped in a lavender Card. Used by the full-page view, where the
 *           task sits bare and the comments need their own surface.
 */
export function CommentsCard({
  className,
  bare = false,
}: {
  className?: string
  bare?: boolean
}) {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const nextId = useRef(1000)

  function makeComment(text: string): Comment {
    nextId.current += 1
    return {
      id: nextId.current,
      author: { name: 'You', initials: 'CN' },
      text,
      replies: [],
    }
  }

  function handleReply(parentId: number, text: string) {
    setComments((prev) => addReply(prev, parentId, makeComment(text)))
    setReplyingTo(null)
  }

  function handleRootComment(text: string) {
    setComments((prev) => [...prev, makeComment(text)])
  }

  // In bare mode the composer is pinned just above the bottom nav (`bottom-16`)
  // so it stays reachable while the thread scrolls — Reddit/messaging style. The
  // `-mx-4 … px-4` + opaque background makes it a full-column bar the thread
  // scrolls under. In card mode it's a plain inline row on the lavender card.
  const composer = (
    <div
      className={
        bare
          ? 'sticky bottom-16 z-10 -mx-4 flex items-center gap-2 border-t bg-background px-4 py-3'
          : 'flex items-center gap-2 border-t pt-3'
      }
    >
      <Avatar size="sm">
        <AvatarFallback className="bg-primary-plum-tint text-primary-plum-ink">
          CN
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <CommentComposer
          placeholder="Add a comment…"
          onSubmit={handleRootComment}
        />
      </div>
    </div>
  )

  const inner = (
    <>
      <p className="text-sm font-medium text-muted-foreground">comments</p>

      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentNode
            key={comment.id}
            comment={comment}
            depth={0}
            replyingTo={replyingTo}
            onStartReply={setReplyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onReply={handleReply}
          />
        ))}
      </div>

      {composer}
    </>
  )

  // id="comments" is the scroll target for the Comments buttons (feed + detail).
  if (bare) {
    return (
      <div id="comments" className={cn('scroll-mt-4 space-y-4', className)}>
        {inner}
      </div>
    )
  }

  return (
    <Card id="comments" className={cn('scroll-mt-4', className)}>
      <CardContent className="space-y-4">{inner}</CardContent>
    </Card>
  )
}
