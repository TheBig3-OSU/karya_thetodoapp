import { EmptyState, FeedShell } from './parts'

// New user: blank feed prompting the first task. Route: /feed/new
export default function NewFeedPage() {
  return (
    <FeedShell>
      <EmptyState />
    </FeedShell>
  )
}
