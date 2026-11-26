import type { ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, screen } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { AccountNav } from "@/components/blocks/AccountNav"
import type { Pass } from "@/lib/admin/types"
import { andrea as andreaCustomer, andreaTwoProperties, canceledRepairJob, dana as danaCustomer, invoicedJob, oneOffJob, partPaidJob, passJob, passJobCanceled, passJobCanceledVisit, passJobInsideCutoff, passJobAsking, passJobWindowTold, pastDueJob, repairJob, TODAY } from "./account-fixtures"
import { DetailsScreen } from "./DetailsScreen"
import { HomeScreen } from "./HomeScreen"
import { reportFor } from "@/emails/fixtures"
import { ReceiptScreen } from "./ReceiptScreen"
import { VisitScreen } from "./VisitScreen"
import { VisitsScreen } from "./VisitsScreen"

// Stories open still; the ones that play a path have a hidden twin (`!dev`, `!autodocs`) that holds the play, still run by `test:stories`. Home shows the next visit and the pass card only (the visits are the Visits tab's, the plan the Season Pass tab's;
// docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)"). Every account screen at 375 and 1280, on fixtures. Home: before the cut-off, the window told, inside 24 hours, an invoice sent, past due, a Season Pass visit canceled, a canceled
// pass, no visit and no pass, nothing at all. Visits: the timeline, two properties, a canceled visit, empty. A visit: booked, window told, inside 24 hours, a one-off, paid, part paid,
// invoice out, past due, canceled. Details and the receipt. The two sheets and Text Ryan have their own block stories. The pass is passes[0] of the pass stories' snapshot, with a 2027 season.
const pass = snapshot.passes[0] as Pass
const days = { v1: ["2027-04-29", "2027-04-30", "2027-05-05", "2027-05-07", "2027-05-12"], v2: ["2027-10-05", "2027-10-07", "2027-10-12"], v6: ["2027-05-13", "2027-05-14", "2027-05-17"] }
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const onReschedule = fn(async (_visitId: string, _day: string) => ({ ok: true as const }))
const onCancel = fn(async (_visitId: string, _reason: string) => ({ ok: true as const }))
const actions = { onReschedule, onCancel }
const HIDDEN = ["!dev", "!autodocs"]
const onSavePreference = fn(async () => {})
const onSavePreferences = fn(async () => ({ ok: true as const }))
const calendar = { googleHref: "https://calendar.google.com/calendar/render?action=TEMPLATE", icsHref: "/api/visits/v1/calendar.ics?token=t" }

const tabOf = (story: string) => (story.startsWith("Visit") || story.startsWith("Receipt") ? "/account/visits" : story.startsWith("Details") ? "/account/details" : "/account")

const meta = {
  title: "Screens/Account",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, { args, name }) => (
      <div className="min-h-svh bg-stone">
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
/** We are asking for the blowout's timing (the Preference request went out): the quiet banner above the next visit, on Home and on the Season Pass tab. */
export const HomeAskingPhone: Story = { ...phone, render: () => <HomeScreen customer={andreaCustomer} jobs={[passJobAsking, repairJob]} today="2027-09-10" pass={pass} ask="blowout" onSavePreference={onSavePreference} {...actions} /> }
export const HomeAskingLaptop: Story = { ...laptop, render: () => <HomeScreen customer={andreaCustomer} jobs={[passJobAsking, repairJob]} today="2027-09-10" pass={pass} ask="blowout" onSavePreference={onSavePreference} {...actions} /> }
export const HomeAskingPlay: Story = {
  tags: HIDDEN,
  ...phone,
  render: () => <HomeScreen customer={andreaCustomer} jobs={[passJobAsking, repairJob]} today="2027-09-10" pass={pass} ask="blowout" onSavePreference={onSavePreference} {...actions} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Choose when/ }))
    await userEvent.click(await screen.findByRole("radio", { name: /Late season/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Save" }))
    await expect(onSavePreference).toHaveBeenCalledWith("blowout", "later")
  },
}
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
export const HomeNothingLaptop: Story = { ...laptop, args: { hasPass: false }, render: () => <HomeScreen customer={danaCustomer} jobs={[]} today={TODAY} /> }

const visits = { render: () => <VisitsScreen customer={andreaCustomer} jobs={[passJob, repairJob, invoicedJob, canceledRepairJob]} today={TODAY} /> }
export const VisitsPhone: Story = { ...phone, ...visits }
export const VisitsLaptop: Story = { ...laptop, ...visits }
/** Two properties: the street filter and the street under each row. */
export const VisitsTwoPropertiesPhone: Story = { ...phone, render: () => <VisitsScreen customer={andreaTwoProperties} jobs={[passJob, oneOffJob, repairJob]} today={TODAY} /> }
export const VisitsTwoPropertiesLaptop: Story = { ...laptop, render: () => <VisitsScreen customer={andreaTwoProperties} jobs={[passJob, oneOffJob, repairJob]} today={TODAY} street="12 Cottonwood Way" /> }
export const VisitsPassCanceledPhone: Story = { ...phone, render: () => <VisitsScreen customer={andreaCustomer} jobs={[passJobCanceled]} today={TODAY} /> }
export const VisitsEmptyPhone: Story = { ...phone, args: { hasPass: false }, render: () => <VisitsScreen customer={danaCustomer} jobs={[]} today={TODAY} /> }
export const VisitsEmptyLaptop: Story = { ...laptop, args: { hasPass: false }, render: () => <VisitsScreen customer={danaCustomer} jobs={[]} today={TODAY} /> }
/** Only past visits (the usual off-season account): Coming up is one quiet row with the trail and Book Online, Past under it. */
export const VisitsNothingAheadPhone: Story = { ...phone, args: { hasPass: false }, render: () => <VisitsScreen customer={andreaCustomer} jobs={[repairJob]} today={TODAY} /> }
export const VisitsNothingAheadLaptop: Story = { ...laptop, args: { hasPass: false }, render: () => <VisitsScreen customer={andreaCustomer} jobs={[repairJob]} today={TODAY} /> }
/** A visit with no photo on it yet: the Photos section is one quiet row and Add photo. */
const noPhotos = { items: [], configured: true, onAdd: fn(async () => ({ ok: true as const })) } as unknown as NonNullable<ComponentProps<typeof VisitScreen>["photos"]>
export const VisitNoPhotosPhone: Story = { ...phone, render: () => <VisitScreen customer={andreaCustomer} job={passJob} visitId="v1" today={TODAY} days={days.v1} photos={noPhotos} {...actions} /> }
export const VisitNoPhotosLaptop: Story = { ...laptop, render: () => <VisitScreen customer={andreaCustomer} job={passJob} visitId="v1" today={TODAY} days={days.v1} photos={noPhotos} {...actions} /> }

const visit = (job: typeof passJob, id: string, over: { today?: string; days?: string[]; cal?: boolean } = {}) => ({
  render: () => <VisitScreen customer={andreaCustomer} job={job} visitId={id} today={over.today ?? TODAY} days={over.days ?? days.v1} calendar={over.cal === false ? undefined : calendar} {...actions} />,
})
export const VisitBookedPhone: Story = { ...phone, ...visit(passJob, "v1") }
export const VisitBookedLaptop: Story = { ...laptop, ...visit(passJob, "v1") }
export const VisitWindowToldPhone: Story = { ...phone, ...visit(passJobWindowTold, "v1", { today: "2027-04-27" }) }
export const VisitInsideCutoffPhone: Story = { ...phone, ...visit(passJobInsideCutoff, "v1", { today: "2027-04-27" }) }
export const VisitInsideCutoffLaptop: Story = { ...laptop, ...visit(passJobInsideCutoff, "v1", { today: "2027-04-27" }) }
export const VisitNoDayPhone: Story = { ...phone, ...visit(passJob, "v2", { days: days.v2, cal: false }) }
/** The Preference request's link opens this page: the blowout has no day yet, and the same quiet banner holds the choice. */
export const VisitAskingPhone: Story = { ...phone, render: () => <VisitScreen customer={andreaCustomer} job={passJobAsking} visitId="v2" today="2027-09-10" ask={{ kind: "blowout", value: "recommended", onSave: onSavePreference }} {...actions} /> }
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
/** Preferences, for a Season Pass holder: the timing for each visit we schedule, kept for every season. Our recommended until the customer says otherwise. */
export const DetailsPreferencesPhone: Story = { ...phone, render: () => <DetailsScreen customer={andreaCustomer} preferences={{ "turn-on": "earlier", blowout: "recommended" }} onSavePreferences={onSavePreferences} /> }
export const DetailsPreferencesPlay: Story = {
  tags: HIDDEN,
  ...laptop,
  render: () => <DetailsScreen customer={andreaCustomer} onSavePreferences={onSavePreferences} />,
  play: async ({ canvas, userEvent }) => {
    const [turnOn] = await canvas.findAllByRole("radio", { name: /Early season/ })
    await userEvent.click(turnOn!)
    await userEvent.click(await canvas.findByRole("button", { name: "Save preferences" }))
    await expect(onSavePreferences).toHaveBeenCalledWith({ "turn-on": "earlier", blowout: "recommended" })
    await expect(await canvas.findByText("Saved.")).toBeInTheDocument()
  },
}
export const DetailsNoCardPhone: Story = { ...phone, args: { hasPass: false }, render: () => <DetailsScreen customer={danaCustomer} /> }

const receipt = { id: "pay_2", business: { name: "Trailhead Lawn & Irrigation LLC", phone: "(970) 692-7270" }, customerName: "Andrea Lopez", address: "412 Briggs Street", jobName: "Repair", lines: [{ name: "Repair", quantity: 1, unitPrice: 145 }], amount: 80, method: "check" as const, reference: "1043", paidOn: "2027-02-12", receiptUrl: null }
export const ReceiptPhone: Story = { ...phone, render: () => <ReceiptScreen receipt={receipt} /> }
export const ReceiptLaptop: Story = { ...laptop, render: () => <ReceiptScreen receipt={receipt} /> }
/** A card payment: our page, with a link to the card receipt on it. */
export const ReceiptCardLaptop: Story = { ...laptop, render: () => <ReceiptScreen receipt={{ ...receipt, method: "card_on_file", reference: null, receiptUrl: "https://pay.stripe.com/receipts/example" }} /> }

// "What we did" on the receipt (Hannah, Nov 21 2026): the visit's checked items and the photos Ryan shared; an item that was not checked is not drawn. A receipt whose invoice left the report out is the one above.
const card = { ...receipt, amount: 145, method: "card_now" as const, reference: null, paidOn: "2027-04-29", receiptUrl: "https://pay.stripe.com/receipts/example" }
/** The repair: four of five items checked, so four are listed, and two photos, under the amount. */
export const ReceiptWithReportPhone: Story = { ...phone, render: () => <ReceiptScreen receipt={{ ...card, report: reportFor("repair", 4, 2, "") }} /> }
export const ReceiptWithReportLaptop: Story = { ...laptop, render: () => <ReceiptScreen receipt={{ ...card, report: reportFor("repair", 4, 2, "") }} /> }
/** A spring turn-on, every item done, no photos shared: the checklist alone, no empty photo grid. */
export const ReceiptTurnOnNoPhotosPhone: Story = { ...phone, render: () => <ReceiptScreen receipt={{ ...card, jobName: "Spring turn-on", lines: [{ name: "Spring turn-on", quantity: 1, unitPrice: 145 }], report: reportFor("spring turn-on", undefined, 0, "") }} /> }
