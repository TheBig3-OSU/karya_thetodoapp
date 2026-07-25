import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import { Example, ShowcasePage } from './_shared'

export default function AvatarPage() {
  return (
    <ShowcasePage
      title="Avatar"
      description="A user's picture, falling back to initials when there's no image. Karya's activity-feed cards and XP header. Composed: AvatarImage on top, AvatarFallback underneath."
    >
      <Example
        title="Fallback initials (what the feed uses — no image)"
        code={`<Avatar>
  <AvatarFallback>CN</AvatarFallback>
</Avatar>`}
      >
        <Avatar>
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>SK</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>HL</AvatarFallback>
        </Avatar>
      </Example>

      <Example
        title="Sizes — sm / default / lg"
        code={`<Avatar size="sm"><AvatarFallback>SM</AvatarFallback></Avatar>
<Avatar><AvatarFallback>MD</AvatarFallback></Avatar>
<Avatar size="lg"><AvatarFallback>LG</AvatarFallback></Avatar>`}
      >
        <Avatar size="sm">
          <AvatarFallback>SM</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>MD</AvatarFallback>
        </Avatar>
        <Avatar size="lg">
          <AvatarFallback>LG</AvatarFallback>
        </Avatar>
      </Example>

      <Example
        title="With image (falls back to initials if it fails to load)"
        code={`<Avatar>
  <AvatarImage src="/some-avatar.jpg" alt="Sasank" />
  <AvatarFallback>SK</AvatarFallback>
</Avatar>`}
      >
        <Avatar>
          <AvatarImage
            src="https://i.pravatar.cc/64?img=12"
            alt="Example user"
          />
          <AvatarFallback>SK</AvatarFallback>
        </Avatar>
      </Example>

      <Example
        title="Status badge — base-nova extra"
        code={`<Avatar>
  <AvatarFallback>SK</AvatarFallback>
  <AvatarBadge className="bg-emerald-500" />
</Avatar>`}
      >
        <Avatar>
          <AvatarFallback>SK</AvatarFallback>
          <AvatarBadge className="bg-emerald-500" />
        </Avatar>
      </Example>

      <Example
        title="Avatar group with overflow count — base-nova extra"
        code={`<AvatarGroup>
  <Avatar><AvatarFallback>SK</AvatarFallback></Avatar>
  <Avatar><AvatarFallback>HL</AvatarFallback></Avatar>
  <Avatar><AvatarFallback>MR</AvatarFallback></Avatar>
  <AvatarGroupCount>+3</AvatarGroupCount>
</AvatarGroup>`}
      >
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>SK</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>HL</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>MR</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+3</AvatarGroupCount>
        </AvatarGroup>
      </Example>
    </ShowcasePage>
  )
}
