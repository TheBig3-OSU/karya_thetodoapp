import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Example, ShowcasePage } from './_shared'

export default function ButtonPage() {
  return (
    <ShowcasePage
      title="Button"
      description="Clickable actions. One default (primary) button per view; pick other variants by emphasis."
    >
      <Example
        title="Variants"
        code={`<Button>Add task</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>`}
      >
        <Button>Add task</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="link">Link</Button>
      </Example>

      <Example
        title="Sizes"
        code={`<Button size="xs">xs</Button>
<Button size="sm">sm</Button>
<Button>default</Button>
<Button size="lg">lg</Button>`}
      >
        <Button size="xs">xs</Button>
        <Button size="sm">sm</Button>
        <Button>default</Button>
        <Button size="lg">lg</Button>
      </Example>

      <Example
        title="Icon buttons (pair with Tooltip later)"
        code={`<Button size="icon" variant="ghost"><Pencil /></Button>
<Button size="icon" variant="destructive"><Trash2 /></Button>`}
      >
        <Button size="icon" variant="ghost" aria-label="Edit">
          <Pencil />
        </Button>
        <Button size="icon" variant="destructive" aria-label="Delete">
          <Trash2 />
        </Button>
      </Example>

      <Example
        title="States — hover/focus/active are automatic; disabled is a prop. Tab to see the focus ring."
        code={`<Button disabled>Disabled</Button>`}
      >
        <Button disabled>Disabled</Button>
      </Example>
    </ShowcasePage>
  )
}
