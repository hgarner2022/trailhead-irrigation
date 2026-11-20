// The one list the review guide draws (ReviewGuide.tsx): every link, in the order Hannah walks them, each with ONE sentence on what to look at.
// A story id is its group and export name (`/?path=/story/<id>`). review-steps.test.ts fails when an id here no longer exists in a stories file,
// so renaming or deleting a story forces this list to follow.

export interface ReviewStep {
  /** The story id, e.g. "admin-walkthrough-clickable--laptop" */
  id: string
  /** The link text */
  label: string
  /** One sentence: what to look at */
  look: string
}

export interface ReviewPart {
  title: string
  intro: string
  steps: ReviewStep[]
}

export const REVIEW_PARTS: ReviewPart[] = [
  {
    title: "Part 1: the admin",
    intro: "Start with the walkthrough, then check these in order.",
    steps: [
      { id: "admin-walkthrough-clickable--laptop", label: "Walk the admin", look: "Click from Jobs through a job, its flow, the customer, Invoices and back; Start over resets it." },
      { id: "admin-walkthrough-clickable--new-job-from-customer", label: "New job from a customer", look: "Her property and last job sit under her name, the zones are filled in, and the job opens as Unscheduled." },
      { id: "admin-job-page-one-trip--scheduled-ahead", label: "The job's states", look: "Step through Unscheduled, Scheduled, Today, On the way, Active, Late and Canceled; each has one primary action." },
      { id: "admin-confirmations--schedule-tech", label: "The Schedule dialog with crew options", look: "Pick Tech Two and the crew-text box, the exact text and the sentence that names both notices appear." },
      { id: "admin-job-page-one-trip--today", label: "On my way and Mark done", look: "On my way is the primary today and Mark done follows; both confirm in words before anything is sent." },
      { id: "admin-job-page-one-trip--done-unpaid", label: "How is this paid?", look: "One dialog with the card first, every way of paying says how the receipt goes out, and a receipt always goes." },
      { id: "admin-walkthrough-clickable--receipt", label: "The receipt", look: "Record a check and open the receipt Andrea gets, with the method and the check number." },
      { id: "admin-invoices--invoice-sent", label: "An invoice", look: "The reminder schedule, the reminders already sent and Collect payment beside Send a payment reminder." },
      { id: "admin-confirmations--reminder-email", label: "The reminder by text or email", look: "Text, Email or Both under the heading, with the preview of exactly what goes out." },
      { id: "admin-job-page-one-trip--refunded", label: "Refunded", look: "A grey Refunded pill and the refund as its own negative row; the job never reads Unpaid." },
      { id: "admin-job-page-season-pass-and-return-trip--one-done", label: "The Season Pass trips", look: "One row per trip, each with its own money word, and the next trip opens by itself." },
      { id: "admin-customer-page--pass-holder-unpaid", label: "The customer page", look: "The status pill, the Consent card with its history, Do not service and Archive (see Archive refused and Consent history next to it)." },
      { id: "admin-walkthrough-clickable--laptop", label: "The Customers list and its Status filter", look: "Open Customers in the rail of the walkthrough: a Status column, a Status filter and Show archived." },
      { id: "admin-invoices--list", label: "Invoices", look: "Four tiles that filter the list, past due first, with Remind on the row." },
      { id: "admin-navigation--account-menu-open", label: "The account menu", look: "Bottom left of the rail: your name, Profile, Help and Sign out." },
    ],
  },
  {
    title: "Part 2: the customer",
    intro: "Start with the walkthrough, then check these in order.",
    steps: [
      { id: "customer-walkthrough-clickable--walkthrough", label: "Walk the customer side", look: "Nine steps on a phone, from booking to a quote; click Next or tap anything in the phone." },
      { id: "customer-booking-form--day-phone", label: "The booking form", look: "The day and exact time come first and contact comes after, so an abandoned booking leaves nothing." },
      { id: "customer-booking-form--contact-filled-phone", label: "The marketing box on contact", look: "Tips and offers by email and by text are unticked until the customer ticks them." },
      { id: "customer-walkthrough-clickable--walkthrough", label: "The texts and emails", look: "Step 2 of the walkthrough shows every text and email in the order a customer meets them." },
      { id: "customer-walkthrough-clickable--walkthrough", label: "The account, reschedule and cancel", look: "Steps 3 and 4: Home, a visit, Reschedule with a few days to pick from, Cancel and the canceled page." },
      { id: "customer-walkthrough-clickable--walkthrough", label: "Paying", look: "Steps 5 and 6: Pay now, the pay page, the card button and the receipt in each way of paying." },
      { id: "customer-walkthrough-clickable--walkthrough", label: "The pass, Details and the marketing switches", look: "Steps 7 and 8: the Season Pass page and Details, where the marketing switches turn email and text offers on and off." },
    ],
  },
  {
    title: "Part 3: the messages",
    intro: "Every text and email a customer gets, Current beside Proposed. Start with the Overview.",
    steps: [
      { id: "messages-overview--table", label: "Every message in one table", look: "Every message in the order of the customer's journey, with when each is sent, text or email, transactional or marketing, and a link to each." },
      { id: "messages-booking-and-visits--day-set", label: "Booking and visits", look: "The day set, moved, two weeks out, day before, on my way and the two cancels: the text in a phone bubble, then the live email beside the proposed one." },
      { id: "messages-billing--invoice", label: "Billing", look: "The invoice puts the amount and the due day in one block above the Pay button; the receipt comes for card, check, Venmo and cash, and the refund is a prototype." },
      { id: "messages-season-pass--purchase-confirmation", label: "Season Pass", look: "The purchase confirmation, the renewal offer with its Unsubscribe link and the cancel message." },
      { id: "messages-marketing--tips-email", label: "Marketing", look: "The layout of the tips email with its Unsubscribe footer; the words are placeholders for Ryan to write." },
      { id: "messages-account--sign-in", label: "Account", look: "The sign-in link with the address to copy if the button fails." },
      { id: "messages-to-the-crew--not-marked-done", label: "To the crew, not the customer", look: "The notes the office and crew get, kept apart from what a customer receives." },
      { id: "messages-design-rules--rules", label: "The design rules", look: "The anatomy of every email, ten rules with the page each comes from, and the colour and type tables." },
    ],
  },
  {
    title: "Part 4: requests and quotes",
    intro: "Someone who is not a customer asks for work that cannot be booked online. Start with the walkthroughs, then check these in order.",
    steps: [
      { id: "admin-walkthrough-clickable--from-requests", label: "Walk Requests to a quote", look: "Open Rosa Delgado, Accept, price the line and Send a quote with a deposit; the job reads Quote sent in Jobs." },
      { id: "admin-requests--list", label: "The Requests list", look: "Requests sits after Schedule in the rail with a count; New comes first, with the customer match, what they asked for and the town." },
      { id: "admin-requests--new-matches", label: "A request that matches a customer", look: "The match panel names Andrea Dalton; the request still waits for you to press Accept." },
      { id: "admin-requests--accept-match", label: "Accept", look: "The dialog states the exact effect and says nothing is sent to the person." },
      { id: "admin-requests--home-rows", label: "Home rows", look: "New requests, each quote waiting with its age and Remind, and a decided quote." },
      { id: "admin-quotes--needs-a-quote", label: "A job that needs a quote", look: "One unpriced line holds the customer's words; Send a quote is off until a line has a price." },
      { id: "admin-quotes--send-percent", label: "Send a quote with a deposit", look: "None by default, dollars or percent, the dollars it comes to, never above the total, and Send without telling under the caret." },
      { id: "admin-quotes--quote-sent", label: "Quote sent", look: "The lines are locked; send a reminder, Mark approved or Revise." },
      { id: "admin-quotes--approve-by-hand", label: "Mark approved by hand", look: "Ryan says how the deposit was paid; a receipt always goes out and he chooses whether to tell the customer." },
      { id: "admin-quotes--approved-by-customer", label: "Approved with the deposit paid", look: "Billing shows the deposit, and the invoice will show it as already paid." },
      { id: "admin-quotes--jobs-status-filter", label: "Jobs Status filter", look: "Needs a quote and Quote sent are in the Status filter; there is no Quotes item in the rail." },
      { id: "customer-walkthrough-clickable--walkthrough", label: "The customer's quote", look: "The last step: open the link in the text, Approve with and without a deposit, or Decline." },
      { id: "customer-quote--open-deposit", label: "The quote page", look: "The deposit line shows only when one is set; Approve and Decline sit beside Text Ryan and Call Ryan." },
      { id: "customer-quote--card-page", label: "Stripe's card page", look: "A drawn placeholder with Stripe's own unticked save box; no card field is real." },
      { id: "customer-quote--approved-no-deposit", label: "Approved with no deposit", look: "One tap approves it; Add a card is optional and the sentence about a saved card is a marked placeholder." },
      { id: "customer-booking-form--quote-path-done-phone", label: "The request's thank-you", look: "Thanks. We've got your request. It states no call-back time." },
      { id: "messages-requests-and-quotes--quote", label: "The five customer messages", look: "Request received, Your quote, Quote reminder, Quote approved and Quote declined, all prototypes in the proposed layout." },
    ],
  },
]

export const CHANGED_SINCE_LAST_REVIEW: string[] = [
  "Status colours: one colour for each status word on every pill, in one place.",
  "Collect payment and receipts: How is this paid? is one dialog, and the customer always gets a receipt.",
  "Customer status: Active, Past customer, Do not service and Archived are read from the customer's jobs.",
  "Consent: a Consent card with a history, and marketing off until the customer says yes.",
  "Booking: the day and time come first and contact after, with the marketing box on contact.",
  "The account menu moved to the bottom left of the rail, with your name, Profile, Help and Sign out.",
]
