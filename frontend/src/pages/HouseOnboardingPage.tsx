import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createTeam, joinTeam } from '@/lib/api'
import {
  Anchor,
  ArrowRight,
  Castle,
  Crown,
  Feather,
  Flame,
  Gem,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Mode = 'create' | 'join'

// The sigil options. `id` is what we persist; `Icon` is the lucide component.
const SIGILS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'castle', label: 'Castle', Icon: Castle },
  { id: 'crown', label: 'Crown', Icon: Crown },
  { id: 'shield', label: 'Shield', Icon: Shield },
  { id: 'flame', label: 'Flame', Icon: Flame },
  { id: 'anchor', label: 'Anchor', Icon: Anchor },
  { id: 'feather', label: 'Feather', Icon: Feather },
  { id: 'gem', label: 'Gem', Icon: Gem },
]

// The gradient reused by the toggle pill and the Continue button.
const HOUSE_GRADIENT =
  'bg-[linear-gradient(90deg,var(--house-grad-from),var(--house-grad-to))]'

export default function HouseOnboardingPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('create')
  const [loading, setLoading] = useState(false)

  // Create-flow state.
  const [name, setName] = useState('')
  const [nameSubmitted, setNameSubmitted] = useState(false)
  const [sigilId, setSigilId] = useState<string | null>(null)

  // Join-stub state.
  const [joinCode, setJoinCode] = useState('')

  const selectedSigil = SIGILS.find((s) => s.id === sigilId)
  // Big preview shows the chosen sigil, else a dimmed placeholder.
  const PreviewIcon = selectedSigil?.Icon ?? Castle
  const createReady = nameSubmitted && sigilId !== null

  function submitName(e: FormEvent) {
    e.preventDefault()
    if (name.trim() === '') return
    setNameSubmitted(true)
  }

  async function handleContinue() {
    setLoading(true)
    try {
      if (mode === 'create') {
        await createTeam(name.trim())
        toast.success(`House "${name.trim()}" created`)
      } else {
        await joinTeam(joinCode.trim())
        toast.success('Joined house!')
      }
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-8 px-6 py-8">
      {/* Skip — top-right */}
      <div className="flex justify-end">
        <Button
          variant="link"
          size="sm"
          className="text-muted-foreground"
          render={<Link to="/">Skip</Link>}
        />
      </div>

      {/* Create / Join segmented control — one shared pill that SLIDES */}
      <div className="relative grid h-11 grid-cols-2 rounded-xl bg-muted p-1">
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg shadow-sm transition-transform duration-300 ease-out',
            HOUSE_GRADIENT,
            mode === 'join' && 'translate-x-full',
          )}
        />
        {(['create', 'join'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'relative z-10 rounded-lg text-sm font-medium capitalize transition-colors',
              mode === m ? 'text-white' : 'text-muted-foreground',
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'create' ? (
        <>
          {/* Big sigil preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-32 items-center justify-center rounded-full bg-house-tint">
              <PreviewIcon
                key={sigilId ?? 'placeholder'}
                className={cn(
                  'size-14 text-house-ink duration-300 animate-in zoom-in',
                  !selectedSigil && 'opacity-30',
                )}
              />
            </div>
            {/* Name preview — appears once the name is submitted */}
            {nameSubmitted && (
              <p className="text-lg font-semibold duration-300 animate-in fade-in">
                {name.trim()}
              </p>
            )}
          </div>

          {/* House name field with nested submit arrow */}
          <form onSubmit={submitName} className="space-y-2">
            <Label htmlFor="house-name">House name</Label>
            <div className="relative">
              <Input
                id="house-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="enter your House name"
                className="h-11 pr-11"
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon-sm"
                variant="ghost"
                aria-label="Confirm house name"
                disabled={name.trim() === ''}
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
              >
                <ArrowRight />
              </Button>
            </div>
          </form>

          {/* Sigil picker — fades in from the bottom after the name is set */}
          {nameSubmitted && (
            <div className="space-y-2 duration-500 animate-in fade-in slide-in-from-bottom-4">
              <Label>House sigil</Label>
              <div className="flex items-center justify-between gap-1 rounded-xl bg-house-tint p-1.5">
                {SIGILS.map(({ id, label, Icon }) => {
                  const selected = id === sigilId
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSigilId(id)}
                      aria-label={label}
                      aria-pressed={selected}
                      className={cn(
                        'flex size-9 items-center justify-center rounded-lg transition-colors',
                        selected
                          ? 'bg-background text-house-ink shadow-sm'
                          : 'text-house-ink/70 hover:text-house-ink',
                      )}
                    >
                      <Icon className="size-5" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Continue — appears only once name + sigil are both set */}
          {createReady && (
            <Button
              onClick={handleContinue}
              disabled={loading}
              className={cn(
                'mt-auto h-12 text-base text-white duration-300 animate-in fade-in slide-in-from-bottom-2',
                HOUSE_GRADIENT,
              )}
            >
              {loading ? 'Creating…' : 'Continue'}
            </Button>
          )}
        </>
      ) : (
        // Join — intentional stub: one invite-code field + Continue.
        <div className="flex flex-1 flex-col gap-8">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite code</Label>
            <Input
              id="invite-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. KARYA-1234"
              className="h-11"
              autoComplete="off"
            />
          </div>
          <Button
            onClick={handleContinue}
            disabled={joinCode.trim() === '' || loading}
            className={cn('mt-auto h-12 text-base text-white', HOUSE_GRADIENT)}
          >
            {loading ? 'Joining…' : 'Continue'}
          </Button>
        </div>
      )}
    </main>
  )
}
