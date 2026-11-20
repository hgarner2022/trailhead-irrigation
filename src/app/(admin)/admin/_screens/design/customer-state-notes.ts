import type { CustomerState } from "./customer-types"

export const STATE_NOTES: Record<CustomerState, string> = {
  "pass-holder": "Ryan sees a Season Pass holder with a repair on Thursday and an unpaid invoice. The one primary action is New job; Collect payment sits beside Send a message, Unpaid $145 is a badge beside the name and every tile in the band opens what it summarises.",
  "two-seasons": "Ryan sees the 2027 pass renewed from 2026: the Season Pass card links back to the 2026 pass, the folded earlier season links forward to the 2027 one, and the Jobs table lists both.",
  "one-off": "Ryan sees a customer who has had one repair and paid in full: Billing says Paid in full, the card and the one payment with its receipt and Stripe link. The aside offers Get a Season Pass.",
  "opted-out": "Ryan sees a customer who opted in to marketing email on the website and opted out by phone: both switches are off, the Consent card says who and when, and the pill reads Not in marketing.",
  refunded: "Ryan sees a repair paid by card and refunded: the Billing line reads Refunded in grey, the invoice and its card payment are one row with the negative grey refund row under it, the Jobs table says Refunded, the Unpaid tile reads Nothing unpaid, and there is no Collect payment.",
  "part-refunded": "Ryan sees a partial refund: the job reads \"Paid, $50 refunded\" in green, Total, Paid and Refunded show because they add to it, and Payments has a negative grey $50 row under the card payment.",
  deposit: "Ryan sees a job paid with a deposit: the $50 check is a payment with no invoice (Payments), the final invoice credits it and is one row with the card payment that settled it (Invoices and payments). Total, Paid and Unpaid show because two payments need explaining.",
  "active-recent": "Ryan sees a customer whose last job was 20 months ago: still Active, because any job in the last 24 months is. A past due invoice is a fact in the band and Billing, never a pill in the header; Archive here asks about the balance.",
  "past-customer": "Ryan sees a customer whose last job was 30 months ago, with nothing ahead: Past customer. Do not service is marked, with a red tag beside the status; it blocks nothing.",
  archived: "Ryan sees an archived customer: the grey Archived status, a quiet banner \"Archived Nov 20. New work brings them back\" with Unarchive, and the page otherwise as before.",
  "nothing-yet": "Ryan sees a customer with no work yet. Every empty card invites the first job, a tile with nothing behind it is not a link, and Delete is offered under More because nothing has happened.",
}
