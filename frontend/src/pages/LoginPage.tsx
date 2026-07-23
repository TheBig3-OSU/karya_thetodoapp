import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, setToken } from '@/lib/api'
import { Flame } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const HOUSE_GRADIENT =
  'bg-[linear-gradient(90deg,var(--house-grad-from),var(--house-grad-to))]'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    try {
      const data = await login(username.trim(), password)
      setToken(data.access_token)
      toast.success(`Welcome back, ${data.user.username}!`)
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
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
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your Karya account
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="h-11"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !username.trim() || !password}
          className={cn('mt-2 h-12 w-full text-base text-white', HOUSE_GRADIENT)}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-medium text-house-ink underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </main>
  )
}
