import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { AccountNav } from "@/components/blocks/AccountNav"
import type { Pass } from "@/lib/admin/types"
import { andrea as andreaCustomer, andreaTwoProperties, canceledRepairJob, dana as danaCustomer, invoicedJob, oneOffJob, partPaidJob, passJob, passJobCanceled, passJobCanceledVisit, passJobInsideCutoff, passJobWindowTold, pastDueJob, repairJob, TODAY } from "./account-fixtures"
import { DetailsScreen } from "./DetailsScreen"
import { HomeScreen } from "./HomeScreen"
import { reportFor } from "@/emails/fixtures"
import { ReceiptScreen } from "./ReceiptScreen"
import { VisitScreen } from "./VisitScreen"
import { VisitsScreen } from "./VisitsScreen"

// Every account screen at 375 and 1280, on fixtures. Home: before the cut-off, the window told, inside 24 hours, an invoice sent, past due, a Season Pass visit canceled, a canceled
// pass, no visit and no pass, nothing at all. Visits: the timeline, two properties, a canceled visit, empty. A visit: booked, window told, inside 24 hours, a one-off, paid, part paid,
// invoice out, past due, canceled. Details and the receipt. The two sheets and Text Ryan have their own block stories. The pass is passes[0] of the pass stories' snapshot, with a 2027 season.
const pass = snapshot.passes[0] as Pass
const days = { v1: ["2027-04-29", "2027-04-30", "2027-05-05", "2027-05-07", "2027-05-12"], v2: ["2027-10-05", "2027-10-07", "2027-10-12"], v6: ["2027-05-13", "2027-05-14", "2027-05-17"] }
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const onReschedule = fn(async (_visitId: string, _day: string) => ({ ok: true as const }))
const onCancel = fn(async (_visitId: string, _reason: string) => ({ ok: true as const }))
const actions = { onReschedule, onCancel }
const calendar = { googleHref: "https://calendar.google.com/calendar/render?action=TEMPLATE", icsHref: "/api/visits/v1/calendar.ics?token=t" }

const tabOf = (story: string) => (story.startsWith("Visit") || story.startsWith("Receipt") ? "/account/visits" : story.startsWith("Details") ? "/account/details" : "/account")

const meta = {
  title: "Screens/Account",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, { args, name }) => (
      <div className="min-h-svh bg-cream">
        {/* the tab a screen belongs to stays lit: a visit and a receipt under Visits (second navigation pass, Nov 21 2026) */}
        <AccountNav firstName={(args as { hasPass?: boolean }).hasPass === false ? "Dana" : "Andrea"} current={tabOf(name)} />
        <Story />
      </div>
    ),
  ],
} satisfies Meta
export default meta
type Story = StoryObj

const home = { render: () => <HomeScreen customer={andreaCustomer} jobs={[passJob, repairJob]} today={TODAY} pass={pass} days={days} {...actions} /> }
export const HomePhone: Story = { ...phone, ...home }
export const HomeLaptop: Story = { ...laptop, ...home }
/** The day-before text went out: the window and who is coming. */
export const HomeWindowToldPhone: Story = { ...phone, render: () => <HomeScreen customer={andreaCustomer} jobs={[passJobWindowTold, repairJob]} today="2027-04-27" pass={pass} days={days} {...actions} /> }
/** Inside 24 hours: Text Ryan and Call Ryan replace Reschedule and Cancel visit. */
export const HomeInsideCutoffPhone: Story = { ...phone, render: () => <HomeScreen customer={andreaCustomer} jobs={[passJobInsideCutoff, repairJob]} today="2027-04-27" pass={pass} {...actions} /> }
export const HomeInsideCutoffLaptop: Story = { ...laptop, render: () => <HomeScreen customer={andreaCustomer} jobs={[passJobInsideCutoff, repairJob]} today="2027-04-27" pass={pass} {...actions} /> }
export const HomeInvoiceSentPhone: Story = { ...phone, render: () => <HomeScreen customer={andreaCustomer} jobs={[passJob, invoicedJob, repairJob]} today={TODAY} pass={pass} days={days} {...actions} /> }
export const HomeInvoiceSentLaptop: Story = { ...laptop, render: () => <HomeScreen customer={andreaCustomer} jobs={[passJob, invoicedJob, repairJob]} today={TODAY} pass={pass} days={days} {...actions} /> }
export const HomePastDueLaptop: Story = { ...laptop, render: () => <HomeScreen customer={andreaCustomer} jobs={[pastDueJob, repairJob]} today={TODAY} {...actions} /> }
/** The turn-on was canceled; the blowout is next. */
export const HomeVisitCanceledPhone: Story = { ...phone, render: () => <HomeScreen customer={andreaCustomer} jobs={[passJobCanceledVisit, repairJob]} today={TODAY} pass={pass} days={days} {...actions} /> }
/** The pass was canceled: its visits read Canceled and nothing is booked. */
export const HomePassCanceledPhone: Story = { ...phone, render: () => <HomeScreen customer={andreaCustomer} jobs={[passJobCanceled, repairJob]} today={TODAY} {...actions} /> }
/** One-off visits and no pass: no pass card. */
export const HomeOneOffNoPassLaptop: Story = { ...laptop, args: { hasPass: false }, render: () => <HomeScreen customer={danaCustomer} jobs={[oneOffJob, repairJob]} today={TODAY} days={days} {...actions} /> }
export const HomeNoPassNoVisitPhone: Story = { ...phone, args: { hasPass: false }, render: () => <HomeScreen customer={danaCustomer} jobs={[repairJob]} today={TODAY} {...actions} /> }
export const HomeNoPassNoVisitLaptop: Story = { ...laptop, args: { hasPass: false }, render: () => <HomeScreen customer={danaCustomer} jobs={[repairJob]} today={TODAY} {...actions} /> }
export const HomeNothingPhone: Story = { ...phone, args: { hasPass: false }, render: () => <HomeScreen customer={danaCustomer} jobs={[]} today={TODAY} /> }

const visits = { render: () => <VisitsScreen customer={andreaCustomer} jobs={[passJob, repairJob, invoicedJob, canceledRepairJob]} today={TODAY} /> }
export const VisitsPhone: Story = { ...phone, ...visits }
export const VisitsLaptop: Story = { ...laptop, ...visits }
/** Two properties: the street filter and the street under each row. */
export const VisitsTwoPropertiesPhone: Story = { ...phone, render: () => <VisitsScreen customer={andreaTwoProperties} jobs={[passJob, oneOffJob, repairJob]} today={TODAY} /> }
export const VisitsTwoPropertiesLaptop: Story = { ...laptop, render: () => <VisitsScreen customer={andreaTwoProperties} jobs={[passJob, oneOffJob, repairJob]} today={TODAY} street="12 Cottonwood Way" /> }
export const VisitsPassCanceledPhone: Story = { ...phone, render: () => <VisitsScreen customer={andreaCustomer} jobs={[passJobCanceled]} today={TODAY} /> }
export const VisitsEmptyPhone: Story = { ...phone, args: { hasPass: false }, render: () => <VisitsScreen customer={danaCustomer} jobs={[]} today={TODAY} /> }

const visit = (job: typeof passJob, id: string, over: { today?: string; days?: string[]; cal?: boolean } = {}) => ({
  render: () => <VisitScreen customer={andreaCustomer} job={job} visitId={id} today={over.today ?? TODAY} days={over.days ?? days.v1} calendar={over.cal === false ? undefined : calendar} {...actions} />,
})
export const VisitBookedPhone: Story = { ...phone, ...visit(passJob, "v1") }
export const VisitBookedLaptop: Story = { ...laptop, ...visit(passJob, "v1") }
export const VisitWindowToldPhone: Story = { ...phone, ...visit(passJobWindowTold, "v1", { today: "2027-04-27" }) }
export const VisitInsideCutoffPhone: Story = { ...phone, ...visit(passJobInsideCutoff, "v1", { today: "2027-04-27" }) }
export const VisitInsideCutoffLaptop: Story = { ...laptop, ...visit(passJobInsideCutoff, "v1", { today: "2027-04-27" }) }
export const VisitNoDayPhone: Story = { ...phone, ...visit(passJob, "v2", { days: days.v2, cal: false }) }
export const VisitOneOffPhone: Story = { ...phone, args: { hasPass: false }, ...visit(oneOffJob, "v6", { days: days.v6 }) }
export const VisitPaidPhone: Story = { ...phone, ...visit(repairJob, "v3", { cal: false }) }
export const VisitPaidLaptop: Story = { ...laptop, ...visit(repairJob, "v3", { cal: false }) }
export const VisitPartPaidPhone: Story = { ...phone, ...visit(partPaidJob, "v5", { cal: false }) }
export const VisitInvoiceOutPhone: Story = { ...phone, ...visit(invoicedJob, "v4", { cal: false }) }
export const VisitInvoiceOutLaptop: Story = { ...laptop, ...visit(invoicedJob, "v4", { cal: false }) }
export const VisitPastDueLaptop: Story = { ...laptop, ...visit(pastDueJob, "v7", { cal: false }) }
export const VisitCanceledPhone: Story = { ...phone, ...visit(canceledRepairJob, "v8", { cal: false }) }

export const DetailsPhone: Story = { ...phone, render: () => <DetailsScreen customer={andreaCustomer} /> }
export const DetailsLaptop: Story = { ...laptop, render: () => <DetailsScreen customer={andreaCustomer} /> }
export const DetailsNoCardPhone: Story = { ...phone, args: { hasPass: false }, render: () => <DetailsScreen customer={danaCustomer} /> }

const receipt = { id: "pay_2", business: { name: "Trailhead Lawn & Irrigation LLC", phone: "(970) 692-7270" }, customerName: "Andrea Lopez", address: "412 Briggs Street", jobName: "Repair", lines: [{ name: "Repair", quantity: 1, unitPrice: 145 }], amount: 80, method: "check" as const, reference: "1043", paidOn: "2027-02-12", receiptUrl: null }
export const ReceiptPhone: Story = { ...phone, render: () => <ReceiptScreen receipt={receipt} /> }
export const ReceiptLaptop: Story = { ...laptop, render: () => <ReceiptScreen receipt={receipt} /> }
/** A card payment: our page, with a link to the card receipt on it. */
export const ReceiptCardLaptop: Story = { ...laptop, render: () => <ReceiptScreen receipt={{ ...receipt, method: "card_on_file", reference: null, receiptUrl: "https://pay.stripe.com/receipts/example" }} /> }

// "What we did" on the receipt (Hannah, Nov 21 2026): the visit's checklist, an open item marked "Not done", and the photos Ryan shared. A receipt whose invoice left the report out is the one above.
const card = { ...receipt, amount: 145, method: "card_now" as const, reference: null, paidOn: "2027-04-29", receiptUrl: "https://pay.stripe.com/receipts/example" }
/** The repair: four of five items done and two photos, under the amount. */
export const ReceiptWithReportPhone: Story = { ...phone, render: () => <ReceiptScreen receipt={{ ...card, report: reportFor("repair", 4, 2, "") }} /> }
export const ReceiptWithReportLaptop: Story = { ...laptop, render: () => <ReceiptScreen receipt={{ ...card, report: reportFor("repair", 4, 2, "") }} /> }
/** A spring turn-on, every item done, no photos shared: the checklist alone, no empty photo grid. */
export const ReceiptTurnOnNoPhotosPhone: Story = { ...phone, render: () => <ReceiptScreen receipt={{ ...card, jobName: "Spring turn-on", lines: [{ name: "Spring turn-on", quantity: 1, unitPrice: 145 }], report: reportFor("spring turn-on", undefined, 0, "") }} /> }
