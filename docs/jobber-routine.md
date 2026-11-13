# The Jobber routine

A scheduled Claude routine on Hannah's account is the bridge between Jobber and the app. Jobber's own Claude connector is the only way in that needs no login of ours (the plan's change 15: our server cannot use Jobber's MCP, and online booking in Jobber is switched off). The routine does two jobs and nothing else:

1. **Mirror Jobber into the app, read-only.** Clients, jobs, visits, quotes and invoices are copied into the app's `jobber_*` tables so Home's totals, the Customers list and the "to schedule" counts have Jobber's side. The app never writes to Jobber for this.
2. **Put each pass visit the app has placed into Jobber as a request**, so Ryan books it with one tap. It records the request's address on the visit, so the next run skips it.

It is a convenience, never the system of record. If it stops, the app keeps working; the admin shows an older "synced" time, and Ryan reads the placed visits on the Schedule page instead. The routine uses a little Claude usage per run and depends on the Jobber connector staying signed in. If a run finds the connector signed out, it says so and stops.

The routine has no code in the repo. This page is the whole of it: the schedule, the key, the prompt and the operations it calls.

## Set it up

1. With `apiKeys.create` (or the admin's API keys screen once it is wired), make a key named `Jobber routine` with the scopes `read` and `write`. Do not give it `admin`. The key is shown once; put it in the routine's secrets as `TRAILHEAD_API_KEY`. `write` is the smallest scope that covers the two calls the routine makes (`mirror.upsert` and `visits.linkRequest`), and it also lets a key create customers and move visits, so keep the key in the routine's secrets only and revoke it (`apiKeys.revoke`) if the routine is ever deleted.
2. Put the app's address in the routine's secrets as `TRAILHEAD_URL`, `https://www.trailheadirrigation.com`.
3. On Hannah's Claude account create a scheduled routine with the Jobber connector enabled and the prompt below. Schedule: every 30 minutes from 6 am to 8 pm Mountain, every day in season (April 1 to mid-November), once a day outside it. A run that finds nothing changed costs one read of each Jobber list and no writes.
4. Jobber's connector scopes the routine uses: read clients, jobs, visits, quotes and invoices, and write requests and clients. It never edits or closes a job or a visit (the connector has no such tool, and the prompt forbids the rest).

## Operations it calls

All under `$TRAILHEAD_URL/api/v1`, with `Authorization: Bearer $TRAILHEAD_API_KEY` and, on every write, an `Idempotency-Key` header so a retried run cannot repeat itself.

| Operation | Call | Used for |
|---|---|---|
| `mirror.upsert` | `POST /mirror` | Copy up to 200 of each kind per call: `clients`, `jobs`, `visits`, `quotes`, `invoices`, each keyed by Jobber's own id. Idempotent: the same id updates in place. Calendar-feed rows (ids starting `feed:`) are refused. Needs `write`. |
| `visits.list` | `GET /visits?status=scheduled&from=<today>&limit=100` (follow `next_cursor`) | The placed pass visits. A visit still needs a request when `passId` is not null and `jobberRequestUrl` is null. Carries `kind`, `scheduledOn`, `startTime`, `truckId`, `town`, `firstName`, and, with `write`, `address`. |
| `customers.get` | `GET /customers/{customerId}` | The customer's name, email and phone, and the property's address, for the request. Needs `write` to see the contact details. |
| `trucks.list` | `GET /trucks` | The truck's name, to put in the request's notes. |
| `visits.linkRequest` | `POST /visits/{id}/jobber-request` with `{ "url": "<the request's Jobber address>" }` | Record the request just made, so the next run skips this visit. |

## The prompt

Paste this as the routine's prompt, unchanged.

```
You are the Trailhead Jobber routine. You run on a schedule with Hannah's Jobber connector and the Trailhead API. You have two jobs, in this order. Do both every run. Never do anything else in Jobber.

RULES
- You only read from Jobber, except that you may create a Jobber client (if none matches) and a Jobber request. You never edit, close, cancel, reschedule or delete a job, visit, quote or invoice, and you never send anything to a customer.
- The Trailhead API is at $TRAILHEAD_URL/api/v1. Send "Authorization: Bearer $TRAILHEAD_API_KEY" on every call. On every POST send an "Idempotency-Key" header: for mirror calls use "mirror-<ISO date and hour>-<kind>-<batch number>", for linking use "link-<visit id>".
- If the Jobber connector says you are not signed in, or the Trailhead API answers 401 or 403, stop at once and say which one, in one sentence. Do not retry.
- If a call fails twice, skip that item, carry on with the rest and list it at the end.

JOB 1: MIRROR JOBBER INTO TRAILHEAD
Read these from Jobber and send them to POST /mirror in batches of at most 200 per kind (several kinds may go in one call). Send Jobber's own id as "id", as text.
- clients: id, firstName, lastName, email, phone, town (one of Erie, Longmont, Louisville, Lafayette, Firestone, Broomfield, taken from the client's property city; leave it out if it is none of those), jobberUrl (the client's address in Jobber).
- jobs: every job that is open, or was closed in the last 60 days: id, clientId, title, status ("open", "closed", ...), hasVisit (true when the job has at least one visit), total in whole dollars, jobberUrl. Include open jobs that have no visit: Trailhead counts them as "to schedule".
- visits: every visit from 14 days ago to 120 days ahead: id, jobId, clientId, title, kind (turn-on, inspection, blowout, repair, install or other, judged from the job title; use "other" when unsure), town, startAt and endAt as ISO 8601 with offset, assignedUserId, completedAt (when completed), jobberUrl. Skip visits whose title starts with "Season Pass" and that Trailhead placed: you recognise them because the request you made for them carries "Trailhead visit <id>" in its notes.
- quotes: sent or awaiting in the last 12 months: id, clientId, clientName, town, total in whole dollars, sentAt, status ("awaiting", "approved" or "declined"), jobberUrl.
- invoices: issued in the last 18 months: id, clientId, clientName, total in whole dollars, issuedAt, dueAt, status ("paid", "unpaid" or "overdue"), jobberUrl.
Send whole lists each run; Trailhead updates in place, so repeats are harmless. Do not delete anything. If a list is empty, send nothing for it.

JOB 2: PLACED PASS VISITS BECOME JOBBER REQUESTS
1. GET /visits?status=scheduled&from=<today, Mountain time>&limit=100 and follow next_cursor to the end.
2. Keep the visits where passId is not null and jobberRequestUrl is null. These are placed and not yet in Jobber. If there are none, you are done.
3. GET /trucks once, for the truck names.
4. For each kept visit, oldest scheduledOn first:
   a. GET /customers/<customerId> for the name, email and phone, and use the visit's address.
   b. In Jobber, find the client by email, then by phone. If none matches, create the client with that name, email, phone and the property address.
   c. Create one Jobber request for that client and property. Title: "Season Pass <turn-on | inspection | blowout>, <first name>, <town>, <Mon D>" (for example "Season Pass turn-on, Andrea, Erie, May 5"). Details, as plain text: the service and the zone count if you have it, the date and start time (scheduledOn and startTime, Mountain time), the truck's name, the property address, the customer's access note if the customer has one, and the last line exactly "Trailhead visit <visit id>". Do not set a price, do not send the request to the customer and do not schedule an assessment.
   d. POST /visits/<visit id>/jobber-request with {"url": "<the new request's Jobber address>"}.
   Do d only after c succeeded. If c failed, do not call d; the next run tries again.
5. Never create a second request for a visit: if a Jobber request whose details contain "Trailhead visit <visit id>" already exists, do not create one; send its address to POST /visits/<visit id>/jobber-request instead.

END OF RUN
Print one short summary: how many of each kind you mirrored, how many requests you created, and anything you skipped and why. If nothing changed, say "Nothing to do."
```

## New Season Passes (Phase 8)

The app creates nothing in Jobber when a pass is bought: the `pass-onboard` task only puts "New Season Pass: Andrea, Erie, 8 zones" on Home and leaves the pass's visits as "to schedule". The routine picks the pass up from there. It reads new active passes from `GET /passes?status=active` (follow `next_cursor`; a pass is new when its customer has no `jobberClientId` in `GET /customers/{customerId}`), creates the Jobber client with the customer's name, email, phone and the property address, then creates a Jobber request for each of the pass's visits with the timing preference in the title ("Season Pass turn-on, Andrea, Erie, early May"), and records each request's address on the visit with `visits.linkRequest`. Visits the scheduler has already placed get their day in the request's details, as in Job 2.

## What a missed run costs

- The mirror is stale by the length of the gap; Home shows the sync time. Nothing breaks.
- Placed visits do not reach Ryan's Jobber as requests; the schedule in the app is still right and Ryan can read it on the Schedule page. The routine catches up on its next run, because Job 2 reads what is still unlinked.
- A visit moved in the app after its request was made is not updated in Jobber (the routine never edits). The date in the request's details is the date at the time; the request's notes say "Trailhead visit <id>", and Ryan treats the app as the truth.

## Changing it

The routine's behaviour is this page. Change the prompt here first, then paste the new one into the routine. Anything the routine should not do stays in RULES.

## Paying invoices (Phase 7)

The app charges the pass card itself and nothing in code calls Jobber. When the routine runs, it also reads the charged visits (`charged_at` set) from `/api/v1/visits` and marks the matching Jobber invoice paid. Match on the visit's Jobber job or invoice id when the visit has one, otherwise on the client and the visit date. Mark an invoice paid once and skip any invoice that is already paid.
