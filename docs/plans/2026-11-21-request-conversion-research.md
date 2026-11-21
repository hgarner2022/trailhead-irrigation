# Converting a request: no service named, the wrong service, and where the quote is built (research, Nov 21 2026)

Research only. No code is written and nothing is wired. Hannah asked: "Where should it be? But some requests might come in without the job, or you need to convert the service or job, right? Did you research this flow?" Honest answer: the two earlier docs (`2026-11-20-requests-and-quotes-research.md` and `2026-11-20-quote-job-relationship-research.md`) did not cover this. They settled that a request becomes a job and that the quote is built on the job. They did not ask what happens when the request names no service, when the named service is wrong, or what Ryan chooses at the moment he converts. This doc goes and looks.

**How to read the evidence.** I fetched the pages in the source list. The fetch tool returns a summary of each page, so words in quotation marks are the words the tool returned from the page, not text I saw in the raw HTML. Anything marked **(search snippet)** came from a web search result I did not open, or from an article that returned 404 when I tried it directly. Anything marked **(unverified, from memory)** I did not confirm. Where a page says nothing on a point, I write "not stated" and do not fill the gap. Every field-service source is a vendor's own help page, so none of it is independent. I found no neutral usability study of convert flows for small service businesses. The neutral sources I did fetch are general: Nielsen Norman Group on forms, Linear's triage page and Salesforce's lead conversion page.

## 1. The question and what the prototype does today

**The question.** Three things, in Hannah's words and my reading of them.

- **(a) No service named.** Some requests arrive without a service. The sample list has "Ben Harlan, Asked for: Not said".
- **(b) The wrong service.** The service the customer asked for may be wrong, so Ryan must be able to change the service or the job when he converts the request.
- **(c) Where the quote is built.** On the request itself, before anything is created, or on the job that the request becomes.

**What the prototype does today, in plain words.**

- A request page (`design/requests/RequestPage.tsx`) has two ways out in its footer: **Create job** and **Send a quote**, plus Archive. Each opens one small dialog (`RequestDialogs.tsx`) that says what will happen and, when the email or phone matches a customer, offers a choice between adding to that customer and adding a new one. It asks nothing else.
- Which button is primary comes from one flag in `request-catalogue.ts`. The request's service is looked up by name in the catalogue (`SERVICE_LIST` in `src/lib/services.ts`, names compared after dropping "visit" and the zone suffix). A service with a price is job-first. A service with no price (the installation, Christmas lights, the larger repair) is quote-first. **A service that is not named, or that does not match a catalogue name, counts as unpriced**, so a request with no service leads with Send a quote.
- Create job and Send a quote both call `createJobFromRequest` (`walkthrough/WalkRequests.tsx`). It makes the customer (the match or a new one), a job with the request's service as its name (or the word "Job" when there is none) and one line with that name and the catalogue price (or $0), copies the customer's words in as the first note, and moves the request out of the list. The job reads Needs a quote when the service has no price or Ryan pressed Send a quote, else Unscheduled.
- The quote is built **on the job**. `QuoteJobPage` shows "What's included" with Add a line and Edit on each line while the job needs a quote. The job's `service` is a text string set once at conversion. The job page has no way to change it; Ryan can only rename or replace lines by hand.
- New job (`NewJob.tsx`, `NewJobService.tsx`) works the other way round and does make the choice up front: "What are we doing?" is a required select from the active catalogue, and "Add and send a quote" leads when the chosen service has no price.

**The exact gap.**

1. A request with no service becomes a job named "Job" with a $0 line named "Job". Nothing asks Ryan what the job is.
2. A request with a service Ryan believes is wrong cannot be corrected at the convert step. The service is fixed from the request, and the dialog has no service control.
3. After conversion there is no "Change service" action. The only repair is editing lines one by one, and the job's name and service text stay as they were.
4. Where the live site feeds the request, the names will often miss the catalogue. The live contact form (`src/app/(site)/contact/page.tsx`) lists "Full Irrigation Installs", "Season Pass (3 visits)", "Repair", "Winterization", "Spring Activation and System Check" and "Other", and its API route refuses a post with no service. Those strings are not catalogue names, so each reads as unpriced, and "Other" would become a job called "Other". The "Season Pass (3 visits)" label also disagrees with the site rule that a pass is two visits by default. I note this as a finding and do not act on it here.
5. The booking form's quote path asks for a service from a list of quote-only services, so a request from it always names one. So "Not said" can only come from the contact form's "Other", a plain question, spam, or a future request typed in by the office. In the prototype it appears for two archived requests (Ben Harlan, spam; June Whitlow, "Do you also mow lawns?", Not a fit).

## 2. How other systems handle the convert moment

### Table: what the office chooses when converting

| System | What happens at the convert step | What the office chooses or can change | What the inbox row shows when no service was given | How a wrong service is corrected | Is the quote or job created first, or is the quote built on the request? |
|---|---|---|---|---|---|
| Jobber | On a saved request, "By clicking More on the saved request, you can convert the request into a quote or job." Converting "opens the quote creation screen" (or "the job creation screen" for a job). The same client and property carry over. | The article says you can "fill out any line items or add additional details based on their request" on the new screen. Whether a title or assignment is chosen at that moment is not stated. A request that was created internally has a "Request title", described as "a short title that describes the work requested." | Not stated. The requests list columns are Client, Request (the title), Property, Contact, Requested and Status. There is no service column. | The convert article says "The information from the request does not transfer into the line items or any part of the quote directly." So nothing is locked in: the line items are built fresh on the quote or job. Line items "can be added to requests to make quote creation easier later on", added by editing the request after it is saved, which the request page says "can be useful if you add details during an assessment visit". | **The quote is created at convert, on its own screen, and the request becomes Converted.** Converting before any assessment is allowed: "Once a request comes in, you can schedule it as an assessment or convert it directly into a quote or job." Line items can also be put on the request first, so it is partly a quote editor, but the quote itself is a separate record. "Converted" is "a final status for requests." |
| Jobber, quote to job | Converting pulls "over all the quoted line items, plus the quote's discount and tax rate, onto the job." | Not stated whether lines can be edited during conversion or on the job afterwards. | Not applicable. | "The job reflects how the quote appeared at the moment it was converted." Later quote changes do not carry over. "You can make as many jobs as you like from the same quote." | Quote first, then job copied from it. |
| Housecall Pro | **(search snippet, the article returned 404 when I opened it)** Moving a lead to Won opens a "Mark Lead as Won" prompt with Copy to Estimate or Copy to Job. From the lead's details there is a dropdown with the same two choices, then "Copy". The lead is then Won. | **(fetched)** Job fields "like Business Unit, Job Type" can be set on a lead itself, "including custom fields you've configured". Whether they can be changed in the copy prompt is not stated. | **(fetched)** "The All Leads list doesn't yet show Business Unit or Job Type as columns", and the list cannot be filtered by them. What an empty one shows is not stated. | **(fetched, estimate to job)** You "land on the job page 'where you can add or remove services as needed'." Whether the job type can be changed during the copy is not stated, and editing the job type of an existing job is not documented in the pages I fetched. | **The estimate or job is created at convert and copied from the lead.** "A copy of the estimate remains on file." The pipeline board then needs the new card moved forward by hand **(search snippet)**. |
| ServiceTitan | **(fetched)** Open the lead, click "Convert Lead", choose "whether to copy existing lead notes to the customer or location record", then Continue to the Calls screen. "You can't book a job from the Leads tab", so the job is booked on the Calls screen under the Customer tab. | The CSR chooses the job type, business unit and campaign when booking: they "choose the Job Type, Business Unit, and Campaign." Customer match is not described: if the lead was attached to a customer and location, "the location will be pre-selected for you", else you "create the customer and location records if needed." | **(fetched)** "The job type for web bookings defaults to Unknown. Reclassify it after confirming details with the customer." So a web request lands with a placeholder type. | Before dispatch: "update the job type, technician assignment, or appointment window before dispatching." After dispatch is not stated. | **The job is created at convert** (booked from the Calls screen). The lead then "disappears from the Follow Up screen" and can be found under Search. Canceling the job "doesn't reopen the lead." Estimates are a separate path from a sales visit, covered in the earlier doc. |
| Square Appointments | A customer's request waits as pending when the business has turned on "Business must accept or decline all appointment requests" **(search snippet)**. **(fetched)** "Click Accept or Decline." | **(fetched)** After choosing, "Select a notification type, email or text, and enter an optional message." Whether the service, staff or time can be changed before accepting is not stated. | Not applicable: a booking always names a service. | Not stated. | No quote. The request is the appointment. |
| Pipedrive (Leads Inbox) | **(fetched)** "Convert to deal" on a lead, or "Convert to deals" on selected leads. After you confirm, the leads "will be deleted and replaced by deals in the specified pipeline." | The person and organization, and any notes, mentions, comments and activities carry over. What is chosen in the convert dialog besides the pipeline is not described. The comparison table says a lead has "Link to projects and products: No", so a lead cannot hold products, and does not go in a pipeline or stage until converted. | Not stated. | Not stated. | Lead first (a held record), deal created at convert, lead removed. |
| Salesforce (a neutral convert screen, not field service) | **(fetched)** The convert screen lets you relate the contact to "an existing account in Salesforce, or an account that you create", and select or create the contact. | **An opportunity is optional**: it is created only if the lead "results in a deal that looks promising", with a name entered or an existing one selected. | Not applicable. | "You can't reverse a lead conversion." | The deal record is optional at convert. |
| Linear triage (a neutral inbox, not field service) | **(fetched)** Four actions: accept, decline, mark as duplicate, snooze. "Accepting an issue will offer the option to leave a comment and then move the issue to your team's default status." | Whether fields can be edited while accepting is not stated. Its overview says Triage is for reviewing, updating and prioritizing "before they are added to your team's workflow". | Not applicable. | Not stated. | Accept moves the item out of the inbox into the normal workflow, the same shape as Trailhead's rule that a request moves into the job. |

### What the systems agree on

1. **The convert step carries the customer and place, and the work is built after it.** In Jobber and Housecall Pro the new quote, estimate or job is a fresh record. Jobber says outright that the request's information does not transfer into the line items. ServiceTitan books the job on a separate screen. In none of the pages I fetched does the convert step lock the requested service.
2. **A wrong service is fixed on the new record, not before.** Housecall Pro's job page is where you "add or remove services as needed". Jobber's quote is where line items are filled out. ServiceTitan lets the job type change before dispatch. None of the fetched pages describe changing the service on the lead or request itself before converting, except that Jobber and Housecall Pro let you put line items or a job type on the lead or request first, which is an option, not a step.
3. **A placeholder for "we do not know yet" is normal.** ServiceTitan's web bookings arrive with job type "Unknown" and the CSR reclassifies after talking to the customer. Housecall Pro's lead list does not even show job type. Jobber's list shows a free-text title. No page I fetched requires a classified service to exist before a record exists.
4. **Converting early is allowed.** Jobber's request can be converted without an assessment. Salesforce makes the deal optional. Nothing in the fetched pages forces a quote to be priced first.
5. **The held record leaves the inbox when converted.** Pipedrive deletes the lead, Linear moves the issue, ServiceTitan's lead leaves Follow Up, Jobber marks the request Converted. This matches what Hannah already decided for Trailhead.

### What the systems do not settle

- **No page said what the inbox row shows when no service was given.** Jobber's list shows the request's title. Housecall Pro's list has no job type column. The answer for Trailhead's "Asked for: Not said" cannot be copied.
- **No page said whether the convert step can change the service.** The evidence is about what happens after: the work is built, or reclassified, on the new record.
- **Whether Jobber lists "Requested services" is not verified.** I did not find that label on the pages I fetched. Jobber's request page names a "Request title", "a section for service details" and a Product / Service section for line items. A search result said the request's service details "remain viewable" while a quote is built, but that came from a search summary and I did not see it on a fetched page.
- **How an empty "service" is handled in Jobber is not stated.** Jobber's request article does not say what happens when a client leaves it unspecified.
- **Neutral UX evidence is general only.** Nielsen Norman Group's EAS framework says "Remove questions that are nonessential, nonurgent, or irrelevant", and "Not every question needs to be asked immediately", "If it can wait, postpone it." That supports asking only for what the next step needs. It does not say which questions a convert step needs, and it was written about forms for customers, not office tools.

## 3. Options for Trailhead

All four keep the rules already decided on Nov 20: a request is New, Seen or Archived, making the job moves the request into it, nothing is sent to the customer by converting, and Send a quote is what sends something. The differences are what Ryan chooses at the convert step, where the service can be changed, and where the quote is built.

The four cases below are the same in every option.

- **Rosa** asks for Christmas lights and it is right. She is a new person, and Christmas lights has no catalogue price.
- **Ben** names no service. Taking the sample list, Ben's words are spam and he would be archived; to test the flow, treat him as a real person whose message says "Can you look at my sprinklers?" and names no service.
- **Kevin** asks for sprinkler repair (a $145 visit in the catalogue). His words say two zones have low pressure and a neighbor guessed at valves, so it is really a larger repair or maybe a Rachio install. In the prototype's fixtures Kevin asked for the larger repair; here I vary it to test a wrong-but-priced service.
- **A service Trailhead does not offer.** June asks "Do you also mow lawns?" Lawn mowing is not in the catalogue.

### Option A: a short convert sheet, then continue

**What it is.** Create job and Send a quote each open one convert sheet in place of today's small dialog. The sheet has three things. The customer (the match, or add as new, as today). **"What is this for?"**, a required select from the active catalogue plus one entry "Something else", preselected when the request named a catalogue service and empty when it did not. And the chosen service's price line under it (as New job shows). A chosen service becomes the job's name and its one line. "Something else" asks for a short name and makes a line with no price. Then it continues as today: Create job lands on the new job; Send a quote lands on the job with the quote step open.

**What Ryan sees and clicks.**
- *Rosa.* Opens the request, presses Send a quote (primary, as Christmas lights has no price). The sheet shows "Add Rosa Delgado as a customer", the service "Christmas lights" already chosen, "Quote on site" under it. One click on the sheet's button. She lands on the job.
- *Ben.* Presses Send a quote or Create job. The sheet's service is empty and the button is off until Ryan reads his words and picks "Sprinkler repair visit", or "Something else" and types "Sprinkler check". Then it continues.
- *Kevin.* The sheet opens with "Sprinkler repair visit, $145" chosen. Ryan changes it to "Larger sprinkler repair" before pressing the button. The job is made as Needs a quote with one unpriced line.
- *Not offered.* Ryan either archives June as Not a fit (no customer made) or picks "Something else", types "Lawn mowing" and makes a job to price or turn down.

**What the job and the Requests list look like after.** The job holds the chosen service as its name and line, the customer's words as the first note and the photos. It reads Needs a quote or Unscheduled by the service's price, as now. The request is gone from Requests, and its old address says "This request became a job." The Jobs list shows it under the service Ryan chose, never "Job".

**What the customer is told.** Nothing at convert, as today. Send a quote then sends the quote.

**What it costs to build against the prototype.** Small to medium. One dialog changes (`CreateJobDialog` gains a service select built from the same groups New job already uses, and the button turns off while the choice is empty). `createJobFromRequest` and `jobFromRequest` take the chosen service in place of `request.service`, and the catalogue lookup in `request-catalogue.ts` is called on the chosen service instead of the requested one, which also fixes the name-matching problem for contact-form strings. The page's primary button still reads the request's service, so a request with no service leads with Send a quote as now, and the sheet's choice does not change which button was pressed. Existing tests and stories for the two dialogs change. The job page is unchanged, so this option alone does not give a way to change the service after conversion.

### Option B: the request page is the quote editor, nothing is created until Send

**What it is.** The request page gains the "What's included" lines. Ryan adds a service and a price on the request. Nothing exists in Customers or Jobs until he presses Send a quote, which creates the customer, the job and the quote together. A request Ryan will not quote is archived or made into a job with Create job.

**What Ryan sees and clicks.**
- *Rosa.* Opens the request, adds a line "Christmas lights, roofline and two trees, $1,400", presses Send. The customer, the job and the quote are made at once and the request leaves the list.
- *Ben.* Adds the line he wants, from whatever he reads in the message. No service is needed first.
- *Kevin.* Edits the line on the request freely before sending. Nothing downstream is wrong, because nothing has been made.
- *Not offered.* Lines on a request for lawn mowing are possible but the request has no home as a job. He archives it.

**What the job and the Requests list look like after.** The job exists only after Send and reads Quote sent. Before that, the Requests list holds drafts. A request with lines on it needs a new word beside New and Seen, such as "Pricing", or the list is hiding work in progress.

**What the customer is told.** Nothing until Send, then the quote.

**What it costs to build against the prototype.** Large, and it reverses a decision. There would be two places to edit the same lines (the request, then the job), and the draft would need its own store because the quote store is keyed by job id. A request that is partly priced and is still outside Customers breaks the rule that the job holds the lines from the start, and the Nov 20 quote-job research recommended building on the job. Jobber does partly this (line items can go on a request) but still creates a separate quote record at convert; the pages I fetched do not show a system where nothing is created until the quote is sent. I would not choose this.

### Option C: always create the job, with "Needs details" as the service, and let the job page choose

**What it is.** Create job and Send a quote make the job at once with no questions. A request with no service, or one that does not match, becomes a job whose service reads "Needs details". The job page gets a **Change service** action that sets the service and replaces the first line.

**What Ryan sees and clicks.**
- *Rosa.* Same as today, one click, the job reads Christmas lights.
- *Ben.* One click makes a job called "Needs details". He opens it, presses Change service and picks one.
- *Kevin.* The job is made as "Sprinkler repair visit, $145". He opens it and presses Change service to Larger sprinkler repair.
- *Not offered.* "Needs details" job for lawn mowing, then Change service to "Something else" or cancel the job.

**What the job and the Requests list look like after.** The Jobs list holds jobs with no real service, and Needs a quote cannot be told apart from needs details. A job whose service is wrong gets a name that has to be changed in a second place. The customer record exists even for a request that turns out not to be a fit.

**What the customer is told.** Nothing at convert.

**What it costs to build against the prototype.** Medium. The convert dialogs stay as they are, but the job page needs a Change service dialog and the model needs a service that is not in the catalogue. The cost is in the risk: an unknown service is made a customer's job, so the one rule Hannah gave on Nov 18 (nothing enters the system until a person makes the job, a form post is unknown until read) is satisfied only by the button press, and every real but vague request adds a "Needs details" job to the list. ServiceTitan's "Unknown" job type is the closest evidence for this shape, but it is a back-office queue run by a booking team.

### Option D: the convert sheet from A, with the service optional, and Change service on the job

**What it is.** Option A's convert sheet, but "What is this for?" may stay empty. If it does, the job is named from the customer's own first words (or "Job" when there are none), carries one unpriced line and reads Needs a quote. The job page gains **Change service** from Option C, available while no quote has been sent (a sent quote is revised through Revise, as today). So Ryan is asked, once, with a default, and can fix it later.

**What Ryan sees and clicks.**
- *Rosa.* Same as A, one click.
- *Ben.* The sheet opens with the service empty. He may pick one, or press the button anyway and fix it on the job.
- *Kevin.* He corrects it in the sheet, or after on the job with Change service.
- *Not offered.* He archives, or picks "Something else".

**What the job and the Requests list look like after.** As A when a service was chosen. When it was left empty, a job with a plain name and an unpriced line, the same as the prototype does today for an unnamed service, plus a way to repair it.

**What the customer is told.** Nothing at convert.

**What it costs to build against the prototype.** The cost of A plus the cost of C's job-page action, so the largest of the three workable options, with the most states to test (empty service in the sheet, empty service on the job). Its weakness is that an optional choice that is usually skipped becomes the same as the prototype's present gap.

## 4. Recommendation

**Build A, and add Change service to the job page as a second, separate step.** That is A with C's one useful action, without C's "Needs details" jobs and without D's optional service.

What I recommend:
1. Create job and Send a quote each open a convert sheet with the customer and a required "What is this for?", from the catalogue plus "Something else".
2. The service is preselected when the request named a catalogue service and empty when it did not. The chosen service decides the job's name, its line and whether it needs a quote, by the same catalogue price rule as now.
3. The job page gets **Change service** while nothing has been sent. It swaps the job's service and its first line and writes one history line.
4. The quote stays built on the job, as already decided. Nothing in Option B is needed.

**What the evidence supports.**
- The convert step in Jobber, Housecall Pro and ServiceTitan carries the customer and place and does not lock the requested service. Jobber says outright that the request's details do not transfer into the line items, and its quote screen builds them fresh. That supports building the quote on the new record and not on the request.
- A wrong service is fixed on the new record in the pages I fetched: Housecall Pro's job page ("add or remove services as needed"), Jobber's quote line items, ServiceTitan's job type before dispatch. That supports the job-page Change service.
- Converting early with little known is normal. ServiceTitan's web bookings arrive with "Unknown" and Jobber converts without an assessment. That is evidence that conversion does not have to wait for a complete record. It is not evidence that the service should be left empty at conversion.
- The request leaves the inbox when converted in every system that has an inbox I fetched.

**What is judgment.**
- That the service should be **required** at the convert step. The evidence shows other systems allow a placeholder or free text. I recommend a required pick because Trailhead's catalogue has about ten services, one price list and no free-text line items in the New job sheet, so a picker is cheap, and because the pick decides whether the job needs a quote. Ryan has also read the customer's words before pressing the button. If Hannah would rather Ryan can skip it, that is Option D.
- That "Something else" is a catalogue entry. No fetched system has one; Jobber uses free-text line items. I suggest it so that a request for something unlisted does not have to be thrown away.
- That the Change service action stops once a quote is sent. That follows the rule that a sent quote is a frozen copy and a change is a revision, but no fetched source covers it for a request.
- That the primary button keeps coming from the request's service, not from the sheet's choice. It is simplest and costs nothing, but it can show Send a quote as primary and then have Ryan choose a priced service in the sheet.
- Option B was set aside mainly on cost and on the Nov 20 decision, not on evidence. No page I fetched shows a system where nothing is created until the quote is sent.

**One thing I could not check.** I could not confirm how Jobber handles a request that names no service, or what its inbox row shows. Hannah's Jobber account is the fastest way to check: ask what a request with a blank service looks like in the list.

## 5. Questions for Hannah

Ask in this order. Each is one decision with a default.

1. **When Ryan makes a job from a request, should he have to say what the job is for?** Default: yes. He picks one service from the list when he presses Create job or Send a quote. It is already chosen when the person named a service, and empty when they did not. The list ends with "Something else" so he can type his own.
2. **If he picked wrong, can he change it afterwards, as long as no quote has been sent?** Default: yes. The job gets a Change service button that swaps the service and its first line. Once a quote is out he revises the quote instead.
3. **When someone asks for something Trailhead does not do, like mowing lawns, what should happen?** Default: Ryan archives it as Not a fit and nothing is sent to the person, as the prototype does now. The other choice is that he can make a job from it with "Something else", for example to price a one-off. I did not look at whether to send the person a reply, and I am not proposing a message or a promise of one.

## Sources

Fetched pages (the fetch tool summarized each; quoted words are from its summary):

- Jobber, converting a request to a quote or job: https://help.getjobber.com/en/articles/converting-a-request-to-a-quote-or-job/
- Jobber, request basics: https://help.getjobber.com/en/articles/request-basics/ and https://help.getjobber.com/hc/en-us/articles/115009737048
- Jobber, requests list page and key metrics: https://help.getjobber.com/es/articles/requests-list-page-and-key-metrics/
- Jobber, schedule an assessment: https://help.getjobber.com/en/articles/schedule-an-assessment/
- Jobber, converting a quote to a job: https://help.getjobber.com/es/articles/converting-a-quote-to-a-job/
- Jobber, quote basics: https://help.getjobber.com/en/articles/quote-basics/
- Housecall Pro, how to create a lead (Job Fields on leads): https://help.housecallpro.com/en/articles/16889869-how-to-create-a-lead
- Housecall Pro, how to copy or convert jobs and estimates: https://help.housecallpro.com/en/articles/2883009-how-to-copy-or-convert-jobs-and-estimates
- Housecall Pro, pipeline FAQs (lead assignment and board sync only): https://help.housecallpro.com/en/articles/6185346-pipeline-faqs
- ServiceTitan, convert a lead to a job: https://help.servicetitan.com/v1/docs/convert-a-lead-to-a-job
- ServiceTitan, book jobs and schedule appointments: https://help.servicetitan.com/residential-s-r/docs/book-jobs-schedule-appointments
- ServiceTitan, call booking home (leads and job type configuration only): https://help.servicetitan.com/residential-s-r/docs/call-booking-home.md
- Square, accept or decline appointments: https://squareup.com/help/us/en/article/8444-accept-or-decline-appointments
- Pipedrive, leads vs deals: https://support.pipedrive.com/en/article/leads-vs-deals
- Salesforce, convert leads: https://help.salesforce.com/HTViewHelpDoc?id=leads_convert.htm
- Linear, triage: https://linear.app/docs/triage
- Nielsen Norman Group, the EAS framework: https://www.nngroup.com/articles/eas-framework-simplify-forms/

Search snippets only (not opened, or the article returned 404 on a direct fetch):

- Housecall Pro lead "Mark Lead as Won" with Copy to Estimate and Copy to Job, and the pipeline card then being moved by hand: https://help.housecallpro.com/en/articles/9001031-how-to-create-and-manage-leads (404 when fetched directly) and https://help.housecallpro.com/en/articles/9001031-leads-overview (404)
- Jobber, request service details staying viewable while a quote is built, and Converted showing a reference to the new record: search summaries of https://help.getjobber.com/en/articles/converting-a-request-to-a-quote-or-job/ and request basics. The converting article's own fetched text did not state what happens to the request afterwards; the request basics article says "Converted" is "a final status".
- Square, "Business must accept or decline all appointment requests": https://squareup.com/help/us/en/article/5351-manage-your-square-appointments-account-settings (search result)

Fetched and failed, or not usable: Jobber community "Online booking, losing request info" (403), Pipedrive "converting leads to deals" (404), Square "appointment requests" 5593 (returned an unrelated article), Salesforce articleView link (error page).

Repo files read: `docs/plans/2026-11-20-requests-and-quotes-research.md`, `docs/plans/2026-11-20-quote-job-relationship-research.md`, `src/app/(admin)/admin/_screens/design/requests/` (`RequestPage.tsx`, `RequestDialogs.tsx`, `request-catalogue.ts`, `request-model.ts`, `request-store.ts`, `RequestsList.tsx`), `design/quotes/quote-model.ts` and the quote job page, `design/walkthrough/WalkRequests.tsx`, `_screens/NewJob.tsx`, `_screens/NewJobService.tsx`, `src/lib/booking/services.ts`, `src/lib/services.ts`, `src/app/api/contact/route.ts`, `src/app/(site)/contact/page.tsx`.
