import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { VisitPageModel } from "@/lib/portal/visit-page"
import { AddToCalendarLinks } from "./AddToCalendarLinks"
import { CancelVisitSheet } from "./CancelVisitSheet"
import type { PhotoItem } from "@/lib/photos/types"
import { Photos, type PendingPhoto } from "./Photos"
import { RescheduleSheet } from "./RescheduleSheet"
import { VisitPage } from "./VisitPage"

const base: VisitPageModel = {
  service: "Spring turn-on",
  label: "Season Pass 2027",
  pill: { status: "scheduled", label: "Booked" },
  dayLine: "Wednesday, April 28. We'll text you the time the day before.",
  dayHeading: "Wednesday, April 28",
  dayDetail: "We'll text you the time the day before.",
  where: "412 Briggs Street, Erie",
  mustBeHome: true,
  included: "8 zones, start up, check each head",
  priceLine: "$120, charged to the Visa ending 4242 after the visit",
  money: { tone: "none", label: "" },
  receipts: [],
  invoice: null,
  reschedule: "yes",
  cancel: "yes",
  canCalendar: true,
  changeLine: "You can change this until Monday, April 26, 11:59 pm.",
  textBody: "Hi Ryan, it's Andrea Lopez at 412 Briggs Street about my spring turn-on on Wednesday, April 28.",
  textHref: "sms:+19706927270?&body=Hi%20Ryan",
}
const days = ["2027-04-29", "2027-04-30", "2027-05-05", "2027-05-07", "2027-05-12"]
const slots = {
  rescheduleSlot: <RescheduleSheet service="Spring turn-on" address="412 Briggs Street" currentDay="2027-04-28" days={days} textHref={base.textHref} />,
  cancelSlot: <CancelVisitSheet service="Spring turn-on" dayWords="Wednesday, April 28" consequence="Nothing is charged. Your Season Pass stays and this visit comes off it." textHref={base.textHref} />,
  calendarSlot: <AddToCalendarLinks googleHref="https://calendar.google.com/calendar/render?action=TEMPLATE" icsHref="/api/visits/v1/calendar.ics?token=t" />,
}

const meta = {
  title: "Blocks/VisitPage",
  component: VisitPage,
  parameters: { layout: "fullscreen" },
  args: { model: base, ...slots },
  decorators: [(Story) => <div className="min-h-svh bg-cream"><Story /></div>],
} satisfies Meta<typeof VisitPage>
export default meta
type Story = StoryObj<typeof meta>

const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const done = { pill: { status: "done" as const, label: "Done" }, reschedule: "no" as const, cancel: "no" as const, canCalendar: false, changeLine: null, priceLine: "", label: null }

/** A Season Pass visit before the cut-off, the window not told yet. */
export const BookedPhone: Story = { ...phone }
export const BookedLaptop: Story = { ...laptop }
/** The day-before text went out: the window and who is coming. */
export const WindowToldPhone: Story = { ...phone, args: { model: { ...base, dayLine: "Wednesday, April 28 at 8:00 am. Ryan is coming.", dayDetail: "Ryan is coming." } } }
/** Inside 24 hours: Text Ryan and Call Ryan, with why. */
export const InsideCutoffPhone: Story = { ...phone, args: { model: { ...base, reschedule: "text", cancel: "text", changeLine: null } } }
export const InsideCutoffLaptop: Story = { ...laptop, args: { model: { ...base, reschedule: "text", cancel: "text", changeLine: null } } }
/** A one-off with a price and no card on file. */
export const OneOffNoCardPhone: Story = { ...phone, args: { model: { ...base, label: null, service: "Repair", priceLine: "$145, paid after the visit", mustBeHome: false } } }
/** Work whose days are set with Ryan: cancel online, change the day by text. */
export const InstallPhone: Story = { ...phone, args: { model: { ...base, label: null, service: "Sprinkler installation", reschedule: "text", included: null, priceLine: "" } } }
/** No day yet. */
export const NoDayPhone: Story = { ...phone, args: { model: { ...base, dayLine: "Pick a day.", canCalendar: false, changeLine: null } } }
export const PaidPhone: Story = {
  ...phone,
  args: { model: { ...base, ...done, service: "Repair", dayLine: "Done Tuesday, November 3, 2026.", money: { tone: "paid", label: "Paid" }, receipts: [{ id: "pay_1", words: "Paid Nov 3, card $145", href: "/account/receipts/pay_1" }] } },
}
export const PaidLaptop: Story = {
  ...laptop,
  args: { model: { ...base, ...done, service: "Repair", dayLine: "Done Tuesday, November 3, 2026.", money: { tone: "paid", label: "Paid" }, receipts: [{ id: "pay_1", words: "Paid Nov 3, check $80", href: "/account/receipts/pay_1" }, { id: "pay_2", words: "Paid Nov 9, card $65", href: "/account/receipts/pay_2" }] } },
}
export const InvoiceSentPhone: Story = {
  ...phone,
  args: { model: { ...base, ...done, service: "Repair", dayLine: "Done Saturday, March 20.", money: { tone: "invoice-sent", label: "Invoice sent, due Dec 1" }, invoice: { id: "inv_1", total: 115, dueOn: "2027-12-01", status: "sent", payHref: "/pay/inv_1?token=abc" } } },
}
export const PastDueLaptop: Story = {
  ...laptop,
  args: { model: { ...base, ...done, service: "Repair", dayLine: "Done Saturday, March 20.", money: { tone: "past-due", label: "Past due since Apr 1" }, invoice: { id: "inv_2", total: 115, dueOn: "2027-04-01", status: "overdue", payHref: "/pay/inv_2?token=def" } } },
}
export const CanceledPhone: Story = { ...phone, args: { model: { ...base, ...done, pill: { status: "skipped", label: "Canceled" }, dayLine: "Canceled Fri, Apr 2." } } }

// The Photos section on the visit page: the customer's own uploads and the ones Ryan marked, an upload that failed, a photo over 10 MB, and none yet.
const pic = (hue: number) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="hsl(${hue} 35% 62%)"/><rect y="290" width="400" height="110" fill="hsl(${hue} 30% 40%)"/></svg>`)}`
const shot = (n: number, mine: boolean): PhotoItem => ({ id: `photo_${n}`, visitId: "v1", jobId: "j1", customerId: "c1", url: pic(90 + n * 50), contentType: "image/jpeg", bytes: 1_500_000, addedBy: mine ? "customer" : "staff", addedByName: null, byCustomer: mine, shownToCustomer: true, canRemove: mine, createdAt: "2027-04-28T17:00:00Z" })
const addOk = async () => ({ ok: true as const, photo: shot(9, true) })
const withPhotos = (photos: PhotoItem[], pending: PendingPhoto[] = []) => ({ model: base, ...slots, photosSlot: <Photos audience="customer" photos={photos} onAdd={addOk} onRemove={async () => ({ ok: true as const })} initialPending={pending} /> })
export const PhotosPhone: Story = { ...phone, args: withPhotos([shot(1, true), shot(2, false), shot(3, true)]) }
export const PhotosLaptop: Story = { ...laptop, args: withPhotos([shot(1, true), shot(2, false), shot(3, true)]) }
export const PhotosEmptyPhone: Story = { ...phone, args: withPhotos([]) }
export const PhotoUploadFailedPhone: Story = { ...phone, args: withPhotos([shot(1, true)], [{ key: "f", name: "IMG_1.jpg", state: "problem", message: "Upload failed. Try again.", file: new File(["x"], "IMG_1.jpg", { type: "image/jpeg" }) }]) }
export const PhotoTooBigLaptop: Story = { ...laptop, args: withPhotos([shot(1, true)], [{ key: "b", name: "IMG_2.jpg", state: "problem", message: "That photo is over 10 MB." }]) }
