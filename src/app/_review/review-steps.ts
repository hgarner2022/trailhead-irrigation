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
      { id: "admin-walkthrough-clickable--every-customer-opens", label: "Every customer opens", look: "Every name on Customers, every chip and every search hit opens a real customer page; Beth Orr, with only a quote out, reads New and shows empty Billing and Messages." },
      { id: "admin-invoices--list", label: "Invoices", look: "Four tiles that filter the list, past due first, with Remind on the row." },
      { id: "admin-navigation--account-menu-open", label: "The account menu", look: "Bottom left of the rail: your name, Profile, Help and Sign out." },
    ],
  },
  {
    title: "Part 2: the customer",
    intro: "Start with the walkthrough, then check these in order.",
    steps: [
      { id: "customer-walkthrough-clickable--walkthrough", label: "Walk the customer side", look: "Nine steps on a phone, from booking to a quote; click Next or tap anything in the phone." },
      { id: "customer-booking-form--address-phone", label: "The booking form's first step", look: "One address box with type-ahead and nothing else: no Type it instead link. The form is six steps, and every heading is a plain name (Address, Service, Day, Contact, Card, Review)." },
      { id: "customer-booking-form--address-typed-phone", label: "When the search finds nothing", look: "We can't find it. Enter it here. Street, City and a required ZIP appear only now. The ZIP decides whether we serve the yard, and a city that is not the town of its ZIP is a quiet line under the city. Ryan still has to confirm the list of ZIP codes." },
      { id: "customer-booking-form--address-outside-area-phone", label: "An address we don't serve", look: "It says so under the address with the six cities and Ryan's number, and Continue stays off. The cities are listed only here." },
      { id: "customer-booking-form--service-repair-open-phone", label: "A service card opens in place", look: "The whole header is the button, with a chevron. Open, it holds what is included, the price once, access, a note and photos, so there is no details step and no What's included link. No opens date and no Free consultation." },
      { id: "customer-booking-form--service-turn-on-open-phone", label: "Zones, and Make it a Season Pass", look: "Zones are 6 or fewer, 7 to 12 and More than 12 (a number box). The price follows the catalogue's per-zone rule. A single turn-on or blowout offers a switch, Make it a Season Pass, off until the customer turns it on." },
      { id: "customer-booking-form--service-turned-off-phone", label: "Settings turns a service off", look: "Flip Sprinkler repair to Off in the strip at the top and its card disappears; We quote moves it to Need a quote." },
      { id: "customer-booking-form--day-phone", label: "The day is a calendar", look: "The soonest open day is already selected and marked, recommended days are marked, days with nothing open are greyed, and the chosen day's times are under the calendar. The month arrows replace Show more days. There is no sentence about which weekdays Ryan is where." },
      { id: "customer-booking-form--contact-welcome-back-phone", label: "A returning customer", look: "Her email or phone matches: the form offers a link by text or email and shows nothing about her until it is opened. Then Welcome back, her details filled in and changeable, and Not you?." },
      { id: "customer-booking-form--card-phone", label: "The card step", look: "Stripe's card form, drawn, and one line that the card is charged after the visit. A one-off has Not now. Every booking has this step, a repair too." },
      { id: "customer-booking-form--confirm-phone", label: "Review, the only place with Change links", look: "Each answer has one Change link; there is no summary with Change links over the other steps. A Change returns to Review when you continue. The card reads Visa ending 4242 or No card." },
      { id: "customer-booking-form--contact-filled-phone", label: "The marketing box on contact", look: "Tips and offers by email are unticked until the customer ticks them. There is no Reply STOP line on this step." },
      { id: "customer-booking-form-season-pass--april-services-phone", label: "The Season Pass in the booking form", look: "The pass card opens in place: each visit with what it costs at the zone count, and one line that we schedule every season. No opening day, no total." },
      { id: "customer-booking-form-season-pass--april-preference-phone", label: "A pass visit with no day yet", look: "The step is named for the visit (Fall blowout). The choices are Our recommended, Early season and Late season, by name only, and one line says it is scheduled about two weeks before." },
      { id: "customer-booking-form-season-pass--july-preference-phone", label: "Next season's visit is asked too", look: "A July buyer gives a preference for the blowout and for next spring's turn-on (Spring turn-on 2028), because the pass renews and keeps the preference." },
      { id: "customer-booking-form-season-pass--april-card-phone", label: "The card for the pass", look: "Charged after each visit. It is required for a pass, so there is no Not now." },
      { id: "customer-booking-form-season-pass--april-confirm-phone", label: "Review a Season Pass", look: "Each visit shows its day or preference and what it costs, and the button reads Set up my Season Pass." },
      { id: "customer-booking-form-season-pass--april-booked-phone", label: "The Season Pass set-up card", look: "Your Season Pass is set up. The card lists every visit, the turn-on with its exact day and time and the blowout as a preference, and the screen shows the card on file." },
      { id: "screens-account--home-asking-phone", label: "Home: what is next", look: "The invoice if one is waiting, a quiet banner while we ask for a timing, the next visit and the Season Pass card; no list of visits, no season line, nothing sold." },
      { id: "screens-passpage--asking-laptop", label: "The Season Pass tab: the plan", look: "The card at full size, then Your season: one line per visit with its state or its timing and Change, how it is paid, and the plan's own buttons; no money word and no receipt, those are on Visits." },
      { id: "screens-account-season-pass-purchase--pass-page-april-phone", label: "After an April purchase", look: "The turn-on has its exact day and time and the blowout reads Preference: Early season, early October with a Change link, the sentence about scheduling said once under the list." },
      { id: "screens-passpage--no-pass-phone", label: "A customer with no Season Pass", look: "The tab opens one quiet page, Become a Season Pass holder, with one button; Home and Visits sell nothing." },
      { id: "screens-account--details-preferences-phone", label: "Details, Preferences", look: "For each visit, Early season, Our recommended (selected) or Late season with its month, and one Save; kept for every season." },
      { id: "screens-account--visit-asking-phone", label: "The page a Preference request opens", look: "The same quiet banner sits above a visit that has no day yet; Choose when opens the three choices." },
      { id: "customer-walkthrough-clickable--walkthrough", label: "The texts and emails", look: "Step 2 of the walkthrough shows every text and email in the order a customer meets them; only the first text ends with Reply STOP to opt out." },
      { id: "customer-walkthrough-clickable--walkthrough", label: "The account, reschedule and cancel", look: "Steps 3 and 4: Home, a visit, Reschedule with a few days to pick from, Cancel and the canceled page." },
      { id: "screens-account--visit-paid-phone", label: "The account's navigation", look: "A visit keeps the Visits tab lit and has no second Visits link above its title; Home, Visits and Details repeat no tab as a link or a heading." },
      { id: "customer-walkthrough-clickable--walkthrough", label: "Paying", look: "Step 5: Pay now, the pay page with what we did, Stripe's card page drawn, the processing moment and Paid; switch to Visa ending 4242 to pay in one tap. Step 6 is the receipt." },
      { id: "screens-pay-how-an-invoice-is-paid--stripe-card-phone", label: "Stripe's card page", look: "Card number, expiry and CVC drawn in Stripe's look, the unticked box Save my payment method for future use, and the Pay button; nothing is entered or charged." },
      { id: "screens-pay-how-an-invoice-is-paid--saved-card-phone", label: "Paying with the card on file", look: "Pay with Visa ending 4242 is one tap, and Use a different card opens the card page." },
      { id: "screens-account--receipt-with-report-phone", label: "The receipt carries what we did", look: "Under the amount, only the items that were checked, each with a check mark, and the photos Ryan shared; an unchecked item is not there, not even as Not done." },
      { id: "customer-walkthrough-clickable--sign-in-screen", label: "Sign in", look: "The live sign-in card in the phone; the four buttons over it draw the form, the link sent, an email we do not have and a link that was not sent." },
      { id: "customer-walkthrough-clickable--card-saved-screen", label: "Card saved", look: "The page Stripe returns the customer to after the card is updated." },
      { id: "customer-walkthrough-clickable--season-pass-page-screen", label: "The Season Pass page of the website", look: "The live marketing page in the phone, without the site header and footer; its button goes to Contact, which is still a labelled stand-in." },
      { id: "customer-walkthrough-clickable--walkthrough", label: "The pass, Details and the marketing switches", look: "Steps 7 and 8: the Season Pass page and Details, where the marketing switches turn email and text offers on and off." },
    ],
  },
  {
    title: "Part 3: the messages",
    intro: "Every text and email a customer gets, Current beside Proposed. Start with the Overview.",
    steps: [
      { id: "messages-overview--table", label: "Every message in one table", look: "Every message in the order of the customer's journey, with when each is sent, text or email, transactional or marketing, and a link to each." },
      { id: "messages-booking-and-visits--day-set", label: "Booking and visits", look: "The day set, moved, two weeks out, day before, on my way and the two cancels: the text in a phone bubble, then the live email beside the proposed one." },
      { id: "messages-billing--invoice", label: "Billing", look: "The invoice puts the amount and the due day in one block above the Pay button; the receipt comes for card, check, Venmo and cash, each with what we did, and the refund is a prototype." },
      { id: "messages-archive-of-every-live-email--receipt-with-visit-report", label: "The receipt email with what we did", look: "The checked items and the photos under the money; an unchecked item is never shown, and with the invoice's Include the visit report box left unchecked the section is absent." },
      { id: "messages-season-pass--purchase-confirmation", label: "Season Pass", look: "The purchase confirmation, the renewal offer with its Unsubscribe link and the cancel message." },
      { id: "messages-season-pass--preference-request", label: "The Preference request", look: "A prototype: the text and the email ask when you would like the visit, with the three choices and one sentence about scheduling, and a link to that visit's page." },
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
      { id: "admin-walkthrough-clickable--from-requests", label: "Walk Requests to a quote", look: "Open Rosa Delgado (Christmas lights has no price, so Send a quote leads), Send a quote, confirm what it is for, then price the line in the Quote card, set a deposit if you want one and send it; the request leaves the list and the job reads Quote sent in Jobs. Open Tom Ellis and Create job for the other way out: an Unscheduled job." },
      { id: "admin-requests--list", label: "The Requests list", look: "Requests sits after Schedule in the rail with a count; New comes first, with the customer match, what they asked for and the town." },
      { id: "admin-requests--new-matches", label: "A request that matches a customer", look: "The match panel names Andrea Dalton; the request still waits for you to make a job of it." },
      { id: "admin-requests--seen-priced", label: "A priced service", look: "A sprinkler repair has a catalogue price, so Create job leads and Send a quote is the outline beside it." },
      { id: "admin-requests--convert-preselected", label: "Create job: the convert sheet", look: "The customer and a required What is this for? from the booking catalogue; the request named Christmas lights, so it is chosen. The sentence states the exact effect and says nothing is sent to the person. There is no Accepted status anywhere." },
      { id: "admin-requests--convert-empty", label: "The sheet when no service was named", look: "The picker is empty, the button is off and one quiet line says what is missing. The list ends with Something else, which asks for a name." },
      { id: "admin-requests--convert-changed", label: "A wrong service being changed", look: "The request named the larger repair and Ryan picks a sprinkler repair before he confirms; the sentence follows the choice." },
      { id: "admin-requests--send-quote-dialog", label: "Send a quote from a request", look: "The same sheet; the request moves into a job that needs a quote and you land on its Quote card to price and send." },
      { id: "admin-requests--became-job", label: "This request became a job", look: "An old link opens a plain page with the job and its stage, never a dead end." },
      { id: "screens-newjob--lights-quote-first", label: "New job: a service with no price", look: "Add and send a quote leads, Add job is the outline, and the line says it needs a price before it can be scheduled." },
      { id: "screens-newjob--repair-both-buttons", label: "New job: a priced service", look: "Add job leads and Add and send a quote is the outline." },
      { id: "admin-quotes--install-after-design-visit", label: "An installation after its design visit", look: "The visit is done and on the job, the job needs a quote, and you price the line in the Quote card and send it from there." },
      { id: "admin-requests--home-rows", label: "Home rows", look: "New requests, each quote waiting with its age and Remind, and a decided quote." },
      { id: "admin-quotes--needs-a-quote", label: "A job that needs a quote", look: "One Quote card: the steps, what the customer asked, the service as the one line with an empty price box, and Send a quote off with one line saying what is missing. The band is When, Who, Where and Contact." },
      { id: "admin-quotes--one-line-priced", label: "Price a line in its row", look: "Typing the price is the edit: the total follows, the step moves to Send and the button turns on." },
      { id: "admin-quotes--deposit-percent", label: "A deposit in the card", look: "None by default, dollars or percent, the dollars it comes to, never above the total; a deposit above the total turns Send off and the line beside it says why." },
      { id: "admin-quotes--send-percent", label: "The send dialog", look: "The channel, the exact sentence naming the deposit, the preview and Send without telling under the caret." },
      { id: "admin-quotes--after-send", label: "After Send", look: "The same card becomes the sent quote with its pill, and the lines are locked below it." },
      { id: "admin-quotes--revising", label: "Revising", look: "After Revise the editor is back, the replaced quote is listed and the deposit starts where it was." },
      { id: "admin-quotes--change-service-dialog", label: "Change service", look: "Under More while no quote has been sent: the same picker as the convert sheet; the service line is replaced and the notes and other lines stay." },
      { id: "admin-quotes--service-changed", label: "After Change service", look: "Notes and history says Service changed from the larger repair to a sprinkler repair; once a quote is out the control is gone." },
      { id: "admin-quotes--quote-sent", label: "Quote sent", look: "The lines are locked; send a reminder, Mark approved or Revise." },
      { id: "admin-quotes--approve-by-hand", label: "Mark approved by hand", look: "Ryan says how the deposit was paid; a receipt always goes out and he chooses whether to tell the customer." },
      { id: "admin-quotes--approved-by-customer", label: "Approved with the deposit paid", look: "Billing shows the deposit, and the invoice will show it as already paid." },
      { id: "admin-quotes--approved-edit-line", label: "Changing a price after approval", look: "After the customer approved, each line has Edit and the card has Add a line; a line is canceled, never removed, and the lines stay locked while a quote is out." },
      { id: "admin-quotes--tell-the-customer", label: "Tell the customer the new total", look: "Saving a price that moves the total opens a dialog with the new total and the old one, Text, Email or Both, the exact words, and a caret that keeps the change without telling." },
      { id: "admin-quotes--price-changed-and-told", label: "After the price change", look: "The Total tile says Was $1,200, Billing shows the new total with the deposit credited, and Notes and history records the change and the telling." },
      { id: "admin-quotes--final-invoice-after-change", label: "The invoice after a price change", look: "Its lines are the new ones, the total is the new total, and the deposit already paid is credited as its own line." },
      { id: "admin-quotes--jobs-status-filter", label: "Jobs Status filter", look: "Needs a quote and Quote sent are in the Status filter; the job still holds the quote." },
      { id: "admin-quotes--list", label: "Quotes", look: "Quotes: every quote with its status, as a pipeline with tiles, status tabs and a Next action; send one from a job and watch it appear in the tiles, the tab counts and the rail." },
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
  "Customer account, reworked after your phone review: the Season Pass is its own tab, the plan (the card, each visit's state or timing, how it is paid), and Visits is every visit; the two no longer draw the same rows, Home shows only the next visit and the card, and a customer with no pass finds one quiet Become a Season Pass holder page. Details has Preferences (Early season, Our recommended, Late season, per visit, kept for every season), and a Preference request (text, email and a quiet banner) asks when we need one; a prototype. Reply STOP to opt out ends only the first text a number gets. The receipt, invoices and pay page list only the items that were checked and the photos shared, never Not done.",
  "Requests and quotes: a Requests item in the left menu; a website request waits there until Ryan makes a job of it with Create job or Send a quote, and nothing is accepted. A quote is priced and sent from one Quote card on the job (the price in each line's row, an optional deposit in the card) and approved from a link with Approve and Decline; a deposit is optional and paid at Approve. Create job and Send a quote now ask what the job is for, from the booking catalogue, and Change service on the job fixes a wrong one until a quote is sent.",
  "Booking form: the zip step is gone. It opens on the address, which qualifies the yard, so it is seven steps with the card instead of six (four for a request for a quote). One address box with type-ahead; Type it instead gives Street, City and ZIP. No Call Ryan in the header, no summary with Change links (Back is the way back; Change links are only on Confirm), a Close button, a card step in every booking, and Rachio, water efficiency and installation are bookable. Only Christmas lights and the larger repair are requests.",
  "Messages: every email and text the customer can get is in one section, with a redesigned layout shown next to the current one. In the customer account, the invoice to pay is the first thing on Home.",
  "Season Pass booking: the pass is a setup, not an order. It holds each kind's next visit; a visit that is open now gets an exact day and time and every other visit, next season's too, gets Early, Mid or Late with the real dates, scheduled about two weeks before and kept for every season. Nothing is charged at sign-up; each visit shows what it costs and that it is charged after the visit, the card is required, and the button reads Set up my Season Pass. Customer account: the invoice to pay is still the first thing on Home.",
  "Price change after approval: once the customer approved a quote, Ryan can add a line, change a price or cancel a line. When the total moves, a dialog tells the customer the new total (Text, Email or Both, or keep it without telling), Notes and history records \"Price changed from $1,200 to $1,500\", and Billing and the invoice show the new total with the deposit credited. There is no second approval.",
]
