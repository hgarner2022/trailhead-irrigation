import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./carousel"

const meta = {
  title: "UI/Carousel",
  component: Carousel,
} satisfies Meta<typeof Carousel>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Carousel className="mx-auto my-6 max-w-md">
      <CarouselContent>
        {["Spring turn-on", "Mid-season check", "Fall blowout"].map((slide) => (
          <CarouselItem key={slide}>
            <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-card text-xl font-semibold">
              {slide}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}
