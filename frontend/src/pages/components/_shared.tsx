import type { ReactNode } from 'react'

// Layout wrapper for every /components/* page.
export function ShowcasePage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <a href="/components" className="hover:underline">
            ← All components
          </a>
        </p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      {children}
    </main>
  )
}

// One demo block: live components on top, the code to write below.
export function Example({
  title,
  code,
  children,
}: {
  title: string
  code: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-6">
        {children}
      </div>
      <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs">
        <code>{code}</code>
      </pre>
    </section>
  )
}
