import { Progress } from '@/components/ui/progress'
import { Example, ShowcasePage } from './_shared'

export default function ProgressPage() {
  return (
    <ShowcasePage
      title="Progress"
      description="A horizontal bar filled to a 0–100 value. Karya's XP level bar and per-task progress. Self-contained: <Progress value={n} /> renders its own track + fill — no manual composition."
    >
      <Example
        title="Values — the fill follows the value prop"
        code={`<Progress value={25} />
<Progress value={60} />
<Progress value={100} />`}
      >
        <div className="w-full space-y-4">
          <Progress value={25} />
          <Progress value={60} />
          <Progress value={100} />
        </div>
      </Example>

      <Example
        title="Taller bar — override height via a descendant selector"
        code={`<Progress
  value={70}
  className="[&_[data-slot=progress-track]]:h-2.5"
/>`}
      >
        <div className="w-full">
          <Progress
            value={70}
            className="[&_[data-slot=progress-track]]:h-2.5"
          />
        </div>
      </Example>

      <Example
        title="In Karya — an XP bar (level 16, 60% to next)"
        code={`<Progress value={60} className="[&_[data-slot=progress-track]]:h-2" />`}
      >
        <div className="w-full">
          <Progress
            value={60}
            className="[&_[data-slot=progress-track]]:h-2"
          />
        </div>
      </Example>
    </ShowcasePage>
  )
}
