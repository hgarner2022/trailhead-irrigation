# Requests and quotes: research and recommendation (Nov 20 2026)

Research only. No code is written and nothing is wired. Hannah asked: "Where do requests go? I don't think we have designed requests, have we?" She is right, and this doc says what exists, how Jobber, Housecall Pro, ServiceTitan, Square and Pipedrive handle the same moment, and what Trailhead should build, ending with six questions for her.

**How to read the evidence.** I fetched the pages named in the source list. The fetch tool returns a summary of each page, so words in quotation marks are the words the tool returned, not text I saw in the raw page. Anything marked **(search snippet)** came from a web search result I did not open. Anything marked **(unverified, from memory)** I did not confirm. Where a page I tried returned an error, I say so.

## 1. The question and what exists today

**The question.** Someone who is not a customer asks for work that cannot be booked online. Where does that ask live, who sees it, how does Ryan turn it into a quote and then a job, and what does the person see?

**What exists today, from the repo.**

- **The website contact form** (`src/app/api/contact/route.ts`) sends one email to Ryan through Resend, with name, phone, email, address, service and message, and writes nothing. `CLAUDE.md` gives the reason (Hannah, Nov 18 2026): a form post is unknown until read, and may be spam, a question or a lead, so nothing enters the system until a person makes the job.
- **The booking form's quote path** (`src/app/(booking)/booking/_screens/`) is zip, "What do you need a quote for?", address, "Tell Ryan about it", contact, then the button "Send to Ryan" and the done line "Thanks, Ryan will call you by tomorrow." It is a prototype and sends nothing. The way in is "Need a quote? Request one" under the service list. Photos are allowed on the details step.
- **The quoted services in the form's fixture** (`QUOTE_SERVICES` in `src/lib/booking/services.ts`) are four: Rachio, New sprinkler system, Christmas lights and Larger sprinkler repair. Hannah says only Christmas lights and the larger repair are quote-only now, and that Rachio, water efficiency and installation are bookable. The fixture and her answer disagree and need reconciling before anything is built.
- **A job that needs a quote already exists, made by the office.** `jobs.create` with `needsQuote` makes a customer (found by email or new), a property and a job with `source` site, no visit and one unpriced line holding the customer's words. `stageOf` (`src/lib/jobs/stage.ts`) reads the stage Needs a quote (nothing sold and no quote sent, or every line unpriced) and Quote sent (`quote_sent_on` set, `quote_accepted_on` and `sold_on` empty). The job panel lets a manager add, edit and cancel lines on an open one-off job. The event `job.requested` is worded "Quote asked for online".
- **What has no screen or writer.** Nothing sets `quote_sent_on` or `quote_accepted_on` (the data model calls it "the quote step (step 7)"). There is no quote document, no way for a customer to approve, no list of requests, no Home row for a new ask and no message to the person who asked. The old `quote_request` table was dropped in step 6.
- **Earlier decisions that bind this design.** The online booking design (Nov 18) question 3 recommended making the job at submit for a quote request and noted that this differs from Hannah's Nov 18 contact-form rule. It was never answered. The customer status research (Nov 19) says there is no Lead word until quotes exist, that a New customer whose job is Quote sent is the lead, and that Lead would be a rename of New. The navigation design (Nov 19) keeps six rail items and four phone tabs plus More. The online booking design (question 5) says the quoted done screen may promise a callback time only if Ryan agrees; the code's "by tomorrow" is a promise nobody has confirmed.

**So the gap is real.** A quote ask is an email. A reply, a look at the yard, a price and a yes all happen outside the system. The Jobs stages Needs a quote and Quote sent are drawn but nothing can put a job into them except the office typing the whole thing in.

## 2. How other systems model it

### Table A: objects, statuses and where they sit

| System | Objects and their names | Statuses, in their exact words | Where in the navigation |
|---|---|---|---|
| Jobber | **Request** (where "new work starts"), with an optional **Assessment** (a "calendar block" on the request, the visit to the property before quoting), then **Quote**, then **Job**. Forms are of three types: Request form, Assessment booking form, Job booking form. | **Request:** New, Needs approval, Unscheduled, Today, Upcoming, Overdue, Assessment complete, Converted, Archived. **Quote:** Draft, Awaiting response, Changes Requested, Approved, Converted, Archived. A client with no job, no sent invoice and no approved quote carries a Lead label. | Requests is a side-navigation item. Quotes is a side-navigation item. A "Sales Pipeline" tab (a Kanban board) shows requests and quotes as cards in stages: "New Request", "Assessment Unscheduled", "Assessment Scheduled", "Assessment Completed", then "Draft", "Awaiting response", "Changes requested". |
| Housecall Pro | **Lead** (Pipeline add-on) then **Estimate** (with **options**, a customer may approve one, or several if the pro allows), then job. | **Estimate:** Approved (in person on the mobile app), Pro Approved, Pro Declined (set by the pro on web). The page names no status for a customer's own online approval or decline. **Leads board:** a "Lost" column and custom columns **(search snippet)**. | Leads are on a board reached from "Pipeline" in the top bar **(search snippet)**. |
| ServiceTitan | **Lead** (a marketing lead or a technician-generated lead), **Opportunity** (appears once estimates exist), **Estimate**, then a sold estimate is scheduled as a job. | **Opportunity:** Open (labelled Not Attempted, Unreachable or Contacted), Won, Dismissed. A "Sold threshold" on the estimate subtotal decides Won or Dismissed. | A "Follow Up" toolbar item with tabs Unsold Estimates (the first), Sold Estimates, Surveys, Recurring Service Events, Expiring Memberships. |
| Square Appointments | **Pending appointment request** only. No quote object. | Pending, then accepted (becomes an upcoming, confirmed appointment) or declined (removed). | Pending requests show under Notifications on the Dashboard overview and on the Calendar. No own item. |
| Pipedrive (a design analogue, not field service) | **Lead** held in the **Leads Inbox**, apart from **Deals** in a pipeline. | A lead has no stage. "A lead must always be linked to a person or organization." Converting removes the lead and makes a deal. Archived is separate. | Leads Inbox is its own area, deals are on the pipeline board. |
| Thumbtack (marketplace, community posts only) | A request the pro may "pursue by contacting the customer", or an automatic match **(search snippet)**. | Not verified. | Not verified. |

### Table B: who is told, what the customer does, how it converts, how an unknown sender is held

| System | Who is notified | What the customer sees and does | Request to quote to job | How an unread or unknown sender is held |
|---|---|---|---|---|
| Jobber | In Emails and Text Messages Settings you choose the team member who receives client replies and can alert the team on new requests; with reply-to set to the sender, all admin users get an email. For an online booking, admins get an activity feed notification and an email with a "View Booking" button. On quote approval: an activity feed and push notification to admins. | Submits through the website, client hub or a direct link; reviews on a review screen; sees a confirmation message and gets an email copy. For a quote, opens it in client hub from an email or text link, selects "Approve" (or "Approve and Pay Deposit"), signs by drawing or typing a name. Can select "Request Changes" if enabled, and the quote leaves client hub until revised. | On a saved request, "More", then convert to a quote or job. After an assessment is marked complete you may convert, leave it as "Action Required", or archive. The converted request is marked Converted with a link to the new quote or job. A quote converts with "Convert to Job", copying line items, costs, discount and tax rate. | A submitter is not held away from the client list: "New submitters are added to your client list as leads." The one hold is an assessment booking form with "Require assessment booking approval", on by default, where bookings arrive as "Needs Approval" and you "accept or decline" them. A service area setting can stop out-of-area submissions. Spam protection is not covered by the pages I fetched. |
| Housecall Pro | After a customer's online approval you are notified at the support email on the Company Profile. | The customer gets the estimate by email or text and can approve or decline it. Approving one option declines the others. The online steps are not described on the page I fetched. | The pages I fetched do not cover lead to estimate or estimate to job. | Not covered. One earlier repo note (not re-fetched) says Housecall Pro online booking offers "Send request" when no slot is open, and the business gets a lead. |
| ServiceTitan | Not covered in the pages I fetched. | Not covered. | A sales technician is dispatched to a lead, estimates are created, and the opportunity "remains open in Follow Ups until an estimate is sold". A sold estimate moves to Sold Estimates, where you schedule the job. Unsold ones are followed up from the screen or by logging a follow-up to check in later. | Not covered. |
| Square Appointments | Pending requests surface on the dashboard and calendar. | After you accept or decline, you choose to notify the client by email or text and may add a message. Clients can cancel a pending appointment at any time. | Not applicable, no quote. | The hold is a setting: "Business must accept or decline all appointment requests." Until then a request stays pending. |
| Pipedrive | Not covered. | Not applicable. | Convert in the list or detail view. The person, organization, notes and files carry over to the deal. The lead is then removed. | The Leads Inbox exists because early prospects "can create clutter" in the pipeline. It is the closest match to Trailhead's hold, with one difference: Pipedrive links every lead to a person or organization, and Trailhead will not make a customer for an unknown sender. |
| Thumbtack | Not verified. | Not verified. | Not verified. | Pros report that many leads never reply and that a short first message naming the service and giving a next step works **(search snippet, community posts)**. |

### What the systems agree on

1. **Two or three objects in a line.** Request, then quote (or estimate), then job. Jobber and ServiceTitan keep a quote as its own document; Square has none.
2. **A quote has a small set of states and a link the customer opens.** Jobber's are Draft, Awaiting response, Changes Requested, Approved, Converted, Archived. The customer approves from a link, with a typed or drawn name. Manual approval by the office exists too ("More", then "Approved" in Jobber; Housecall Pro's Pro Approved).
3. **The on-site look is a scheduled thing attached to the request.** Jobber's Assessment is a calendar block on the request. ServiceTitan dispatches a sales technician to the lead.
4. **Follow-up is a first-class job.** Jobber's follow-ups run on a schedule counted from when the quote was sent (search snippet: up to two reminders for quotes in "awaiting response", on its Connect plan and up, with automatic archiving after a number of days you choose). ServiceTitan's Follow Up screen lets you log a follow-up date. Jobber's Academy suggests following up 2 to 3 days after a quote, guidance not a rule. Zigaflow's article (a vendor promoting its leads feature) says small service businesses lose enquiries through handling, not volume, and lists "new, quoted, following up, won, or lost" as the statuses worth seeing at a glance.
5. **Statuses are usually typed.** Jobber's New, Converted and Archived are set by actions; Overdue is read from the assessment's date (derived). Housecall Pro's Pro Approved and Pro Declined are typed by the pro. ServiceTitan's Won and Dismissed are derived from the estimate's subtotal against a threshold, and its Open sub-labels are set by follow-up outcomes. Trailhead's rule (states read from facts) fits Jobber's Overdue and ServiceTitan's Won better than the typed ones.
6. **The inbox and the pipeline are different jobs.** Pipedrive separates the Leads Inbox from the deals pipeline so early prospects do not clutter active work. Jobber puts both in one product but gives the list (Requests) and the board (Sales Pipeline) separate places. The vendor blogs I searched (Zigaflow, Streak, Copper and others, all with something to sell) describe the same split: an intake step first, a pipeline after. I found no independent usability research on inbox versus pipeline for small field-service businesses. That part is **opinion from vendor sources**, and I did not find a neutral UX source.
7. **Almost nobody holds the unknown sender out of the customer list.** Jobber and Pipedrive both create a person or client first and label it a lead. Square holds the request, not the person. Trailhead's rule is stricter than all of them, which is a choice, not a convention, and it carries a cost: Ryan cannot see a request in Customers, so it needs its own place.

### What the systems do not settle

- **Spam.** None of the pages I fetched describe spam handling for a request form. Jobber's pages say nothing on it. This design cannot copy an answer.
- **Response time.** Jobber's pipeline shows a freshness chip, "green for opportunities under an hour old and red for those over 24 hours old" (Sales Pipeline page). That is a display of age, not a promise to the customer. Trailhead should show age and promise nothing.
- **How Housecall Pro and ServiceTitan notify the pro about a new lead.** Not covered in the pages I could fetch (two Housecall Pro lead pages returned 404).

## 3. Jobs to be done

### Ryan

| Job | When it happens | The decision it drives |
|---|---|---|
| See new requests the same day | A phone buzz or an email while he is on a truck | One list of what has not been looked at, a count on Home and on the rail, and the notification email Ryan already gets stays. A request is never only an email. |
| Tell spam from a lead | He reads a request on a phone between jobs | A request holds a stranger's details outside Customers. The decision is one button: make it a job, or archive with a reason. Spam never creates a customer. |
| Visit the yard and quote | After a call, he stands in the yard | The look at the yard is an ordinary visit on the job (the catalogue already has "Free consultation", 30 minutes, kind consult). He writes the lines in the job panel on his phone. No new "assessment" object. |
| Send a quote | In the truck after the look | "Send a quote" freezes the lines, as "Send an invoice" does, and texts or emails one link. No separate quote editor and no Draft list. |
| Follow up | A quote has been out for a while | Home lists the quotes still waiting, oldest first, with the age and a Remind button. Reminders are pressed by hand, once a day, like invoices. |
| Convert to a job with the lines | The customer says yes | Nothing to convert by hand. The job already holds the lines. Approval sets the sold day and the job reads Open, ready to schedule. |

### The customer

| Job | The decision it drives |
|---|---|
| Know the request arrived | A confirmation on screen and one email stating it arrived. No promise of when Ryan will call. |
| Approve or decline a quote online | One signed link, no sign-in, two buttons, Text Ryan and Call Ryan beside them. The customer reads "quote", never "job", "line" or "stage". |
| See it in their account | After Ryan accepts the request the person is a customer and can sign in by email. A quote waiting shows on account Home beside the invoice to pay. A decided quote stays at its link. |

## 4. Recommendation

### 4.1 The objects

- **Request.** New. A held record about someone who is not yet a customer. It holds the person's own words and contact on its own row. It never touches `customer`, `property` or `job` until Ryan accepts it.
- **Quote.** New, and shaped like the Invoice already is: a document made when Ryan presses "Send a quote", with the job's lines frozen into it, a number, a signed link for the customer and the two facts that matter (sent day, decision). There is **no Draft quote row**. The draft is the job's live lines, which Ryan already edits in the job panel. This is the invoice pattern (`invoice.lines` is a frozen jsonb copy; the pay page is a public page bound to one invoice by a signed token and the `own-invoice` gate in `callApi`).
- **Job.** Unchanged. It is where the lines live and where the stage is read. Accepting a request makes a job in Needs a quote, which is exactly what `jobs.create` with `needsQuote` already makes. Approving a quote sets `sold_on` and `quote_accepted_on`; sending sets `quote_sent_on`. `stageOf` keeps reading Needs a quote and Quote sent from those dates, so the existing stages gain their writers and no new stage is needed.
- **The look at the yard is a visit.** A "Free consultation" visit on the job. There is no assessment object. One check is needed before this works: `stageOf` returns Done as soon as every live visit is complete, ahead of the quote checks, so a job whose only visit is a finished consultation would read Done while still unsold. The order in `stageOf` must read an unsold job with no accepted quote before Done. This is a defect to fix when the quote step is built, not a reason to add an object.

### 4.2 Navigation: one item, "Requests", and no Quotes item

Jobber puts Requests and Quotes beside Jobs. Trailhead should not copy both, for three reasons.

1. **The volume is small.** Only Christmas lights and the larger repair are quote-only. A list of quotes with its own item would be nearly empty most of the year.
2. **Quotes already have a home.** A job in Needs a quote or Quote sent is in the Jobs grid under its Status filter, and the quote itself is a section on the job. A second list of the same things is the duplication Hannah's consistency rule warns against.
3. **Requests have no other home.** Because an unknown sender must stay out of Customers and Jobs, a request needs a place that is not either. That is the inbox, and it is what Square's "pending" and Pipedrive's Leads Inbox do.

So: **Requests** is one new rail item, placed after Schedule (the order reads Home, Schedule, Requests, Jobs, Customers, Reports, Settings), with a count badge of New requests. A request that Ryan has accepted stays in the list and links to its job, whose stage carries the rest. The phone's bottom bar stays Home, Schedule, Jobs, Customers and More. Requests goes under More with the count shown on the More button, and Home's row (4.7) is the phone's main entry. If Hannah would rather not add a seventh item, the fallback is a segmented control on the Jobs screen, "Jobs | Requests", which keeps the rail at six; the cost is that the count has nowhere permanent to sit on a laptop.

A request opens in place through the one record host, as a panel, because it is small: the same `RecordPanel` and `RecordFooter` as every other record. It is not a page.

### 4.3 The request fields

| Field | Notes |
|---|---|
| Service asked for | The booking form's quote service, or for the contact form its service choice. May be empty on a plain question. |
| Address | Street and town as typed (the address type-ahead stores a place when it can). The town is checked against the six towns on the form, as the zip step already does. |
| Contact | First and last name, phone, email, and how they want to be reached (text, email, both), as the contact step asks. |
| The customer's words | Free text, 2,000 characters like a note. |
| Photos | Up to the same limits as visit photos, JPEG, PNG, HEIC or WebP, 10 MB each. |
| Where it came from | `booking-quote` or `contact-form`. Used in Reports the way Jobber uses lead source. |
| When | Received at. |

A "matches a customer" line is **read when the panel opens**, by email or phone against existing customers, and is never stored. It shows as a customer chip. It is a hint to Ryan, not an action: Accept makes the job under the matching customer if Ryan confirms, else a new customer, as `jobs.create` already finds by email.

### 4.4 How an unknown sender stays out of Customers

1. Both forms write a `request` row first, then email Ryan as they do today. The email stays as the alert so a failed write loses nothing.
2. The row holds the contact itself. No `customer_id` and no `property_id` exist on it until Accept.
3. **Accept** is one action by a person with the write scope. It runs the existing rules: find the customer by email (any case) else make one, use the address given as the property, and make the job in Needs a quote with one unpriced line holding the customer's words. It writes `job.requested`, links the request to the job and sets `accepted_at`. The new customer reads **New**, which is the customer status research's rule, so no Lead word is needed.
4. **Archive** is the other button, with a reason Ryan picks: Spam, Question answered, Not a fit, Duplicate. No customer was ever made, so there is nothing to clean up. The reason is a fact on the row and later answers "how much of what comes in is spam".
5. **Making it harder to send junk.** Reuse what exists: the MX lookup and the per-email hourly cap that `passes.create` already applies to the anonymous `public` principal, a hidden field the form must leave empty, and the form's own zip and six-town check. A post that fails the hidden-field test is not stored at all. Jobber's pages describe a service-area setting but no spam control, so there is no convention to copy and I recommend nothing stronger than this.
6. **A known customer's email is not trusted.** Someone can type another person's email. Accept is a person's decision, and the request panel shows the match so Ryan sees it. The acknowledgment email (4.8) is the one place a typed address could be abused, so it is capped by the same per-email hourly limit and carries no account link.

### 4.5 Statuses, read from facts

A request's own status has only four words. Everything after Accept is the job's stage, read once by `stageOf`, so no fact has two words.

| Word | Rule, read from facts | Typed? |
|---|---|---|
| New | Not accepted, not archived, and no staff event about it yet (no `request.seen`, no note). | Derived |
| Seen | Not accepted, not archived, and a staff event exists (the panel was opened, or a note was written). | Derived |
| Archived | `archived_at` is set. The reason sits beside it. | The one typed fact, as Archived is for customers |
| Accepted | `job_id` is set. The row then shows the job's stage in place of its own word: Needs a quote, Quote sent, Open, Done or Canceled. | Derived |

**Where "Quoted, Won and Lost" went.** The example list in the brief (New, Seen, Quoted, Won, Lost, Archived) is covered without more words:

- **Quoted** is the job stage Quote sent.
- **Won** is the job reading Open or Done after `quote_accepted_on` is set.
- **Lost** is a declined quote. The customer declining writes `decided_on` and the outcome on the quote and an event. The job is then canceled by the rules `jobs.cancel` already has (no payment held), so the stage reads Canceled, and Reports counts "Requests lost" as accepted requests whose quote was declined. No Lost word is added to any screen, because Canceled already exists and a second word for it would break the one-word-per-fact rule.
- A request's conversion rate (Jobber's "Conversion rate": the percentage of new requests converted to a quote or job) is a Reports figure computed from these facts, never a stored field.

**The quote's own pill** appears on the job's Quote section and on Home: **Sent** (not decided, not replaced), **Approved**, **Declined** and **Replaced** (Ryan revised and sent again). These mirror the invoice pills (Sent, Past due, Part paid, Paid, Voided). Jobber's Draft is not needed (no row until sent), and Jobber's Changes Requested is left out (question 4). Money words are not touched: a quote is not money until a job is sold, and the only money words on any screen stay Paid, Unpaid, Invoice sent, Past due, Failed and Refunded.

**Seen is a write on a read.** It is written once, when a person with the write scope first opens the request. A failed write must never block opening it, as `recordEventSafe` already does for money paths. A request that Ryan answers by phone and never opens in the app is still New, and this is the honest reading: nobody looked.

### 4.6 How a quote works end to end

1. Ryan accepts the request. The job is in Needs a quote with one unpriced line.
2. He books a "Free consultation" visit from the job if he wants to look at the yard (an ordinary visit, texted as every visit is). He may also skip it and quote by phone.
3. He writes the lines in the job panel (the existing add, edit and cancel lines). The job panel's primary, per the footer rule, reads **Send a quote** once a line is priced.
4. **Send a quote** freezes the lines and tax into a `quote` row, sets `quote_sent_on`, and sends the customer one link by text or email. It records `quote.sent`. The job reads Quote sent.
5. The customer opens `/quote/<id>?token=`, a public page bound to one quote by a signed token, like `/pay/*`. It shows the frozen lines and total in the customer's words. Two buttons: Approve and Decline. Text Ryan and Call Ryan sit beside them, the pattern the account uses inside the 24-hour window.
6. **Approve** sets `quote_accepted_on` and `sold_on` (one atomic update, as `markPassActive` claims a pass sale, so a double tap approves once), writes `quote.approved`, texts or emails the customer a confirmation, and raises a Home row for staff ("Andrea approved a $1,200 quote"). The job reads Open and is ready to schedule.
7. **Decline** writes `quote.declined`, cancels the job as above and raises the same kind of Home row.
8. Ryan may also mark a quote **Approved** by hand after a call (Jobber's manual approval, Housecall Pro's Pro Approved). It writes the same facts with `who` set to Ryan and no customer message unless he chooses.
9. If Ryan edits the lines after sending, he presses **Revise**, which marks the sent quote Replaced and returns the job to Needs a quote until he sends again. Lines are locked while a quote is out, so the approved total always equals the frozen quote.
10. **Follow-up** is a Remind button on Home's quote row, once a day per quote, never automatic, the invoice rule. Jobber's follow-ups can run automatically, but Hannah's invoice decision ("never automatic") answers the other way, so this follows her rule (question 5).

Two things are **not** included, on purpose: a quote expiry date (it is a promise to the customer, and the business has not set one) and a signature. The approval is recorded as an event with the time and the quote number. Jobber and Housecall Pro both capture a signature, so adding a typed name later is a small change, and it is listed as a follow-up.

### 4.7 Home and Cmd+K

- **Home Needs action.** Two new row kinds, in the same style as "Invoice past due":
  - **"2 new requests"** as one row that opens the Requests list filtered to New. It shows the oldest age ("waiting 3 hours"), never a promise. Shown while any request is New. A tech sees neither row.
  - **"Quote waiting"** rows, one per quote Sent and undecided, oldest first, with the age and **Remind**. A decided quote raises a `quote-decided` row in the same table the `customer-changed` rows use (`admin_alert`), dismissable.
- **Cmd+K** gets one new group, **Requests**, listing requests that are not yet accepted (New and Seen) by name, street, phone, email and service. An accepted request is not listed again, because Cmd+K already finds its customer and job; an archived request is left out, as canceled visits are. A hit opens the request panel in place on any screen with a record host, and goes to the request's own address from Reports and Settings. The group is hidden for a tech.
- **Record chips.** Every record name inside a request panel is a chip link: the matched customer, the job once accepted, the visit for the consultation, and the quote on the job. The request's own name is a chip wherever it is mentioned (Home, Notes and history). No chip nests inside a row that is itself a link.

### 4.8 Messages the customer gets

Listed as kinds only, no words. All are transactional (sent whatever the marketing opt-in, added to `TRANSACTIONAL_KINDS`) and follow the existing texts-or-email choice and the "Trailhead:" opening and first-text STOP rules.

| Kind | To whom | When |
|---|---|---|
| `request-received` | the person who asked | right after the form is submitted; email only (a stranger's phone has not opted in to texts); states that the request arrived and says nothing about when anyone will reply |
| `quote` | the customer | when Ryan sends a quote; text or email with the signed link, per the channel rules |
| `quote-reminder` | the customer | only when Ryan presses Remind |
| `quote-approved` | the customer | after Approve, or after Ryan marks it approved if he chooses to tell them |
| `quote-declined` | the customer | after Decline; confirms it was received |
| `request-staff` (staff email and text) | owner and admins | on every request; the existing alert email stays; texts only to an owner or admin with a mobile number, through `queueStaffText` |
| `quote-decided-staff` | owner and admins | after Approve or Decline |

The customer's words never include "job", "line" or "stage". The account's words live in `src/lib/portal/words.ts`; any new customer word goes there.

### 4.9 Checked against Hannah's rules

| Rule | How this design keeps it |
|---|---|
| States read from facts, never typed | New, Seen and Accepted are read. Archived is the one typed fact, as it is for customers. Quote Sent, Approved, Declined and Replaced are read from the quote row's dates and its replacement. |
| Every record name is a chip link | Section 4.7. |
| Money words only Paid, Unpaid, Invoice sent, Past due, Failed, Refunded | No new money word. A quote carries a total, never a money word. |
| A section never holds a result message | Accept, Archive, Send a quote and Remind answer with Undo or a toast, as the footer recipe does. Nothing like "Quote sent." is written into a section. |
| Customer words never "job", "line" or "stage" | Section 4.8. The staff screens may say job. |
| No invented copy or promises, including response times | No callback time anywhere. The age on Home is a fact shown to staff. No quote expiry. Question 6. |

### 4.10 Risks and things to settle before building

- **The `stageOf` order** for a finished consultation visit (4.1).
- **Photos before a customer exists.** `photo` requires `visit_id`, `job_id` and `customer_id`, so a request's photos need their own place. A form cannot hold an upload token open before submit without letting strangers write to the store. The safe order is: the form submits first, the server makes the request id and returns a short signed token bound to that id, then the client uploads and attaches. This changes the form's timing for photos, not what the customer sees.
- **The acknowledgment email can be sent to a victim** whose address a spammer typed. It is capped per email per hour, carries no link and states only receipt. Question 6 lets Hannah choose to drop it.
- **The quote-only service list** disagrees between Hannah and the code (section 1).
- **Tech access.** A tech never sees requests, quotes or the money on them, matching how techs already see no gate codes or contact phones.
- **The 24-hour rule** does not apply to quotes, since a quote is not a visit.

## 5. Data model impact, in prose

This is the part for the data model plan; nothing here is built.

**Tables.** Three new tables, all scoped by `organization_id` as every table is.

- **`request`**: its id, the organization, the contact it holds (first name, last name, phone, email, contact preference), the address as typed and the town and a place when known, the service key asked for (nullable), the customer's words, a `source` of `booking-quote` or `contact-form`, `received_at`, `accepted_at`, `job_id` (nullable, the job it became; no foreign key to a customer or property at all), `archived_at` and `archive_reason` (Spam, Question answered, Not a fit, Duplicate). No `status` column. New, Seen, Accepted and Archived are read from these fields and the events.
- **`request_photo`**: the same shape as `photo` without the visit, customer or job (a `request_id`, the blob key, content type, bytes, `added_by`, `deleted_at`). It is read by reference through the request's `job_id` after Accept, so the job panel can show "From the request". It is kept apart from `photo` rather than loosening `photo`'s three required columns.
- **`quote`**: modelled on `invoice`. Its id, the organization, `job_id`, `customer_id`, a `number` (unique per organization, like `invoice.number`), `lines` (a frozen jsonb copy of the job's lines, the way `invoice.lines` is), `amount`, `tax`, `total` in whole dollars, `sent_on`, `decided_on`, `outcome` (`approved` or `declined`, null while waiting), `replaced_at`, and the signed-link fields the pay page uses. A partial unique index allows one live quote per job (not replaced and not decided), mirroring `invoice_job_open_unique`.

**Reused, unchanged.** `line_item` (the quote's lines are the job's lines, and the quote freezes a copy), `job` and its three dates (`sold_on`, `quote_sent_on`, `quote_accepted_on`), `customer`, `property`, `event`, `admin_alert`, `message_log` and the `visit` for the consultation. No column is added to `job`. The quote step's two job columns already exist (`job.quote_sent_on`, `job.quote_accepted_on`).

**Columns that change meaning, not shape.** `job.source` already holds `site` for a quote job. A job made from a request keeps `site`, and `request.job_id` is the link back. `event.about` is plain text, so `request` and `quote` are added to the allowed values in `src/lib/events/kinds.ts` with no migration. `event.customer_id` is nullable (checked in `src/db/schema.ts`), so a request's early events carry no customer until Accept, when the later events carry it.

**Events (new kinds).** `request.received`, `request.seen`, `request.archived` (detail holds the reason), `request.accepted`, then on the job and quote: `quote.sent`, `quote.reminded`, `quote.replaced`, `quote.approved` and `quote.declined`. A note on a request reuses the existing `note` kind. `job.requested` ("Quote asked for online") is still written by Accept, so the job's history keeps its existing first line. A tech's event filter keeps showing only notes, the sale, pass and visit events, so none of these reach a tech.

**Migrations.** All additive: three new tables with their indexes and no change to an existing column, no backfill, and nothing destructive. The old `quote_request` rows were already folded into jobs in migration 0021, so there is no old request data to carry. Deploy order follows the existing rule (a pushed branch migrates production, and a pushed migration is never edited): the migration goes out first with no code reading it, then the writers, then the screens, then the form wiring. The contact form and the booking quote path switch to writing a row only in the last push, and keep emailing Ryan throughout.

**API.** New handlers in the registry, so OpenAPI and MCP get them: `requests.create` (public, for the two forms, with the checks in 4.4), `requests.list`, `requests.get`, `requests.markSeen`, `requests.accept`, `requests.archive`, `quotes.send`, `quotes.revise`, `quotes.remind`, `quotes.approve` and `quotes.decline` (the last two public through a new `own-quote` gate that mirrors `own-invoice`, bound to one signed token), `quotes.markApproved` (staff, by hand). Scopes: write for staff actions; the tech key sees none of them.

## 6. Questions for Hannah

Asked one at a time, in this order. Each default is in bold.

1. **Should Requests get their own item in the left menu now, with a list of what has come in, or stay emails until a later release?** **Yes, one "Requests" item now, with no separate Quotes item.** Without it a request is only an email and nothing on Home or in Cmd+K can show it.
2. **When someone sends a request from the website, should it wait in Requests until Ryan accepts it, so a spam message never becomes a customer?** **Yes, it waits, even if the email matches a customer you already have, and the panel shows the match.** This keeps your Nov 18 rule and answers the open question 3 in the online booking design.
3. **When Ryan sends a quote, should the customer approve it online from a link, or should Ryan only record a yes after a phone call?** **The customer approves from a link, and Ryan can also mark it approved by hand after a call.**
4. **On that link, should the customer be able to do more than Approve and Decline?** **No. Approve and Decline, with Text Ryan and Call Ryan beside them,** instead of Jobber's "Request Changes", which adds a status you would have to manage.
5. **Should quote reminders go out automatically, or only when Ryan presses a Remind button?** **Only when he presses it, like invoices, and Home lists every quote still waiting with its age.**
6. **May the thank-you screen and the first email tell the person when Ryan will call?** **No. They say the request arrived and that Ryan will call, with no time,** unless Ryan agrees to a time he can keep. The prototype's "by tomorrow" is the line this answers.

## Sources fetched

Jobber help center and site:

- [Request basics](https://help.getjobber.com/en/articles/request-basics/)
- [Requests list page and key metrics](https://help.getjobber.com/en/articles/requests-list-page-and-key-metrics/)
- [Requests and bookings settings](https://help.getjobber.com/en/articles/requests-and-bookings-settings/)
- [Schedule an assessment](https://help.getjobber.com/en/articles/schedule-an-assessment/)
- [Online booking](https://help.getjobber.com/en/articles/online-booking/)
- [Quote basics](https://help.getjobber.com/en/articles/quote-basics/)
- [Quote list page and key metrics](https://help.getjobber.com/en/articles/quote-list-page-and-key-metrics/)
- [Quote approvals](https://help.getjobber.com/en/articles/quote-approvals/)
- [Sales pipeline](https://help.getjobber.com/en/articles/sales-pipeline/)
- [Lead management](https://help.getjobber.com/en/articles/lead-management/)
- [How to follow up on a quote (Jobber Academy)](https://www.getjobber.com/academy/how-to-follow-up-on-quote/)
- [Quote request form feature page](https://getjobber.com/features/quote-request-form/) (describes online booking, not a request form; spam protection and request-to-quote not mentioned)

Housecall Pro:

- [Estimates, approvals and signatures](https://help.housecallpro.com/en/articles/918072-estimates-approvals-and-signatures)
- [Track approved estimates](https://help.housecallpro.com/en/articles/918072-track-approved-estimates)
- Leads overview, how-to-create-a-lead and leads board pages returned 404 when fetched. The lead facts above come from a web search result (search snippet).

ServiceTitan:

- [Understanding sales vocabulary](https://help.servicetitan.com/v1/docs/understanding-sales-vocabulary)
- [Use the Follow Up screen](https://help.servicetitan.com/v1/docs/use-the-follow-up-screen)

Square and Pipedrive:

- [Square: accept or decline appointments](https://squareup.com/help/us/en/article/8444-accept-or-decline-appointments)
- [Pipedrive: Leads Inbox](https://support.pipedrive.com/en/article/leads-inbox)
- [Pipedrive: leads vs deals](https://support.pipedrive.com/article/leads-vs-deals)

Design source on inbox versus pipeline (a vendor article, so opinion):

- [Zigaflow: an inbox is not a sales pipeline](https://zigaflow.com/insights/inbox-is-not-a-sales-pipeline)

From search results only, not opened (search snippet): Thumbtack community posts on lead responses, the Housecall Pro lead board, Jobber's quote follow-up reminders on its Connect plan, and the vendor blogs on inbox versus pipeline (Streak, Copper, Breeze, Bitrix24).

Repo sources read: `docs/DATA_MODEL.md`, `docs/plans/2026-11-18-online-booking-design.md`, `docs/plans/2026-11-19-booking-form-design.md`, `docs/plans/2026-11-19-job-object-design.md`, `docs/plans/2026-11-19-navigation-design.md`, `docs/plans/2026-11-19-customer-status-research.md`, `docs/plans/2026-11-18-job-and-visit-workflow-research.md`, `src/lib/jobs/stage.ts`, `src/app/api/contact/route.ts`, `src/app/(booking)/booking/_screens/`, `src/lib/booking/services.ts`, `src/lib/services.ts`, `src/lib/events/kinds.ts`, `src/db/schema.ts` (invoice, event, photo), `src/components/blocks/admin-nav.ts`.
