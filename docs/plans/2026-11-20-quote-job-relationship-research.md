# Does a quote get converted into a job, or is the job opened for the quote? Research (Nov 20 2026)

Research only. No code is written and nothing is wired. Hannah asked: "Does the quote get converted to a job, or do you open a job for the quote? I'm confused what is that flow. Did you go research?" She is right that this exact question was not researched on its own. The earlier doc (`docs/plans/2026-11-20-requests-and-quotes-research.md`) took the job-first shape from the repo's existing job stages, not from evidence. This doc goes and looks.

**How to read the evidence.** I fetched the pages in the source list. The fetch tool returns a summary of each page, so words in quotation marks are the words the tool returned from the page, not text I saw in the raw HTML. Anything marked **(search snippet)** came from a web search result I did not open, because the page refused the fetch (Jobber community, Capterra and WorkflowMax returned 403; HubSpot's "create quotes" and MYOB returned 404). Anything marked **(unverified, from memory)** I did not confirm. I found no independent, non-vendor source on field-service quote workflow. Every source below is a vendor's own help page or a user's post on a vendor forum or review site, so none of it is neutral research. The three general business tools I fetched (Simpro, Oracle, HubSpot) are the nearest thing to neutral, because their words do not sell lawn or irrigation software.

## 1. The question and the current proposal, in plain words

**The question.** Andrea asks for a $1,200 drip-line install. Ryan writes a price, Andrea says yes. Is there one thing in the system (the job) that existed all along and gets a quote document attached, or are there two things (a quote, then a job that is made from it when she says yes)?

**The current proposal is job first.** When Ryan accepts a request, the system makes a job right away. That job reads "Needs a quote" and holds Andrea's words as one unpriced line. Ryan prices the lines on the job. "Send a quote" freezes a copy of the lines into a quote document (like an invoice: a number, a link for the customer, a sent day, a decision), and the job reads "Quote sent". When Andrea approves, the job gets its sold day and reads "Open". Nobody presses a "convert" button, because there is nothing to convert.

**One correction to how the proposal has been described.** It does have a second record. Section 5 of the earlier doc adds a `quote` table modelled on `invoice` (frozen lines, number, decision, a link back to the job). What it does not have is a conversion step, or a job that is created only on approval. So the choice is not "one record or two". The choice is **whether the job exists before the customer says yes**.

- **Job first (current proposal):** request, then job (Needs a quote), then a quote document on the job, then the job becomes sold.
- **Quote first (Jobber's way):** request, then quote, then, on approval, a job is made from the quote ("Convert to Job").

## 2. How each system models it

I use "estimate" where the vendor does. Words in quotation marks are from the fetched page unless marked.

### Table A: shape, button words, what the customer does, what is left behind

| System | Which comes first | The exact words | What the customer does on approval | What the quote is after conversion |
|---|---|---|---|---|
| **Jobber** | Quote first, a separate record. A job can also be made straight from a request: "**More** followed by **Convert to job** on a request." | "To convert an approved quote to a job, click **Convert to Job** from the top of the page, or find the same option under the **More** dropdown." "This creates a job based on the line items approved on the quote." Also "Save and Convert to Job" beside Save Quote, and "Mark as Approved" for "your client agrees verbally". Conversion is manual: the approvals article does not mention auto-converting. | "To approve the quote, the client can select the **Approve** button." The client is then prompted to sign: "draw or type" a name. With a required deposit the button is "Approve and Pay Deposit", then the client adds payment details. | Status becomes **Converted**: "Converted is a final status for a quote." It stays Converted even if the linked job is deleted. Whether the job links back to the quote: the fetched articles do not say. Sources: [Quote basics](https://help.getjobber.com/en/articles/quote-basics/), [Quote approvals](https://help.getjobber.com/en/articles/quote-approvals/), [Job basics](https://help.getjobber.com/en/articles/job-basics/), [Converting a quote to a job](https://help.getjobber.com/en/articles/converting-a-quote-to-a-job/). |
| **Housecall Pro** | Both. (1) An estimate is made **on a job**: estimates are "tightly connected to the jobs they were created on", can be sent before approval, and on approval "The line items from the approved options will appear as line items of the original job." (2) An estimate made on its own is copied to a job with "Copy to Job". | "Tap Copy to Job at top of your screen" (iOS; "Copy to Job in the Action Bar" on the web is a search snippet). A setting, "Automatically copy an approved estimate to a new job", is off by default. The approval box reads "Copy to job". Manual approval is "Approve estimate" and shows as "Pro Approved". | Customers get the estimate "by email or text" and can approve or decline it. Multi-option: "approving one option will decline the remaining options." | "When you copy an estimate to a job, a copy of the estimate remains on file for you to reference in the future." "The estimate and invoice will be linked together with an icon near the top right of each screen." "Jobs that were previously copied from an estimate cannot be converted back to an estimate." Sources: [Estimates on jobs](https://help.housecallpro.com/en/articles/9196840-estimates-on-jobs), [Copy or convert](https://help.housecallpro.com/en/articles/2883009-how-to-copy-or-convert-jobs-and-estimates), [Automate job creation](https://help.housecallpro.com/en/articles/12119814-automate-job-creation-from-approved-estimates), [Approvals](https://help.housecallpro.com/en/articles/918072-estimates-approvals-and-signatures). |
| **ServiceTitan** | The estimate is made on a job (the sales visit), and "The opportunity includes all estimates created for that job." Selling is not conversion to a job. Booking the work is a second step into an install job. | "**Sold / Convert**" on the estimate page. Then, from the Sold Estimates screen, "**Book Job**", or "Book New Job" from the estimate. "Unsell" undoes a sale. "Dismiss" when the customer declines. The pages never say "Create job". | Not covered by the pages I fetched. (The earlier deposit research found that an online estimate "sold but unpaid" can be re-sent so the customer can pay online.) | The estimate stays on the opportunity: once booked, "the job number will display next to the opportunity." "You can book more than one install job from an estimate." Sources: [Sales vocabulary](https://help.servicetitan.com/v1/docs/understanding-sales-vocabulary), [Sell estimates](https://help.servicetitan.com/v1/docs/sell-estimates-in-servicetitan), [Convert and book](https://help.servicetitan.com/commercial/docs/convert-open-estimates-and-book-sold-estimates.md). |
| **Square** (Invoices, no job object) | Estimate first, separate from the invoice. | "Once accepted, you can quickly convert an estimate to an invoice." The menu has "**Convert to invoice**" beside "**Mark as Accepted**". A setting: "Automatically convert estimate to invoice when customer accepts." The article says the estimate has to be converted before the customer can pay. | The customer accepts. With "Add payment schedule" an initial deposit can be requested. | Not covered: the page does not say whether the estimate is kept, linked or archived after conversion. Source: [Create and send estimates](https://squareup.com/help/us/en/article/7215-create-and-send-invoice-estimates). |
| **Simpro** (job costing for trades, not a lawn tool) | Quote first. | "After a customer approves a quote, you can convert the quote to a job, recurring job or recurring invoice." | Not covered. | "If the quote has been approved, it is moved to Quotes > Closed / Archived." The job links back: "click **Open Quote No.**" Source: [Convert a quote](https://helpguide.simprogroup.com/Content/Service-and-Enterprise/Convert-a-Quote.htm). |
| **HubSpot** (a CRM, not field service; the only CRM that adds something) | A **deal comes first** and the quote hangs on it. "To publish a quote, you must associate the quote with a deal and at least one contact." | The quote "moves to a _Shared_ status", then "_Pending approval_", then _Accepted_ "through e-signature, click-to-accept, or a HubSpot user marking it as signed." No conversion step: the deal is the record all along. | E-signature or click-to-accept. | "If a deal has multiple quotes, the deal amount and line items will reflect the latest published quote." Source: [Create and send quotes](https://knowledge.hubspot.com/quotes/create-and-send-quotes). |

### Table B: one quote to many jobs, revisions, how waiting work shows, and complaints

| System | One quote, several jobs, or several quotes, one job | A revised quote | How work waiting on a quote shows | Known complaints and pitfalls |
|---|---|---|---|---|
| **Jobber** | "You can make as many jobs as you like from the same quote." Several quotes into one job: not covered. | Edits after conversion do not follow: "any updates made to the quote, including changes to the discount or tax rate, do not appear on the job." "The job reflects how the quote appeared at the moment it was converted." Editing an approved quote: not covered by the fetched articles. | The quotes list, by status: "Draft", "Awaiting response" ("sent to your client and is awaiting approval or a change request"), "Changes Requested", "Approved", "Converted", "Archived". Waiting quotes are not on the jobs list, because no job exists yet. Source: [Quote list](https://help.getjobber.com/en/articles/quote-list-page-and-key-metrics/). | **(All search snippets; the forum pages refused the fetch.)** A community post says converting "allows multiple jobs from a single line item, which sometimes leads to duplicates and scheduling issues", and that other programs grey out what was already converted. A lawn care owner called making two jobs from one quote "a pain". A "Change orders" thread says editing the job changes the price with no approval attached, editing the quote wipes the signature, and a second quote puts added work in a record apart from the job. A thread asks how to turn a diagnostic quote into a repair job without two separate jobs. |
| **Housecall Pro** | Several approved options go into one job: "Copying multiple options to a job will create a single job segment." "Jobs cannot be combined or merged." Options can be copied back to the original job or "to a new job". | Not covered. A declined estimate can be manually approved "to override their selection." | The pages I fetched list no estimate status words for a list. Estimates can be placed on the calendar: "To schedule an Estimate, you must assign at least one Employee", so an estimate is scheduled like an appointment. | **(Search snippet.)** A Capterra reviewer: "When you copy estimate to a job, the estimate should be archived. Very confusing when you have several estimates that are still showing." Another says finding approved estimates needed tagging and dating them. |
| **ServiceTitan** | "You can book more than one install job from an estimate." (A search snippet said "you cannot book multiple sold estimates into one job" from the office; the Convert page as fetched does not say it, so I do not rely on it.) | An estimate already booked cannot just be booked again. The offered fixes are to "duplicate the estimate for a new job" or "add an appointment to the existing job". | The Follow Up screen: "Unsold Estimates, which are estimates that have been created but haven't yet been sold." Opportunities read "Open" (not won or dismissed), "Won" or "Dismissed". | Its own help covers copy-step errors: "if an estimate is sold twice, you need to cancel the duplicate job and void the duplicate invoice" (search snippet of its FAQ), and an article on double costing says "Booking items from a sold estimate into a new job adds the sold estimate items" to the new job, which can double count revenue; its advice is to "book the job directly through the project instead". Sources: [Double costing](https://help.servicetitan.com/docs/manage-double-costing-from-booking-a-job-from-sold-estimate.md), [Rebook](https://help.servicetitan.com/docs/rebook-estimate-to-another-job), [Follow Up](https://help.servicetitan.com/v1/docs/use-the-follow-up-screen). |
| **Square** | Not covered. | "Tap **Edit** to make changes." No revision workflow in the article. | Not covered. | None found. |
| **Oracle** (a general order system, used only for revision) | n/a | "The Revise feature allows an end user to revise your original quote by creating a new quote record with the same quote number. The versions are distinguished by a revision number." "When the end user revises a quote, the original quote becomes inactive and read-only." Source: [Revising a quote](https://docs.oracle.com/cd/G30557_01/books/OrdMgt/c-Revising-a-Quote-rq1004447.html). | n/a | n/a |
| **HubSpot** | Several quotes on one deal is normal: the deal "will reflect the latest published quote." | "In the upper right of the quote, click **Edit quote** to edit the quote and re-submit for approval." | On the deal's own stage, since the deal already exists. | None found. |

### What the systems agree on, and what they do not

1. **Both shapes are in normal use.** Quote first and convert: Jobber, Square, Simpro, and Housecall Pro's "Copy to Job". Container first with documents attached: Housecall Pro's estimates on jobs, ServiceTitan's estimates on the sales job, and HubSpot's deal. Housecall Pro offers both, which suggests its users needed both.
2. **The two systems closest to Trailhead's size, Jobber and Housecall Pro, differ.** Jobber is quote first and manual. Housecall Pro lets the estimate live on a job and copies approved lines back onto that same job, and its automatic conversion setting is off by default.
3. **Manual conversion is the step vendors keep offering to remove.** Housecall Pro has "Automatically copy an approved estimate to a new job". Square has "Automatically convert estimate to invoice when customer accepts". Jobber has none that I found. That is a reason not to build a convert button for Ryan. It is not proof that quote first is wrong.
4. **Every pitfall I found sits on a copy step.** Duplicate jobs from one quote (Jobber), edits that do not follow the copy (Jobber), a leftover estimate after "Copy to Job" (Housecall Pro), the same estimate sold or counted twice (ServiceTitan). Weight: the Jobber and Housecall Pro complaints are search snippets and single posts, so this is a pattern across a handful of examples, not a measured rate.
5. **I found no documented complaint about jobs created before approval cluttering a schedule.** I searched for it and found nothing. That is an absence in a small search, not evidence it never happens. Two facts make it unlikely here: Housecall Pro estimates sit on the calendar as appointments, not jobs; and in Trailhead a job with no visit has nothing to put on the Schedule (section 3).
6. **Not settled by the sources:** whether a quote the customer approved can be edited (the Jobber and Housecall Pro pages I fetched do not say), and what a customer sees after approval in ServiceTitan.

## 3. The two models side by side for Trailhead

### What the repo already holds (so the comparison is concrete)

- A job has three dates, `sold_on`, `quote_sent_on` and `quote_accepted_on`, and its stage is read from them by `stageOf` (`src/lib/jobs/stage.ts`): Needs a quote, Quote sent, Open, Done, Canceled. The Jobs grid, the job footer ("Add a line" leads while a job needs a quote), the customers list, the API enum and the review story all read those words today. `jobs.create` with `needsQuote` already makes a job like this, and migration 0021 turned every old `quote_request` into one (`job_qr_<id>`).
- The customer's account only reads jobs with a sold day (`isNotNull(s.job.soldOn)` in `src/api/v1/portal/load.ts`), and the customer status rules say "Needs a quote and Quote sent do not count" (`src/lib/customers/status.ts`). So a job that is not sold yet is already invisible to the customer and does not make a customer "Active".
- An invoice is a frozen document on a job (`invoice.lines` is a copy; at most one open invoice per job). The earlier doc's `quote` table copies that design.
- Money is payment rows in `charge`, always with a `job_id`. A deposit paid on the job as a whole has `visit_id` null, and the final invoice credits it as "Payments received". `jobs.cancel` refuses a job that holds a payment ("This job has a payment. Refund it first."), and a mistake is fixed by a Refund row, never a delete.
- The earlier doc's deposit design: Approve with a deposit opens Stripe for the deposit amount, and the quote becomes Approved only when the payment succeeds.

### Case 1: Andrea asks for a $1,200 drip-line install with a $300 deposit

I tell it twice: she says yes and later cancels (1a), and she says no (1b).

| Step | **Job first (current proposal)** | **Quote first (Jobber's way)** |
|---|---|---|
| Andrea's request is accepted | Records: request (Accepted), **job** (Needs a quote, one unpriced line holding her words), event `job.requested`. | Records: request (Accepted), **quote** (draft, with its own lines). No job. |
| Ryan prices it | Edits the job's lines to $1,200. The draft is the job's live lines. | Edits the quote's lines to $1,200. This needs a place for lines that belong to a quote, which `line_item` does not have today, and a Draft state that the current proposal chose not to have. |
| Ryan sends it with a $300 deposit | **Quote Q-2026-0007** is created: lines frozen, $300 deposit frozen, link sent. Job reads **Quote sent**. Lines locked. | Quote Q-2026-0007 status Sent. No job exists. |
| Andrea approves and pays $300 | Stripe takes $300. The webhook, in one update, marks the quote Approved and sets `quote_accepted_on` and `sold_on`. A `charge` row is written on the job, card, visit null. Job reads **Open**, money "$900 unpaid", and the $300 shows "Paid, card". | Stripe takes $300, but **there is no job to write the payment to**. Either the payment gets a `quote_id` and `charge.job_id` stops being required (a change to a table every money screen reads), or approval makes the job at once, which is job first at the moment that matters. Jobber's answer is that the deposit "moves to the job" on conversion. Quote reads **Approved**. |
| Someone makes the work real | Nothing to press. The job is Open. The tray still needs a visit (see the gap below). | Ryan presses **Convert to Job** (Jobber's words) or the system does it. A job is made with a copy of the lines and the deposit. Quote reads **Converted**. Three words for one moment: Approved, Converted, Open. |
| 1a: Andrea cancels before the day | Ryan opens the job, presses Refund on the $300 payment (a negative row), then Cancel job. Job reads **Canceled**, the quote stays Approved on record, history shows who did what. | The same, once a job exists. If she cancels in the gap between Approved and Convert, there is a paid, approved quote and no job, so the refund would have to be done from the quote, a screen that does not exist. |
| 1b: Andrea declines instead | Quote reads Declined, and with no payment held the job is canceled by the existing `jobs.cancel` rules. The Jobs grid shows it Canceled, and Reports counts it from facts. | Quote reads Declined (or Archived). No job was ever made, so there is nothing to cancel, and the only history is on the quote and the request. |
| Final invoice | Existing `planBill` credits $300 as "Payments received", so the invoice asks for $900. | The same, after conversion. |

**What shows where.**

| Where | Job first | Quote first |
|---|---|---|
| Jobs list | A row from the start: "Needs a quote", then "Quote sent", then Open. Ryan filters by Status. | Nothing until a job exists. Waiting work is in a Quotes list (Jobber's "Awaiting response"), which the earlier doc decided not to add to the left menu. |
| Schedule | Nothing (no visit). A consultation visit, if Ryan books one, is on the Schedule as a visit. | Nothing, same. |
| Home | A "quote waiting, 3 days" row from the job's facts. | The same row, from the quote's facts. |
| Customer's account | Nothing until sold, because the account only reads jobs with a sold day. After approval the visit appears when it is scheduled. | Nothing until converted. |
| Customer's quote page | The same `/quote/<id>?token` page in both models: lines, deposit, Approve, Decline. The customer cannot tell the models apart. | Same. |

**A gap that applies to both models.** After approval the job is Open, but the Schedule's tray holds visits, not jobs. Something must make an unscheduled visit when the quote is approved (job first) or when the job is made (quote first), or the job sits Open with nothing to place. The earlier doc says "ready to schedule" without saying what makes it so. This is a build detail, not a model difference.

### Case 2: Ryan changes the price

**2a: before Andrea answers.** She texts "can we add one more zone, $1,400?"

| Step | Job first | Quote first |
|---|---|---|
| Ryan revises | Presses **Revise**. Q-2026-0007 reads **Replaced** and stays on record. The job returns to Needs a quote and its lines unlock. He edits to $1,400 and sends **Q-2026-0008** (a new frozen copy). Job reads Quote sent. The old link must say it was replaced (a build detail the earlier doc does not state). | Edits the quote in place, or makes a second quote and archives the first. Jobber's pages do not say which, so I cannot state it (unverified). Oracle's pattern is a new record with the same number and a revision number, the old one "inactive and read-only". |
| Customer sees | The new link. The old one says it was replaced. | The same, if built that way. |
| Money | None yet. | None yet. |

**2b: after Andrea approved and paid the $300** (a change order).

| Step | Job first | Quote first |
|---|---|---|
| Where the change lives | The job is Open and its lines are editable by Ryan (`lines.update`). The approved quote still says $1,200, so the job total ($1,400) no longer matches what she approved. The earlier doc says lines are "locked while a quote is out" but is silent on after approval. The evidence-backed answer is Housecall Pro's: a new estimate on the same job, whose approved lines "appear as line items of the original job". For Trailhead that is a second quote document on the same job, which the "one live quote per job" index allows once the first is decided. | The first quote is Converted and the job is a copy. A second quote for the extra work becomes a second job unless Ryan adds lines to the first by hand. This is the "separate record from the job" complaint (Jobber community, search snippet). |
| Money | The $300 stays. The balance becomes $1,100 unpaid. The invoice credits the $300. | The same, but on whichever job Ryan chose. |
| What Ryan can find later | Every quote on the job, in order, each with its decision, on the job's page. | A quote list and a job list that he connects through a link. |

### What each costs to build, against the current data model

These are judgments about size, not estimates in hours.

**Job first (the earlier doc's plan).** Already in the repo: `job.quote_sent_on`, `job.quote_accepted_on`, `stageOf`'s two quote stages, `jobs.create` with `needsQuote`, the `job.requested` event, the Jobs grid status and filter, the job footer rule, the account's `sold_on` filter, and a Storybook prototype of this model under `src/app/(admin)/admin/_screens/design/quotes`. To build: the `request` and `request_photo` tables, the `quote` table (modelled on `invoice`), the quote handlers, the `own-quote` gate and public page, the Stripe branch beside the invoice's, and one fix in `stageOf` (a finished consultation visit would read Done before the quote checks). No change to `charge`, `line_item` or `job`.

**Quote first.** Everything above that is not about the job's quote stages, plus: a place for a quote's own lines (a new table, or `line_item` with a nullable `job_id`), a Draft state, an atomic and repeatable convert handler with a rule for whether one quote makes one job or several (Jobber allows several and gets duplicates), a Converted status, a decision on where a deposit lives before a job exists (nullable `charge.job_id`, or convert at approval), and a Quotes list or a widened Jobs grid so waiting work has a home. It would also remove or demote what is built: the two quote stages in `stageOf`, the `needsQuote` branch of `jobs.create`, the status enum in the API schema, the customers-list rule, the job footer's first row, the review story and the prototype. Migration 0021's `job_qr_<id>` jobs would need reshaping, or they would sit as jobs that were never quotes.

## 4. Recommendation

**Keep the job-first shape.** The quote is a frozen document on a job that exists from the moment Ryan accepts the request, exactly like the invoice. The word "convert" appears nowhere on screen. Ryan's flow is: Accept the request (a job appears), price it, Send a quote, the customer approves, the job is Open.

**What the evidence supports.**

- Both shapes are normal, so the proposal is not an outlier. Housecall Pro's estimates on jobs, ServiceTitan's estimates on a job and HubSpot's deal with quotes attached are all container first.
- The pitfalls found in the quote-first systems are all failures of copying: duplicate jobs, edits that do not follow, a stale estimate left behind, items counted twice.
- Vendors offer to remove the manual convert step (Housecall Pro off by default, Square on a paid plan).
- Housecall Pro handles added work by attaching a new estimate to the original job and copying the approved lines onto it. That is the change-order case (2b) done the hybrid way.

**What the evidence does not support.**

- I did not find evidence that job first is better for a business Ryan's size. Jobber, the tool most like Ryan's, is quote first, and many small crews run it without trouble.
- ServiceTitan is not pure job first either: its install is a second job booked from a sold estimate, and it has its own copy errors.
- My complaint evidence is thin. Forum pages refused the fetch, so most of it is snippets.

**What is my judgment.**

- Trailhead's rules favour job first. The data model reads stages from facts on a job, and a quote-first model gives one moment (Andrea says yes) three words: Approved, Converted, Open. Hannah's rule is one word per fact.
- A deposit has to land on something, and in Trailhead money always has a job.
- Most of the job-first model is already built or prototyped.
- The risk that unsold jobs clutter the account or the customer status is already handled in code (the `sold_on` filter, and customer status ignores them). The Jobs list showing them is intended: Needs a quote and Quote sent are Status filters.

**Is the hybrid what the evidence supports?** Yes in this narrow sense. A quote that is its own document record, linked to a job that exists from the start, is the same pattern as Housecall Pro's estimates on jobs and HubSpot's quotes on a deal, and it removes the copy step where the quote-first complaints come from. It is not shown to be better. It is supported by the sources, and the repo's own rules tip the choice.

**Three things to settle before building, whichever way she answers:**

1. What makes the visit that puts an approved job on the Schedule's tray (the gap above).
2. What the old quote link says after Revise.
3. What happens when Ryan changes the price after approval (case 2b). The earlier doc is silent. My recommendation: a second quote on the same job that she approves, with the first kept on record.

## 5. Questions for Hannah

In the order to ask. Each default is in bold.

1. **After Andrea says yes to a quote, should the job just become ready to schedule on its own, or do you want a "Create job" button you press yourself?** **On its own. Nothing to press.** Jobber makes you press "Convert to Job". Housecall Pro and Square both offer to do it for you, and Housecall Pro ships with that off. A button is one more thing to forget, and it is where double jobs come from.
2. **Do you want work that is waiting on a quote to sit in your Jobs list with a status of "Needs a quote" or "Quote sent", or in a separate Quotes list that you open only when you are quoting?** **In Jobs, with the status.** One list, one place to look, and the Home row points to the same thing. Jobber keeps quotes apart from jobs because a job does not exist until the customer approves.
3. **If you change the price after the customer already said yes, should the customer approve the new price again, or should you just change it and tell them?** **The customer approves it again, as a second quote on the same job, and the first one stays on record.** Without it, the job total and what she approved drift apart, and the Jobber users who describe editing a job say there is no approval attached to the change.

## Sources fetched

Fetched and read (the tool's summary of each page):

- [Jobber: Quote basics](https://help.getjobber.com/en/articles/quote-basics/)
- [Jobber: Quote approvals](https://help.getjobber.com/en/articles/quote-approvals/)
- [Jobber: Converting a quote to a job](https://help.getjobber.com/en/articles/converting-a-quote-to-a-job/)
- [Jobber: Job basics](https://help.getjobber.com/en/articles/job-basics/)
- [Jobber: Quote list page and key metrics](https://help.getjobber.com/en/articles/quote-list-page-and-key-metrics/)
- [Housecall Pro: Estimates, approvals and signatures](https://help.housecallpro.com/en/articles/918072-estimates-approvals-and-signatures)
- [Housecall Pro: Track approved estimates](https://help.housecallpro.com/en/articles/918072-track-approved-estimates)
- [Housecall Pro: How to copy or convert jobs and estimates](https://help.housecallpro.com/en/articles/2883009-how-to-copy-or-convert-jobs-and-estimates)
- [Housecall Pro: Estimates on jobs](https://help.housecallpro.com/en/articles/9196840-estimates-on-jobs)
- [Housecall Pro: Automate job creation from approved estimates](https://help.housecallpro.com/en/articles/12119814-automate-job-creation-from-approved-estimates)
- [Housecall Pro: Scheduling jobs and estimates](https://help.housecallpro.com/en/articles/6758788-scheduling-jobs-and-estimates)
- [ServiceTitan: Understanding sales vocabulary](https://help.servicetitan.com/v1/docs/understanding-sales-vocabulary)
- [ServiceTitan: Sell estimates](https://help.servicetitan.com/v1/docs/sell-estimates-in-servicetitan)
- [ServiceTitan: Convert open estimates and book sold estimates](https://help.servicetitan.com/commercial/docs/convert-open-estimates-and-book-sold-estimates.md)
- [ServiceTitan: Use the Follow Up screen](https://help.servicetitan.com/v1/docs/use-the-follow-up-screen)
- [ServiceTitan: Manage double costing from booking a job from a sold estimate](https://help.servicetitan.com/docs/manage-double-costing-from-booking-a-job-from-sold-estimate.md)
- [ServiceTitan: Rebook an estimate to another job](https://help.servicetitan.com/docs/rebook-estimate-to-another-job)
- [Square: Create and send invoice estimates](https://squareup.com/help/us/en/article/7215-create-and-send-invoice-estimates)
- [Simpro: Convert a quote](https://helpguide.simprogroup.com/Content/Service-and-Enterprise/Convert-a-Quote.htm)
- [HubSpot: Create and send quotes](https://knowledge.hubspot.com/quotes/create-and-send-quotes)
- [Oracle: Revising a quote](https://docs.oracle.com/cd/G30557_01/books/OrdMgt/c-Revising-a-Quote-rq1004447.html)

From search results only, where the page refused the fetch (search snippet): the Jobber community threads ([Scheduling multi-step jobs](https://community.getjobber.com/discussions/job-details-scheduling/scheduling-multi-step-jobs/5761), [Change orders](https://community.getjobber.com/discussions/quoting/change-orders/1000), [diagnostic quote into a repair job](https://community.getjobber.com/discussions/operations-forum/how-do-you-convert-a-diagnostic-quote-into-a-repair-job-without-creating-two-sep/16932/replies/16973)), the Capterra reviews of Housecall Pro, Housecall Pro's "Copy to Job" button wording on the web, and ServiceTitan's FAQ line on an estimate sold twice. These are user posts or snippets, not documentation.

Not found: any source independent of a vendor on field-service quote workflow, any Housecall Pro or Jobber complaint about unsold jobs cluttering a schedule, and Jobber's own page on editing an approved quote. A MYOB page returned 404 and a WorkflowMax FAQ returned 403, so I did not use them.

Repo sources read: `docs/DATA_MODEL.md`, `docs/plans/2026-11-20-requests-and-quotes-research.md`, `docs/plans/2026-11-19-job-object-design.md`, `src/lib/jobs/stage.ts`, `src/api/v1/portal/load.ts`, `src/lib/customers/status.ts`, `src/app/(admin)/admin/_screens/design/quotes/quote-model.ts`.
