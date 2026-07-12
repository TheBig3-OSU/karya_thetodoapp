import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Example, ShowcasePage } from './_shared'

export default function DialogPage() {
  return (
    <ShowcasePage
      title="Dialog"
      description="Modal window over the page — Karya's add/edit task form. Composed: Trigger opens it, Content is the window, Close dismisses. Esc or clicking outside also closes it (unlike AlertDialog)."
    >
      <Example
        title="Add-task dialog (click it — it really works)"
        code={`<Dialog>
  <DialogTrigger render={<Button>Add task</Button>} />
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add task</DialogTitle>
      <DialogDescription>What do you want to get done?</DialogDescription>
    </DialogHeader>
    <Label htmlFor="title">Title</Label>
    <Input id="title" placeholder="e.g. Finish COMPONENTS.md" />
    <Label htmlFor="description">Description</Label>
    <Textarea id="description" rows={3} />
    <DialogFooter>
      <DialogClose render={<Button variant="outline">Cancel</Button>} />
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`}
      >
        <Dialog>
          <DialogTrigger render={<Button>Add task</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add task</DialogTitle>
              <DialogDescription>
                What do you want to get done?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="demo-title">Title</Label>
              <Input id="demo-title" placeholder="e.g. Finish COMPONENTS.md" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-description">Description</Label>
              <Textarea id="demo-description" rows={3} />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Example>
    </ShowcasePage>
  )
}
