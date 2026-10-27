import {
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Paperclip, Upload, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { BottomNav } from './parts'
import { ACTIVITIES, CATEGORY_META } from './data'
import { TASK_BAR } from './utils'

// The owner's view of their OWN task (vs. the friend-side `TaskDetailPage`):
// see the task, set progress, attach proof, and post it. Route: /tasks/:id.
// Everything is mock/local — nothing here touches a backend. The upload only
// reads File.name client-side; it never sends bytes anywhere.

type Attachment = { id: number; name: string }

// A short celebratory burst that rains from both sides of the screen. Skipped
// for reduced-motion users (they still get the toast).
function fireConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#7c2e85', '#4a154b', '#f3c66a', '#c98a1a']
  const end = Date.now() + 600
  ;(function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors })
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

export default function MyTaskPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const task = ACTIVITIES.find((a) => String(a.id) === id)

  const fileRef = useRef<HTMLInputElement>(null)
  const nextFileId = useRef(0)
  const barRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [progress, setProgress] = useState(task?.progress ?? 0)
  const [files, setFiles] = useState<Attachment[]>([])
  const [submitted, setSubmitted] = useState(false)

  if (!task) return <Navigate to="/feed" replace />

  function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).map((f) => ({
      id: nextFileId.current++,
      name: f.name,
    }))
    if (picked.length) setFiles((prev) => [...prev, ...picked])
    e.target.value = '' // let the same file be picked again after removal
  }

  function removeFile(fileId: number) {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  // The progress bar itself is the control — clicking/dragging anywhere on it
  // seeks to that point (no draggable thumb). Map the pointer's x to 0–100%.
  function seekTo(clientX: number) {
    const el = barRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    setProgress(Math.round(Math.min(1, Math.max(0, ratio)) * 100))
  }
  function onBarPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (submitted) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    seekTo(e.clientX)
  }
  function onBarPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragging.current) seekTo(e.clientX)
  }
  function onBarPointerUp(e: PointerEvent<HTMLDivElement>) {
    dragging.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }
  function onBarKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (submitted) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setProgress((p) => Math.min(100, p + 5))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setProgress((p) => Math.max(0, p - 5))
    }
  }

  function handleSubmit() {
    if (submitted) return
    setSubmitted(true)
    if (typeof navigator.vibrate === 'function') navigator.vibrate(20)
    fireConfetti()
    toast.success('Posted successfully')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md space-y-6 px-4 pb-40 pt-4">
        {/* Back */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft />
          </Button>
          <p className="text-sm text-muted-foreground">Your task</p>
        </div>

        {/* Task name */}
        <h1 className="font-heading text-2xl font-semibold leading-tight">
          {task.title}
        </h1>

        {/* Progress — editable */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">Progress</p>
            <span className="text-sm tabular-nums text-muted-foreground">
              {progress}%
            </span>
          </div>
          {/* The bar IS the control — click or drag anywhere on it to seek. The
              extra vertical padding makes the thin bar easy to grab; no thumb. */}
          <div
            ref={barRef}
            role="slider"
            aria-label="Set progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            tabIndex={submitted ? -1 : 0}
            onPointerDown={onBarPointerDown}
            onPointerMove={onBarPointerMove}
            onPointerUp={onBarPointerUp}
            onKeyDown={onBarKeyDown}
            className={cn(
              'touch-none select-none rounded py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              submitted ? 'pointer-events-none opacity-70' : 'cursor-pointer',
            )}
          >
            <Progress value={progress} className={TASK_BAR} />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {task.categories.map((key) => {
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
        </div>

        {/* Media upload — local only, no backend */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Proof / media</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={addFiles}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={submitted}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/15 bg-card py-8 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 disabled:hover:text-muted-foreground"
          >
            <Upload className="size-6" />
            <span className="text-sm font-medium">Upload your proof</span>
            <span className="text-xs">Image · PDF</span>
          </button>

          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/10"
                >
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  {!submitted && (
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeFile(file.id)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* Post — fixed just above the bottom nav. */}
      <div className="fixed inset-x-0 bottom-16 z-10 border-t bg-background">
        <div className="mx-auto max-w-md px-4 py-3">
          <Button
            onClick={handleSubmit}
            disabled={submitted}
            className="h-11 w-full bg-primary-plum text-base text-white disabled:opacity-100"
          >
            {submitted ? (
              <>
                <CheckCircle2 className="size-5" />
                Posted
              </>
            ) : (
              'Post'
            )}
          </Button>
        </div>
      </div>

      <BottomNav active="tasks" />
    </div>
  )
}
