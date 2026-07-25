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
 * The comments thread in its own card — used by BOTH detail variants. The
 * surface is passed in (`className`) because it inverts per variant: white on
 * the expanded lavender page, lavender on the full white page. Replies nest
 * under whichever comment you answer, Reddit-style.
 */
export function CommentsCard({ className }: { className?: string }) {
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

  return (
    <Card className={className}>
      <CardContent className="space-y-4">
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

        <div className="flex items-center gap-2 border-t pt-3">
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
      </CardContent>
    </Card>
  )
}
