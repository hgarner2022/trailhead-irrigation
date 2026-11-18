import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable"

// The shadcn primitive the side panel is built on: panels with a handle between them that takes the mouse and the arrow keys.
const meta = {
  title: "UI/Resizable",
  component: ResizablePanelGroup,
} satisfies Meta<typeof ResizablePanelGroup>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="m-6 h-48 max-w-xl rounded-lg border border-border">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="50%" minSize="20%">
          <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">Page</div>
        </ResizablePanel>
        <ResizableHandle aria-label="Resize" withHandle />
        <ResizablePanel defaultSize="50%" minSize="20%">
          <div className="flex h-full items-center justify-center p-4 text-sm">Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
}
