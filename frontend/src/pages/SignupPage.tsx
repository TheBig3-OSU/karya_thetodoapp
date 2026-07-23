import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, setToken } from '@/lib/api'
import { Flame } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const HOUSE_GRADIENT =
  'bg-[linear-gradient(90deg,var(--house-grad-from),var(--house-grad-to))]'

export default function SignupPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordMismatch = confirm.length > 0 && confirm !== password
  const canSubmit =
    username.trim().length >= 3 &&
    password.length >= 8 &&
    password === confirm &&
    !loading

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      const data = await register(username.trim(), password)
      setToken(data.access_token)
      toast.success(`Welcome to Karya, ${data.user.username}!`)
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-8 px-6 py-8">
      {/* Logo mark */}
      <div className="flex flex-col items-center gap-3 pt-12">
        <div className="flex size-16 items-center justify-center rounded-full bg-house-tint">
          <Flame className="size-8 text-house-ink" />
        </div>
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground">
            Start your Karya quest today
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_username"
            autoComplete="username"
            autoFocus
            className="h-11"
          />
          {username.length > 0 && username.trim().length < 3 && (
            <p className="text-xs text-destructive">
              At least 3 characters (letters, numbers, _)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="h-11"
          />
          {password.length > 0 && password.length < 8 && (
            <p className="text-xs text-destructive">At least 8 characters</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="h-11"
          />
          {passwordMismatch && (
            <p className="text-xs text-destructive">Passwords don&apos;t match</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          className={cn('mt-2 h-12 w-full text-base text-white', HOUSE_GRADIENT)}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-house-ink underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </main>
  )
}
