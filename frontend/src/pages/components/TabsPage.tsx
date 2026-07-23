import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Example, ShowcasePage } from './_shared'

export default function TabsPage() {
  return (
    <ShowcasePage
      title="Tabs"
      description="Switch between panels that share a spot. Composed: TabsList holds the TabsTriggers, and each TabsTrigger reveals the TabsContent with the matching value. Karya's Create / Join House toggle."
    >
      <Example
        title="Default variant — the segmented pill (Create / Join House)"
        code={`<Tabs defaultValue="create">
  <TabsList>
    <TabsTrigger value="create">Create</TabsTrigger>
    <TabsTrigger value="join">Join</TabsTrigger>
  </TabsList>
  <TabsContent value="create">Name your house and pick a sigil.</TabsContent>
  <TabsContent value="join">Enter an invite code to join a house.</TabsContent>
</Tabs>`}
      >
        <Tabs defaultValue="create" className="w-72">
          <TabsList>
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="join">Join</TabsTrigger>
          </TabsList>
          <TabsContent value="create" className="pt-2 text-muted-foreground">
            Name your house and pick a sigil.
          </TabsContent>
          <TabsContent value="join" className="pt-2 text-muted-foreground">
            Enter an invite code to join a house.
          </TabsContent>
        </Tabs>
      </Example>

      <Example
        title="Line variant — active tab underlined instead of filled"
        code={`<Tabs defaultValue="active">
  <TabsList variant="line">
    <TabsTrigger value="all">All</TabsTrigger>
    <TabsTrigger value="active">Active</TabsTrigger>
    <TabsTrigger value="done">Done</TabsTrigger>
  </TabsList>
</Tabs>`}
      >
        <Tabs defaultValue="active" className="w-72">
          <TabsList variant="line">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </Example>

      <Example
        title="Disabled tab — a trigger that can't be selected"
        code={`<Tabs defaultValue="create">
  <TabsList>
    <TabsTrigger value="create">Create</TabsTrigger>
    <TabsTrigger value="join" disabled>Join</TabsTrigger>
  </TabsList>
</Tabs>`}
      >
        <Tabs defaultValue="create" className="w-72">
          <TabsList>
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="join" disabled>
              Join
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Example>
    </ShowcasePage>
  )
}
