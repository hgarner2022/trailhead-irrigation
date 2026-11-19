# How a job and a visit should relate on screen

Written 2026-11-18. Research only. Nothing was built and no code was changed. The invoice half of Hannah's question is in `docs/plans/2026-11-18-invoice-workflow-research.md`.

Word decided by Hannah tonight: the job panel's and customer panel's "Money" section and the Jobs grid's "Money" column are called **Billing** (Jobber's word; Settings already has a Billing tab). This doc says Billing for that section everywhere.

## 0. Why this exists

Tonight Hannah opened a one-visit Repair job and saw a job panel whose primary button was "Open visit", then a visit panel behind it. She then looked at Jobber's own job page ("Close job with incomplete visits? Complete 1 past visit / Remove 1 incomplete visit", "Show Late Visit", a visit modal with "Mark Complete" and a "Job # 36" link back) and said: "If you're on a job, you have to close the visits first. The relationship is still pretty confusing." Earlier: "a visit is one trip to the house", "Visits are hella confusing", "I'm probably going to get a job right from the scheduling page", "Customer service always comes first". Her second message: "The information on the jobs is confusing. We do need that relationship a little bit clearer in that workflow."

Two things she has said look opposed. Earlier on Nov 18 she sent Jobber's job page as "more what we want" (everything about the work on one page, actions inline). Tonight she finds Jobber's job and visit split confusing. The reading that fits both: she wants Jobber's content without Jobber's two layers and its "close the visits, then close the job" chore. This doc takes that reading and asks her to confirm it.

How this was researched: help-centre pages were fetched and read as text. The research tool returned no product screenshots, so nothing below describes a screen from memory; screens are described from the page's words, and where a page was silent this says so. The only screens seen are the ones Hannah sent.

## 1. What the tools do

### 1.1 Comparison table

| Tool | Words | A one-trip job shows as | How "done" is marked | Does the job close itself | Return trip | Seasonal two-visit package | Where payment is taken |
|---|---|---|---|---|---|---|---|
| Jobber | Job, visit ("each time your team goes to a client's property") | A job holding one visit: two layers, a Scheduled visits table on the job page | Checkmark beside the visit (job page or Schedule), or the completion box in the visit preview and the mobile app | No. More Actions, Close Job. Past incomplete visits: "complete them"; future ones: "remove them". Then the job is Archived, or Requires invoicing | New Visit on the job; editing the schedule regenerates incomplete visits | A recurring job: visits on a repeating schedule, invoiced per visit, weekly or monthly. The job type cannot be changed after creation | Invoice, from the job (Generate Invoice); several per job, and they do not close it |
| Housecall Pro | Job (the scheduled event), appointment (optional setting), segment, service plan | One thing: the job is the trip | On my way, Start, Finish by the tech. Appointments have no status; Finish marks the whole job complete | Not applicable to one trip: Finish ends it | An appointment on the job (one invoice), a segment (own job page, own invoice), or a new job | A service plan on the customer; each plan visit is linked to its own ordinary job and shows as a line on that job's invoice. Recurring jobs make one independent job per visit | Invoice per job; plan payments are separate from job payments |
| ServiceTitan | Job, appointment (commercial: work order) | A job with one appointment | The tech marks the appointment done; on the last one the app routes to Complete Job | Completing the last appointment completes the job. Early completion turns unused appointments to "Unused" | Add Appointment on the job record (permission off by default), or separate jobs per day under a project | Recurring service events and memberships (not read in detail) | One invoice per job, open until the job is complete |
| Service Fusion | Job, site visit | A job with one visit | A site visit is marked Completed | Yes in one case: completing a visit on a Partially Completed job sets the job to Completed, "ready for invoicing" | Add Site Visit on the job (date, window, duration, techs) | Repeating jobs, with their own dashboard | Invoice after the job is Completed |
| FieldPulse | Job, site visit | A job; site visits only when added | Each site visit has its own status (New, In Progress, On The Way, Pending, Completed, Canceled) | Not stated in the page read | Add Site Visit at the bottom of the job record | Recurring jobs (not read in detail) | Not stated in the page read |
| Workiz | Job, service plan visit | A job | Not found | Not found | Not found | After the plan is paid, the visits are generated, appear on the schedule beside jobs, and a visit is converted into a job | Plan paid up front; job invoices separate |
| Zenbooker (scheduling first) | Job (one appointment), recurring booking (the series) | One thing: the job is the appointment | Job marked complete | Not applicable | Book a new job | The recurring booking holds the series; each occurrence is a job, edited alone. The first four jobs are made, more added over time | At booking or on the job |

Square Appointments was not researched; Zenbooker stands in as the scheduling-first tool.

### 1.2 Sources, per product

Jobber
- Job basics: https://help.getjobber.com/en/articles/job-basics/ (visit vs job, one-off up to 20 visits, recurring, checkmark, Close Job, Requires Invoicing, Generate Invoice)
- What if a job gets canceled: https://help.getjobber.com/en/articles/what-if-a-job-gets-canceled/ (Close Job: complete past visits and remove future ones, or remove all incomplete visits)
- Visits: https://help.getjobber.com/es/articles/visits/ (visit types scheduled, anytime, unscheduled; completing keeps jobs from showing "Late")
- Not found: any Jobber page saying the job closes by itself when its last visit is completed.

Housecall Pro
- Appointments vs. segments vs. recurring jobs: https://help.housecallpro.com/en/articles/12892543-appointments-vs-segments-vs-recurring-jobs
- Multi-day job appointments overview: https://help.housecallpro.com/en/articles/6930497-multi-day-job-appointments-overview ("There is no option currently to finish the appointment." Finishing marks the entire job complete.)
- Schedule service plan visits: https://help.housecallpro.com/en/articles/3075085-schedule-service-plan-visits
- Scheduling, invoicing and payments training: https://help.housecallpro.com/en/articles/4372680-scheduling-invoicing-and-payments-training (On my way, Start, Finish; from search summary)

ServiceTitan
- Appointments, multi-job workflow: https://help.servicetitan.com/docs/appointments-multi-job-workflow ("book one job and create a separate appointment for each day of work", one invoice)
- How to handle multi-day jobs: https://help.servicetitan.com/how-to/how-to-handle-multiday-jobs
- Complete an appointment in the Field Mobile App: https://help.servicetitan.com/v1/docs/complete-an-appointment-in-fma (last appointment routes to Complete Job; from search summary)

Service Fusion: https://servicefusion.zendesk.com/hc/en-us/articles/360001137631-Creating-Additional-Site-Visits

FieldPulse: https://help.fieldpulse.com/using-fieldpulse/work/site-visits

Workiz: https://help.workiz.com/en/articles/6828243-converting-service-plan-visits-into-jobs (the page itself returned an error to the fetch tool; the facts come from the search summary, so they are second-hand)

Zenbooker: https://help.zenbooker.com/en/articles/1721048-recurring-bookings-overview

### 1.3 What the tools agree on, and where Jobber stands alone

1. **Every tool has a layer for repeat trips and hides it in the common case.** Housecall Pro keeps appointments behind an admin setting. ServiceTitan books one appointment, or one job per day. Service Fusion says site visits are for "not consecutive" dates.
2. **Finishing the last trip finishes the job** in ServiceTitan, Service Fusion and Housecall Pro. Jobber is the outlier: completing visits does not close the job; you do a second step (Close Job) and a dialog asks what to do with leftovers. Jobber's own page says that dialog exists for work "you never marked complete" or visits "you never did".
3. **A seasonal package is a plan on the customer that makes jobs** in Housecall Pro, Workiz and Zenbooker, and a recurring job with visits in Jobber. Where each occurrence is its own job, the invoice is per occurrence.
4. **Money sits on the job or the invoice, never on the trip,** except where the job is the trip.
5. **The schedule shows trips labelled by their job.** FieldPulse shows an unscheduled visit as "Job Title: Site Visit Title"; Housecall Pro puts plan visits "on the schedule beside jobs".

## 2. The mental models

Sources: https://www.nngroup.com/articles/progressive-disclosure/, https://www.nngroup.com/articles/recognition-and-recall/, https://www.nngroup.com/articles/flat-vs-deep-hierarchy/, and for objects first (OOUX) a secondary overview, https://blog.logrocket.com/ux-design/object-oriented-ux-ooux/ (the search found no NN/G page on it).

- **Two levels is the practical limit.** NN/G on progressive disclosure: a primary display and one secondary display; more than two levels "usually hurts usability" and users often get lost moving between levels. A job panel that opens a visit panel that opens a payment step is three. Their advice is to simplify first.
- **Show what most people need first; hide the rest behind a deliberate action.** On a one-trip job the trip is the common case, so it should not be a second thing to open.
- **Recognition over recall.** If Ryan must remember that "done" lives one level down and "paid" one level up, that is recall. The information and its action belong together.
- **Objects first.** Start from the nouns the person uses and the relationships between them, then give each its screen. Hannah's noun for Ryan's work is the job at a house. She says "visit" confuses her, a sign the second noun is not earning its place on single-trip work.
- **A parent and child split helps** when the parent has several children worth seeing and acting on separately: a five-day install, a quarterly contract, a two-trip pass, a return trip for extra work. ServiceTitan and Housecall Pro both write this down: one job plus appointments for multi-day work, with one invoice.
- **It hurts** on a single-trip service call, where the parent and child are the same event, so one thing is shown twice and each layer costs a tap and a place to get lost. ServiceTitan names a reporting cost of the split: one job with several appointments "lowers the total count of completed jobs".

Gap: none of these sources measure single-trip against multi-trip service work. "The split hurts single-trip calls" is inference from the two-level rule and from every competitor hiding the layer, not a tested result.

## 3. What a one-truck sprinkler company does in a season

From the repo, not live Jobber. Re-pull before quoting again.

- `docs/plans/2026-11-18-scheduling-engine-design.md` section 9: 466 customer visits in the 2026 replay (599 pulled, less 107 calendar blocks, 1 unscheduled, and visits outside the six towns or for aeration). Ryan averaged 2.81 stops a day on 166 driving days.
- The Nov 12 snapshot (`src/lib/admin/fixtures/snapshot.json`: 488 visits, 375 clients) by kind: 233 blowouts, 138 repairs, 37 turn-ons, 37 inspections, 16 installs, 27 other. Visits per client: 231 clients had 1, 58 had 2, 27 had 3, 8 had 4, and 4 had 5 or more (328 clients with any visit).
- A fall blowout is one trip and nearly always the only one of its kind: just 9 of 233 blowouts belong to a client with a second blowout. Repeats live in repairs: 66 of 138 belong to a client with another repair in the season. The snapshot has no job id, so it cannot say whether those were return trips on one job or separate jobs. That is the one number this research could not get.
- The Season Pass is two trips by design (turn-on and blowout), the July inspection an add-on. 13 passes are in the snapshot, before the pass launched at scale.
- From the Nov 12 Jobber audit: 21 percent of real visits were never marked complete, and 55 open jobs had no visit left. Those are the Close Job chore showing up in the data: people skip it, or delete visits to get out of it.

Plainly: most work is one trip. About 30 percent of clients with a visit (97 of 328) had two or more visits in the season, but most of those are different services (a turn-on, then a blowout), not a return to fix the same problem. The pass is the one planned two-trip job; a return trip on the same job is real but a small share.

To close the gap before building: count Jobber jobs with more than one visit that are not recurring. One `search_jobs` call through the Jobber connector answers it. It was not run here because the brief asked for repo and help-centre research.

## 4. What exists in our code today

From the CLAUDE.md bullets, not read from source:

- A Season Pass is a job, and a job has no typed status. Its stage is derived from facts by `stageOf` (Needs a quote, Quote sent, Open, Done, Canceled), its kind by `jobKindOf`, and its billing by the payment rows. **"Close job" does not exist in our data at all.** The "close the visits first" burden is a screen problem, not a data problem.
- The job panel lists Lines, Visits and the money section (now to be called Billing), with a footer led by "Open visit" when a visit is ahead. A visit has its own panel with Mark done, then "How is this paid?". Opening a record from another shows "‹ Andrea Reyes" above its title, so a visit opened from a job is a second panel one level deeper.

That is the shape Hannah met: job panel, "Open visit", visit panel.

## 5. The three options

The data model keeps `job` and `visit` in all three. What changes is what the screens show and which words are on them.

### Option A. Housecall Pro's way: the job is the trip

**Idea.** What Ryan opens is always one scheduled trip, called a job. The word "visit" never appears. A Season Pass is a plan on the customer that makes two jobs (turn-on, blowout). Billing is on each job.

**Screens.**
- Schedule and Home list jobs (today's visits). Tapping one opens the job page: customer, address, access, lines, notes, photos, Billing.
- The customer page shows a Season Pass card and, under it, its two jobs.
- No visit panel. A return trip is a new job copied from the first.

**Words.** Job, plan (Season Pass), no visit.

**How Done works.** Mark done on the job, then "How is this paid?" on the same page. Nothing to close.

**How a pass works.** The plan makes two jobs, each with its own Billing. The pass card reads "Spring turn-on: Tue May 5. Fall blowout: waiting for your day".

**How a return trip works.** A new job linked to the old one ("Follow-up to Repair, May 5"), with its own price.

**Trade-offs.**
- Plus: one thing on screen, always; closest to how Hannah describes Ryan's work and to her schedule-first habit.
- Plus: Housecall Pro and Zenbooker show it works for small service companies.
- Minus: our model is `job` then `visit`, with lines, invoice and payments on the job. A pass as "a plan that makes two jobs" splits the pass's billing across two jobs and breaks the single pass number, the single invoice and the renewal that points at one job. That is a real data change, and step 6 just removed the separate pass record.
- Minus: a three-day $4,500 install is three jobs, or needs the hidden appointments layer anyway.
- Minus: reports count a pass as two jobs.

### Option B. Jobber's way, done better

**Idea.** Keep the hierarchy Hannah approved on Nov 18 (job page with visits inline, visit view linked back) and remove its two chores: the Close Job dialog and the late-visit prompt.

**Screens.**
- Job page: customer card, facts, lines, a Visits table with Mark done on each row, Billing, notes. Visit actions happen from the row without leaving the page.
- Visit view, opened from the Schedule: the same actions and a "Job 36" link back.
- The job finishes itself when its last visit is done. No Close Job. A job nobody wants any more is Cancel job.

**Words.** Job, visit.

**How Done works.** Mark done on the row or the visit view. If it was the last visit, the job reads Done and the page offers "How is this paid?" there. A past visit not marked done shows "Not marked done" with Mark done and Skip.

**How a pass works.** One job, two visits in the table, the pass card above. This is what we have.

**How a return trip works.** New visit on the job, or a new job if it is new work.

**Trade-offs.**
- Plus: no data change; everything exists. Jobber's content stays the floor.
- Plus: the pass stays one job, one number, one invoice.
- Minus: a one-trip repair still shows two layers (a job with a table holding one visit), the thing that confused her tonight, softened by inline actions but not removed.
- Minus: she said visits are "hella confusing" and this keeps the word on every job.

### Option C. One record for a one-trip job, two layers only when there is a second trip (the fold)

**Idea.** A job with one trip is one page where the trip's facts (day, who, access note, Mark done) are part of the job page. A job with two or more trips (a pass, a return trip, a three-day install) shows a trips list, each row with its own Mark done. The second layer appears only when needed. The data model is unchanged; the screen is chosen by how many visits the job has.

**Screens.**
- One-trip job (repair, blowout, inspection): one page. Header "Repair, Andrea Reyes". Facts: Day (Tue May 5, any time), Who, Where, Gate code. Lines, Billing, notes and photos. Footer: Mark done, then Collect. No "Open visit", because the trip is on the page.
- Two or more trips (the pass): the pass card, then trips as rows (Spring turn-on, Fall blowout), each with its day, who and Mark done. A row expands in place (Jobber's inline pattern); it never opens a second panel.
- Schedule and Home list stops. A stop opens the job page, scrolled to that trip when there are several.
- "Add another trip" on the page is how a return trip is added. The page then becomes the multi-trip form, with the first trip already done in its row.

**Words.** Job; the trip word appears only on multi-trip jobs. Hannah picks it (question 3).

**How Done works.** Mark done on the page (one trip) or on the row (several). The job finishes itself when the last trip is done: no Close Job, no leftover dialog. A past trip not marked done shows "Not marked done" with Mark done and Skip.

**How a pass works.** One job, two trips, as now. Billing stays on the job (pass invoice, card, renewal). The pass card sits above the trips.

**How a return trip works.** "Add another trip" on the job. For new billable work, New job for the same customer.

**Trade-offs.**
- Plus: matches how tools hide the layer while keeping one job and one invoice for the pass and the install (ServiceTitan and Housecall Pro both argue for that).
- Plus: removes her exact complaint (one trip, two things) without touching the pass.
- Plus: same data, no migration.
- Minus: two layouts to keep consistent. The trip block must be one component used inline in both, so the design gate can hold one recipe.
- Minus: a job changes shape when its second trip is added; plain words are needed ("This job now has two trips").
- Minus: a multi-trip job opened from the Schedule is a bigger page than a tech needs on a phone; mitigation is to scroll to and highlight the trip first.

## 6. Recommendation

**Option C, with Option B's two rules built in: the job finishes itself, and actions happen where the trip is, never behind a second panel.**

From the research:
1. Every tool researched hides the second layer in the common case, and Jobber alone makes you close a job after finishing its last visit. Three of the four tools that document it finish the job when the last trip finishes.
2. NN/G's two-level limit and recognition over recall argue against a job panel that sends you to a visit panel for the obvious step.
3. Our data: most work is one trip (233 blowouts, nearly all single), the pass is the only planned two-trip job, and 21 percent of visits were never marked complete while 55 jobs were emptied of visits in Jobber, the Close Job chore showing up in the numbers.

From her words:
- "A visit is one trip to the house", "I don't know if I like visits": the word leaves the one-trip case.
- "I'm probably going to get a job right from the scheduling page": a stop on the Schedule opens what she thinks of as the job.
- "If you're on a job, you have to close the visits first": the job closes itself.
- "Consistent, plain, best in class": one recipe, the trip block inline.

Why not A: the pass as a plan that makes two jobs breaks one pass number, one invoice and the renewal, and a three-day install needs the hidden layer anyway. Why not B alone: it keeps what confused her, a job holding a table with one row.

**What it changes in the data model: nothing.** `job` keeps its visits, lines and payments. Stage is already derived (`stageOf`), so "the job finishes itself" is a screen rule over the same facts. One thing to confirm by reading `stageOf` before building (not done here): that a job whose last visit is done already reads Done with no extra action. If so, auto-close needs no code change; if not, it is a derived rule, never a column. Small optional additions only if she wants them: Skip on a past visit that is not done (a pass visit already has `skipped`), and a plain trip word.

## 7. Questions for Hannah, in the order to ask

One at a time; each answer can change the next.

1. **When Ryan opens a one-trip job (a repair, a blowout), should he see one page with the trip on it, or a job page with a visit behind it?** Options: one page (Option C); a job page with the visit actions inline on a row (Option B); a job that is the trip with no visit anywhere (Option A). Default: one page.
2. **Should a job close itself when its last trip is done, with no "Close job" step at all?** Options: yes, and a past trip not marked done shows Mark done or Skip; or keep a Close job button like Jobber. Default: closes itself.
3. **What should one trip be called on a job that has more than one?** Options: "visit", "trip", or just the service name ("Spring turn-on", "Fall blowout", "Return trip"). Default: the service name on each row, and no trip word at all on a one-trip job.
4. **For a Season Pass, one job with two trips, or two jobs under a plan on the customer?** Options: one job with two trips (one number, one invoice, one renewal), or two jobs each with its own billing. Default: one job with two trips.

Left out on purpose because they are builds, not choices: how a return trip is priced, where "Add another trip" sits, the exact wording of the fold.

## 8. What was not found

- Workiz's own page on a multi-visit job and its Done behaviour (the fetch failed).
- Whether Jobber closes a job by itself after its last visit; no Jobber page says either way.
- Screenshots of any competitor screen from the help pages.
- Jobs per visit in our data (the snapshot has no job id).
- Square Appointments was not researched.
