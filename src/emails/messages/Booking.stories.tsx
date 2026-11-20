import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MessageStory } from "./MessageStory"
import { MESSAGES } from "./catalog"

// Booking and visits: the texts and emails a customer gets from the booking to the day of the visit, and when a visit is canceled. Each message has two stories: on a laptop (the text, then the Current and Proposed emails side by side) and on a phone (the Proposed email and the text at 375px).

const meta = {
  title: "Messages/Booking and visits",
  component: MessageStory,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MessageStory>
export default meta
type Story = StoryObj<typeof meta>

const when = (id: string) => MESSAGES.find((m) => m.id === id)!.when
const laptop = (id: string): Story => ({ args: { id, view: "laptop" }, globals: { viewport: { value: "laptop", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })
const phone = (id: string): Story => ({ args: { id, view: "phone" }, globals: { viewport: { value: "phone", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })

export const BookingConfirmation = laptop("booking-confirmation")
export const BookingConfirmationOnAPhone = phone("booking-confirmation")
export const DaySet = laptop("date-set")
export const DaySetOnAPhone = phone("date-set")
export const DayMoved = laptop("date-moved")
export const DayMovedOnAPhone = phone("date-moved")
export const TwoWeeksOut = laptop("date-confirm")
export const TwoWeeksOutOnAPhone = phone("date-confirm")
export const DayBefore = laptop("day-before")
export const DayBeforeOnAPhone = phone("day-before")
export const OnMyWay = laptop("on-the-way")
export const OnMyWayOnAPhone = phone("on-the-way")
export const CanceledByYou = laptop("visit-cancelled")
export const CanceledByYouOnAPhone = phone("visit-cancelled")
export const CanceledByUs = laptop("canceled-by-us")
export const CanceledByUsOnAPhone = phone("canceled-by-us")
export const TextSentAsEmail = laptop("note-paused")
export const TextSentAsEmailOnAPhone = phone("note-paused")
