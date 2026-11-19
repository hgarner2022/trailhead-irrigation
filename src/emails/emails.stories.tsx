import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { EMAIL_FIXTURES, EMAIL_LABELS, SIGN_IN_FIXTURE } from "./fixtures"
import { renderEmail, type EmailKind } from "./render"
import { signInEmail } from "./sign-in"
import { invoiceEmail } from "./invoice"
import type { InvoiceData } from "./types"
import { REPORT_FIXTURE } from "./fixtures"

// The real HTML of every email, built by the same renderer the sender uses and shown in a frame the way an inbox shows it,
// at a desktop width and at a phone width. Nothing is sent: the data is made up (`fixtures.ts`).

function EmailFrame({ subject, html, width }: { subject: string; html: string; width: number }) {
  return (
    <figure className="mx-auto" style={{ maxWidth: width + 2 }}>
      <figcaption className="mb-2 text-sm text-muted-foreground">Subject: {subject}</figcaption>
      <iframe title={subject} srcDoc={html} style={{ width }} className="h-[1100px] rounded-lg border border-border bg-white" />
    </figure>
  )
}

const meta = {
  title: "Emails/All emails",
  component: EmailFrame,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EmailFrame>
export default meta
type Story = StoryObj<typeof meta>

const rendered = (kind: EmailKind) => renderEmail(kind, EMAIL_FIXTURES[kind])!
const story = (kind: EmailKind, width = 640): Story => ({ name: EMAIL_LABELS[kind], args: { subject: rendered(kind).subject, html: rendered(kind).html, width } })

export const PurchaseConfirmation = story("purchase-confirmation")
export const BookingConfirmation = story("booking-confirmation")
export const DaySet = story("date-set")
export const DayMoved = story("date-moved")
export const DayBefore = story("day-before")
export const TwoWeeksOut = story("date-confirm")
/** A paid visit: where, who and when, the receipt number, each line, the totals, what was paid and one link to the account. */
export const Receipt = story("receipt")
/** An invoice: the same table, the amount due, the due day and one Pay button. */
export const Invoice = story("invoice")
/** The invoice with the visit report: What we did under the lines, the checklist, the crew's notes and the photos in a grid. */
const withReport = invoiceEmail({ ...(EMAIL_FIXTURES.invoice as unknown as InvoiceData), report: REPORT_FIXTURE })
export const InvoiceWithVisitReport: Story = { name: "Invoice with the visit report", args: { subject: withReport.subject, html: withReport.html, width: 640 } }
export const InvoiceWithVisitReportOnAPhone: Story = { name: "Invoice with the visit report on a phone", args: { subject: withReport.subject, html: withReport.html, width: 375 } }
export const InvoiceReminder = story("invoice-reminder")
export const CardFailed = story("card-failed")
export const CardExpiring = story("card-expiring")
export const SeasonPassCanceled = story("cancelled")
export const VisitCanceled = story("visit-cancelled")
export const Renewal = story("renewal")
export const NotMarkedDone = story("not-closed-crew")
export const AdminAlert = story("admin-alert")

const signIn = signInEmail(SIGN_IN_FIXTURE)
export const SignIn: Story = { name: EMAIL_LABELS["sign-in"], args: { subject: signIn.subject, html: signIn.html, width: 640 } }

// The same HTML at 375 pixels, one story per email: the facts stack, the button runs the width and the heading wraps.
const phone = (kind: EmailKind): Story => ({ name: `${EMAIL_LABELS[kind]} on a phone`, args: { subject: rendered(kind).subject, html: rendered(kind).html, width: 375 } })
export const PurchaseConfirmationOnAPhone = phone("purchase-confirmation")
export const BookingConfirmationOnAPhone = phone("booking-confirmation")
export const DaySetOnAPhone = phone("date-set")
export const DayMovedOnAPhone = phone("date-moved")
export const DayBeforeOnAPhone = phone("day-before")
export const TwoWeeksOutOnAPhone = phone("date-confirm")
export const ReceiptOnAPhone = phone("receipt")
export const InvoiceOnAPhone = phone("invoice")
export const InvoiceReminderOnAPhone = phone("invoice-reminder")
export const CardFailedOnAPhone = phone("card-failed")
export const CardExpiringOnAPhone = phone("card-expiring")
export const SeasonPassCanceledOnAPhone = phone("cancelled")
export const VisitCanceledOnAPhone = phone("visit-cancelled")
export const RenewalOnAPhone = phone("renewal")
export const NotMarkedDoneOnAPhone = phone("not-closed-crew")
export const AdminAlertOnAPhone = phone("admin-alert")
export const SignInOnAPhone: Story = { name: `${EMAIL_LABELS["sign-in"]} on a phone`, args: { subject: signIn.subject, html: signIn.html, width: 375 } }
