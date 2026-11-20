# Customer status: research and a recommendation (Nov 19 2026)

Research only, nothing built, no migration run. Written for Hannah's review before any screen changes.

## 1. The question

Hannah, verbatim: "I think you need to think through the status of customers. It's not like he's got unpaid. That's on the job. The status of customers would be active? Think through it a little bit. Go research that."

Today the customer page header in the walkthrough prototype shows a pill "Past due $145" beside the customer's name (`walkthrough/data.ts`, line 43; the pass-holder story in `customer-fixtures.ts` shows "Unpaid $145" the same way). Both pills are a money state sitting where a customer state should be. Hannah's point is that money belongs to the job and the invoice, and that a customer needs a status of its own.

How to read the evidence below. I fetched each page named in the source list. The fetch tool returns a summary, so where I put words in quotation marks they are the words the tool returned in quotes, not text I saw in the raw page. Anything marked **(unverified, from memory)** I did not confirm from a fetched page, and anything marked **(search snippet)** came from a web search result I did not open. The Nielsen Norman Group has no article on status versus stage versus tag that I could find, so that part rests on a design-system source instead (section 2).

## 2. What other systems show

| System | Customer status words | Typed or derived | Where money state appears | Source |
|---|---|---|---|---|
| Jobber | Lead, Active, Archived. The client list filter reads Active, Leads, Archived. | Lead is derived: the label stays "until" one of three things happens ("A job is created for them", "An invoice is sent to them", "Their quote is approved"), and once removed it "is not possible to remark this client as a lead". Archived is typed: "Only admin users have the option to archive a client." Active is what is left. | A Billing section lower on the client profile lists invoices, payments, deposits and refunds and ends with a "Current balance" row. A Client Balance Summary report lists who owes. I could not confirm any balance or overdue pill in the profile header. | [Client archiving](https://help.getjobber.com/en/articles/client-archiving/), [Lead management](https://help.getjobber.com/en/articles/lead-management/), [Client billing history](https://help.getjobber.com/en/articles/client-billing-history/) |
| Jobber, archiving rules | Archiving needs the work closed first: "Requests" and "Quotes" archived or converted, "Jobs" closed, "Invoices" paid or marked bad debt. New work "will automatically be unarchived". Archived clients "will still appear in reports", and the list can be filtered to show only them. | Typed, with a derived guard. | Unpaid money blocks archiving, so an archived client never hides a balance. | [Client archiving](https://help.getjobber.com/en/articles/client-archiving/) |
| Housecall Pro | No customer status words found. A customer has internal tags added from the Profile tab. A Do Not Service customer gets "a prominent 'red tag'" on the profile. Leads are a separate pipeline with statuses (Open, Won, Lost: **search snippet**). | Tags and the red tag are typed. Lead statuses are typed by moving a card. | The profile overview page describes no balance in the header. Its AI summary "Tell me more" surfaces "outstanding balances" beside upcoming jobs and history, as a fact in a side panel. | [Customer profile overview](https://help.housecallpro.com/en/articles/9764383-customer-profile-overview), [Tags](https://help.housecallpro.com/customers/general/where-can-i-manage-my-customer-and-job-tags) |
| ServiceTitan | Active and inactive customers: the Customer List report "displays all active customers" and adds inactive ones only with "Show Inactive Customers". How a customer becomes inactive I could not confirm (**unverified, from memory:** it is a setting on the record). Two flags sit under Additional Info: Do Not Service ("cannot have jobs booked with them") and Do Not Mail ("have opted out of receiving email and text notifications"). | Active or inactive: not confirmed. Both flags are typed checkboxes, set by a CSR with the Edit Customer permission, and the audit trail records who set them and when (**search snippet**). | The Customer Profile financial summary has three figures, "Open Invoices", "Unapplied Credit" and "Customer Balance". Plain facts, no pill. Memberships were not on any page I fetched. | [Customer list report](https://help.servicetitan.com/docs/customer-list-report), [Do Not Service](https://help.servicetitan.com/docs/mark-a-customer-as-do-not-service), [Financial summary](https://help.servicetitan.com/release-hub/docs/gain-clarity-with-crm-page-financial-summary-standardization) |
| Square Appointments and Customer Directory | Two smart groups ship by default: "regulars and lapsed customers". Regulars "visited your business three times in the last six months". Lapsed "were regulars, but haven't visited in the last six weeks". Subscribed customers is a marketing consent group. | Derived by a rule on visit dates that the owner can edit. | No group or filter is based on balance or payment state. | [Customer groups and filters](https://squareup.com/help/ca/en/article/6245-manage-customer-groups-and-filters) |
| HubSpot | Lifecycle stage: Subscriber, Lead, Marketing Qualified Lead, Sales Qualified Lead, Opportunity, Customer, Evangelist, and Other. Lead Status is a separate property, "sub-stages within Sales Qualified Lead", with New, Open, In Progress, Open Deal, Unqualified, Attempted to Contact, Connected, Bad Timing. | Both. "Default automatic updates to the lifecycle stage property will only move the stage forward", and a person can set an earlier one by hand. | The page mentions no payment state. A CRM stage never carries one. | [Lifecycle stages](https://knowledge.hubspot.com/records/use-lifecycle-stages) |
| Attio | A status attribute can be added to People and Companies. Attio's own example is a "Customer Lifecycle" status on Companies. The statuses are named by the workspace, and a "Time in stage" report can read them. | The page does not say. | Attio is a CRM with no billing, so no payment state (**unverified, from memory**). | [Status tracking changelog](https://attio.com/changelog/2025/status-tracking-for-people-and-companies-objects) |
| Stripe | The customer has no status. It has a boolean `delinquent` ("Tracks the most recent state change on any invoice belonging to the customer"; an "automatic payment failure or passing the `invoice.due_date` will set this field to `true`") and a `balance` that "doesn't reflect unpaid invoices". Stripe's own doc then points elsewhere: "If you care whether the customer has paid their most recent subscription invoice, use `subscription.status` instead." What the Dashboard customer page shows in its header I could not verify. | `delinquent` is derived by Stripe from invoice events. | In Stripe, delinquency is the one case of a money flag on a customer, derived from invoices and never typed. Stripe is a billing system, where paying is the whole relationship, and even there it sends readers to the subscription for the real answer. | [Customer object](https://docs.stripe.com/api/customers/object), [Customers (Invoicing)](https://docs.stripe.com/invoicing/customer) |
| Customer.io design system (status versus tag) | Badges for "categorization, metadata, tiers" carry no dot. Status badges carry a dot and describe "process states within a lifecycle". Tags are "user-created categorization", while badges show information "set by the system". | The split is the point: a status is system-derived, a tag is user-made. | Not applicable. | [Pluma badge design](https://pluma.customer.io/components/badge/design) |

### What the table says

1. **No field service tool puts money in the customer's status.** Jobber, Housecall Pro and ServiceTitan show the balance as a fact on the profile (a Billing section, a summary figure, a side panel). HubSpot and Square never mention payment. Stripe's `delinquent` is the single counterexample, and it is a derived boolean in a billing tool, not a label the office reads.
2. **The status words describe the relationship over time:** Lead, Active, Archived (Jobber); active and inactive (ServiceTitan); regulars and lapsed (Square). Hannah's instinct, "active", is the word Jobber and ServiceTitan use.
3. **Lead is derived and one-way in Jobber,** and Archived is the one typed status, set by an admin, kept in reports, and undone by new work.
4. **Do Not Service and Do Not Mail are flags, not statuses.** ServiceTitan and Housecall Pro both draw them as a separate typed marker, and ServiceTitan keeps them next to the customer's notification opt-out.
5. **Where a system can derive a status from dates, it does** (Square's regulars and lapsed, Jobber's lead). That matches the repo's own rule that states are read from facts, never typed.

## 3. Jobs to be done a customer status serves

A status earns its place only if it lets someone decide something faster. Each row names the decision.

For Ryan:

| Job | What he looks at | Decision it enables |
|---|---|---|
| Who do I call back? | Customers with status New, oldest "Added" first, plus anyone with a note asking something. | Call, book a day, or let it go. |
| Who do I re-offer the fall blowout? | Status Active with Next visit "None", read with the Job column (they had a spring turn-on this year). Status alone only narrows to the active people. The Next column does the rest. | Who gets the October blowout text, as long as they have said yes to marketing. |
| Which lead never booked? | Status New with an "Added" date more than a few weeks back. | One follow-up call, or archive. |
| Who do I not text? | The Do not contact flag, a STOP reply, or marketing "No" on the existing Marketing column. | The message dialog and any bulk send skip them and say why. |
| Who is gone? | Past customer and Archived. | Archive the Past customers who will not return so the daily list is short, or keep them for one spring win-back text. |
| Who will I not work for? | The Do not service flag. | New job and online booking refuse them and say who to ask. |

For Hannah:

| Job | What she looks at | Decision it enables |
|---|---|---|
| How big is the customer base? | Count of Active, by month. | Whether the season is growing, and whether to spend on new customers or on bringing old ones back. |
| How many people came in and never booked? | Count of New older than a few weeks. | Whether the website or the follow-up is the leak. |
| How big is the win-back pool? | Count of Past customers who still allow marketing. | Whether a spring email is worth sending. |
| Is the list clean? | Counts of Do not contact and Archived. | Whether marketing numbers can be trusted. |

## 4. Recommendation: a status read from facts, plus separate flags

### The principle

A customer's status describes where they stand with Trailhead, and it is read from the customer's jobs and visits by one pure function. Nobody types it, except the office's one deliberate act, Archive. Money state stays on the job and the invoice. Flags are a different kind of thing: typed, with a reason and a date, and never shown as a status.

### The four states

| Status | Rule, in order (the first rule that matches wins) | Typed or derived |
|---|---|---|
| Archived | `archived_at` is set. | Typed fact, set by the office. |
| Active | Any one of: a job is open (stage Open); a visit is ahead (scheduled or unscheduled, not canceled, not skipped); a Season Pass is in force (`passStatus` active for the current season); or they have had a job (a done visit, or one sold or booked) within the last 24 months. | Derived. |
| Past customer | They have at least one done visit, nothing is ahead, no pass is in force, and they have had no job in the last 24 months. | Derived. |
| New | None of the above: no done visit ever and nothing sold and open. A canceled job and a pending pass (`sold_on` empty) do not count. A job whose stage is Needs a quote or Quote sent does not count either. | Derived. |

The rules read only facts the model already holds: job stage (`stageOf`), visit status and `completed_on`, pass status (`passStatus`), and the date. They take an `asOf` date so Hannah's counts can be recomputed for any past day from the same rows.

### Why 24 months (Hannah's rule, Nov 20 2026)

Trailhead's work comes twice a year. A customer served in the October blowout is quiet in November and still a customer in February. Their next visit is the April turn-on, six months out, and if they miss that, the next natural one is the October after, twelve months out. A rule like Square's six weeks (right for a salon) would label every winter customer lapsed.

Hannah's rule: a customer is always Active if they have had a job in the last 24 months, so Past customer means two full years with nothing. Her reasoning fits a seasonal business: someone served in spring 2026 is still Active in the winter of 2027 and the spring of 2028, and a homeowner who skips one season is not gone. The first draft of this doc said 14 months; that is replaced.

I used the word "Past customer", not "Lapsed", for two reasons. "Lapsed" carries the marketing sense of a win-back target before it is true, and "Past" alone would sit next to "Past due" in the same panel. The 24 months is Hannah's answer to question 2 below.

### Where a Lead belongs

Trailhead has no lead, request or quote model yet, and quotes are deferred. The website contact form writes nothing (Hannah, Nov 18 2026: a form post is unknown until a person makes the job). A person enters the system when the office makes a customer or a job. The office can already make a job that needs a quote (stage Needs a quote, then Quote sent).

So today a Lead is a customer in the state New, and no separate Lead status is needed. This copies Jobber's own rule, where a lead is a client with no job, no invoice and no approved quote, with one difference: Jobber ends the lead label when any job is created, and here a job that still needs a quote leaves the customer New until it is sold. When the quote step is built, a New customer whose job is Quote sent is the lead, and the Jobs section and the job's own pill say so. If Hannah later wants Lead as a word on the customer, it is a rename of New, not a new state.

### Archive

Archive is the one typed status, and it follows Jobber. It hides a customer from the default Customers list, keeps every job, payment and note, and keeps them in reports and in search. These are the rules I recommend:

- Only an owner or admin can archive.
- Archive is refused while work is ahead (an open job, a visit ahead or a pass in force), with the words "Close the open work first" and a link to it. A customer with an unpaid invoice may be archived after a confirm that names the amount, because the invoice and Home's Past due row stay on their own screens, so no money is hidden. (Jobber is stricter here: it blocks until invoices are paid or marked bad debt.)
- New work for an archived customer clears `archived_at` and writes an event, as Jobber does.
- An Unarchive button sits in the panel footer's More menu.

### Flags (typed, not statuses)

| Flag | What it means | Effect | Draw it as |
|---|---|---|---|
| Do not service | Trailhead will not take work from this customer. | The New job sheet and any Schedule action ask for a confirm that names the flag. Online booking and the pass checkout refuse with "Please call Ryan" and no reason shown. Existing visits can still be moved or canceled (ServiceTitan's page says a booked job can still be rescheduled). | A red tag next to the name, as Housecall Pro does, and a line in the header band. |
| Do not contact | No texts or emails except what is owed for money already due (an invoice, a receipt) and a reply to something the customer sent. | The message dialog is disabled with the reason. Marketing sends skip them. | A neutral tag "Do not contact". |

**How Do not contact relates to the consent record.** The `consent` table is append-only, and marketing opt-out is already a row in it (a STOP reply writes one, and so does `customers.consents.record`). To keep one truth, setting Do not contact writes a marketing opt-out row with source `admin` in the same action, and the Marketing column keeps reading the newest consent row (its words today are Yes, No, Not asked). Clearing the flag never opts the customer back in, because only the customer can say yes. So the flag adds one thing consent does not carry, the office's decision to send nothing but money messages, and the consent table stays the single answer to "may we market to them". A customer who only wrote STOP has marketing "No" and no flag.

Each flag has a date and an optional reason, and every set or clear writes an event, so the customer's history says who did it and when.

## 5. Where money lives instead

- **On the job:** the money words from `src/lib/money/words.ts` (Paid, Unpaid, Invoice sent, Past due, Failed) stay as they are, on the job page and the Jobs grid.
- **On the invoice:** its own status (Sent, Past due, Part paid, Paid, Voided), on the Invoices screen and panel.
- **In the Billing section** of the job and of the customer page: Total, Paid, Unpaid, then invoice and payment rows.
- **At the customer level:** a plain fact. The prototype's summary band already has this tile: Unpaid, "$145", sub line "Invoice sent, due Dec 2", linking to the invoice (and to Billing when there is none). It keeps its alert tone, red only when something is past due or failed, as the band already does. It is a number to open, not a pill. Jobber, ServiceTitan and Housecall Pro all show it this way (section 2).

**The header should show:** the name, then the status pill (Active in the green tone, New, Past customer and Archived in the neutral tone of the colour table), then the Season Pass pill when a pass is in force, then a red Do not service tag or a neutral Do not contact tag when set. If green Active beside a green Season Pass pill reads as noise, the pass pill can take the info tone (it names a held pass, not a state). That is a call for the colour table and I left it alone.

**The header should lose:** "Unpaid $145" and "Past due $145". A customer's money is one click away in the band tile, and Ryan loses nothing, because the same word is on the job and the invoice. The colour table reserves red for failed and late, and with the pill gone a customer with one unpaid job no longer shows red beside their name.

## 6. The Customers list and Cmd+K

**Customers list.** A Status column goes after the name (words: New, Active, Past customer, Archived) with a dot and a word, the same `StatusPill` as everywhere. A Status filter has those four chips. The default view shows New, Active and Past customer, so archived people are out of the daily list (Jobber's list works the same way) and one chip brings them back. The header count reads "86 customers, 31 active". The existing Unpaid, Next and Marketing columns stay, and they give Ryan's re-offer list (Active, Next "None"). Two more filter chips, Do not service and Do not contact, cover the flags. On a phone the card's `state` slot reads the status in place of the current pass word, and a flag adds a small tag.

**Cmd+K.** Results show the name and street, and a muted status word after them ("Andrea Reyes, Briggs St, Active"). Archived customers stay searchable and sort last with their word shown, which prevents a duplicate customer when someone returns (Stripe's own guidance is to check "that they don't already exist" before creating one). Choosing an archived customer opens their page with an Unarchive button.

## 7. Data model impact

Nothing is run here. This describes what a build would add.

- **A pure function in `src/lib/`** only: `customerStatusOf(facts, asOf)` in `src/lib/customers/status.ts`, returning `"new" | "active" | "past" | "archived"`. It reads job stage, visit rows, the pass status and `archived_at`, and nothing is stored. The list row (`CustomerRow.status`), the panel header, the Cmd+K hit (`search-hit.ts`) and the counts all call it. A test table lists each rule's boundary, including exactly 24 months, a canceled-only customer, a pending pass and a Needs a quote job.
- **Three nullable columns on `customer`:** `archived_at`, `do_not_service_at` and `do_not_contact_at` (all timestamps, null for every row). The migration is additive only, with no backfill, so it is safe under the rule that a pushed branch migrates production.
- **Events:** `customer.archived`, `customer.unarchived`, `customer.flagged` and `customer.unflagged` in `src/lib/events/kinds.ts`, with the flag name and the optional reason in `detail`, and words in `eventWords` so the Notes and history block reads "Ryan marked Do not service, reason: unpaid repairs".
- **Consent:** setting Do not contact appends a marketing opt-out `consent` row (source `admin`). Nothing in `consent` changes shape.
- **`docs/DATA_MODEL.md`:** a row for each new column, one for the derived status naming the rule, and the Customers list and Cmd+K cells filled in.
- **What is not added:** no `status` column, no Lead state, no money column on the customer.

## 8. Open questions for Hannah

In the order to ask them, one at a time. My default is in bold.

1. **Is a customer's status a word the system works out from their jobs, with Archive as the only thing Ryan sets by hand?** **Yes. Active, Past customer and New are always read from facts, and only Archive is typed.**
2. **How long should someone go with no visit before they read Past customer instead of Active?** **Answered by Hannah: 24 months. A customer with a job in the last 24 months is always Active.**
3. **Should a person Ryan added who has no job yet show as New, with no separate Lead word until quotes exist?** **Yes. New is the lead for now, and when quotes arrive a New customer with a Quote sent job is the lead.**
4. **May Ryan archive a customer who still has an unpaid invoice, after a confirm that names the amount?** **Yes with the confirm, but never while a job, a visit or a pass is still open.**
5. **Should Do not service be a typed flag with a red tag that stops new jobs and online booking but still lets Ryan move or cancel visits already booked?** **Yes, with an optional reason kept in the history and never shown to the customer.**
6. **Should Do not contact be a second typed flag that also records a marketing opt-out in the consent record, so there is one answer to "may we market to them"?** **Yes. Clearing the flag leaves marketing off until the customer says yes.**
