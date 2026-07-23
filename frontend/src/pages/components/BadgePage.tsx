import { Badge } from '@/components/ui/badge'
import { Example, ShowcasePage } from './_shared'

export default function BadgePage() {
  return (
    <ShowcasePage
      title="Badge"
      description="Small informative pills — XP values and status tags. Not interactive."
    >
      <Example
        title="Variants"
        code={`<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="ghost">Ghost</Badge>
<Badge variant="link">Link</Badge>`}
      >
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="ghost">Ghost</Badge>
        <Badge variant="link">Link</Badge>
      </Example>

      <Example
        title="In Karya"
        code={`<Badge variant="secondary">+50 XP</Badge>
<Badge variant="outline">Done</Badge>`}
      >
        <Badge variant="secondary">+50 XP</Badge>
        <Badge variant="outline">Done</Badge>
      </Example>

      {/* Lesson 6: add the custom `xp` variant to badge.tsx, then demo it here. */}
    </ShowcasePage>
  )
}
