# Data audit: legacy, two truths and bugs (Nov 19 2026)

Read-only audit of the data side of the admin (`src/db/schema.ts`, `drizzle/0000` to `0026`, `docs/DATA_MODEL.md`, `src/lib/jobs`, `src/lib/pass/facts.ts`, `src/lib/money`, `src/lib/admin/{live,shape}.ts`, `src/api/v1/*`, `src/lib/scheduling/*`). No code changed. Nothing was run: every finding is from reading the code and the SQL, so each has a file and line to confirm against. "7b" is the scheduling-engine step that lets services carry their own dates and gives busy time a table of its own.

Severity: **bug** (wrong result or a dead end today), **two truths** (one fact stored or computed twice, readers can disagree), **legacy** (nothing reads it, or only old code), **tidy** (naming, scale, hygiene). When: **now**, **7b**, **Jobber exit**.

## 1. The top of the list

| # | Sev | Where | What | Fix | When |
|---|---|---|---|---|---|
| 1 | bug | `quote_sent_on`, `quote_accepted_on` (`src/db/schema.ts:294-295`); `src/lib/jobs/stage.ts:41-44`; `src/api/v1/jobs/handlers.ts:98` | **Nothing ever writes the two quote dates, and nothing sets `sold_on` on a job made with `needsQuote`.** A quote job can be priced (`lines.update`) and visited, but stays "Needs a quote" forever (`stageOf` line 42 fires while `sold_on` and `quote_sent_on` are both empty), the customer's account never lists it (`portal/load.ts:40` requires `sold_on`), and `visits.pick`, `areaDays` and `cancelSelf` refuse it ("This job is not open", `visits/handlers.ts:264`, `portal/cancel.ts:48`). The "Quote sent" stage is unreachable. | Add `jobs.sendQuote` (writes `quote_sent_on`, event) and `jobs.acceptQuote` (writes `quote_accepted_on` and `sold_on`, event `job.sold`); until then, the first priced line or first visit on a quote job sets `sold_on`. | now |
| 2 | bug | `stageOf` `src/lib/jobs/stage.ts:38`; `portal/cancel.ts:50-60` | **A job that holds a payment reads Canceled.** `cancelSelf` deliberately leaves a paid job open (`cancelledAt` stays null), but `stageOf` returns "cancelled" whenever every visit is canceled or skipped. The job stage, the Jobs filter and `jobKind` consumers say Canceled for a job that still has money on it and an open invoice path. | Stage Canceled only from `cancelled_at` or all lines canceled; "no live visit" with a held payment is Open (needs a refund or a new visit). Or make `cancelSelf` set `cancelled_at` and keep the payment rows (money is rows, not the stage). Pick one truth. | now |
| 3 | bug | `src/api/v1/payments/record.ts:69-90` (`recordOfficePayment`) | **A payment on the job as a whole (no `visitId`) has no cap and no state check.** The over-payment and "already paid" checks run only when `visitId` is given; a job-level check can exceed what the job owes (`jobMoney` then clamps `owed` to 0 and hides the overpayment), and it is accepted on a canceled job and on a quote job. `paidOn` accepts any day, including a future one. | For `visitId` null: refuse above `jobOwed(...)`, refuse a canceled job, refuse `paidOn` after today (Mountain). | now |
| 4 | bug (two truths) | `src/lib/admin/shape.ts:239` vs `src/lib/portal/words.ts:39` | **The Done repair that reads Fri Nov 20 in the admin and Wed Nov 18 in the account.** The account reads a done visit by `completed_on` (`visitDay`); the admin Schedule, List and day columns read `scheduled_on` (`startAt`). `markClosed` stores `completed_on = today` and leaves `scheduled_on`; a visit done early stays on the Friday column. There is also no validation that `completedOn` is not in the future (`visits/money.ts:23,43`). | One function `visitDay(v)` (done: `completed_on`, else `scheduled_on`), used by the admin List, panel header, Home and the account. The Week/Day grid keeps the scheduled column but shows the done day on the block ("Done Wed"). Refuse a future `completedOn`. | now |
| 5 | bug | `src/lib/scheduling/server/order-day.ts:41`; `src/lib/pass/server/chosen-days.ts:57,79` | **`start_time` on a pass visit is overwritten by `orderDay`.** The customer-held start from checkout is stored in `start_time`, then `orderDay` restacks every pass visit from 08:00. After the day-before text has told a window (`windowTold` is true from the `message_log` row), the next `orderDay` (any move or cancel on that person's day) silently changes the window the customer was told, and no new text goes. | Do not restack a visit whose window was told; or store the stack in `stop_order` and the told window in its own column (`window_start`) written only at the day-before text. See section 3. | 7b |
| 6 | two truths | `settings.windows` (`src/lib/scheduling/*`, `visits/handlers.ts:118`, `daily.ts:73`) vs `service.bookable_from/to` (`src/db/schema.ts:188-189`, `services/handlers.ts:57,107`) | The engine runs on **`settings.windows`, one dated row per kind carrying a calendar year**; services carry MM-DD spans that are mirrored into the window on edit (`mirrorWindow`). Nothing rolls the year: `defaultWindows(2026)` stays 2026 into 2027 (`queueDueRuns` needs `today <= closesOn`, `placeVisit` refuses a 2027 pass visit with "must land between 2026-…", `scheduleVisits` skips `closesOn < from`). A kind has several services (turn-on 8/12/16 zones) but one window, so editing one band's dates changes the window and leaves its siblings stale. Only `schedule.slots` reads the service dates. | Make the service span the truth; derive the dated window per season at read time (`windowFor(kind, season)`), delete `settings.windows` and `mirrorWindow`. | 7b |
| 7 | two truths | `person.season_start/end` (`src/db/schema.ts:138-139`) | Honored by `placeFor` (`place-model.ts:47-48`) and `dayFill`, **ignored by every API reader**: `loadWorld` (`scheduling/server/inputs.ts:27`) does not even load them, so `openSlots`, `scheduleVisits`, `visits.move`, the portal Reschedule, the checkout offer and `schedule.slots` can place a visit on a person who is out of season. | Load them in `loadWorld` and test them in the one availability function (section 3). | 7b |
| 8 | two truths | Day hours: `WORKDAY` 7 to 17 (`src/lib/admin/calendar.ts:125`) vs `person.hours_start/end` null = 9 to 5 (`src/lib/admin/people.ts`) vs `FIRST_STOP` 8:00 (`order-day.ts:9`) | Three day lengths. Capacity minutes and slot starts use 7 to 17 (600 min); `dayFill` "3 h open" uses the person's hours (480 min); `orderDay` stacks from 8:00; `schedule.offerDays` clamps starts to 8:00 (`schedule/handlers.ts:178`). A person with hours 8 to 4 is offered slots at 7:00 and 4:30. | `hours_start/end` is the truth (null means the org default, one constant); `capacityFor`, `openSlots`, `orderDay`, `dayFill`, offerDays all read `hoursOf(person)`. | 7b |
| 9 | bug | `src/lib/admin/live.ts:37,19-21`; `shape.ts` (`waitingVisitIds`, `wasDay`) | Derived facts come from **the newest 5,000 events only** (`EVENT_LOAD`): Waiting on customer, a canceled visit's day, notes, histories. Past 5,000 events a waiting visit silently stops waiting. All other lists are fully loaded and paged in process on every page view (`live.ts:45-58`, `all()` of customers, visits, passes, messages). | Store Waiting on the visit (`waiting_since`), the cancelled day on the visit, and query events per record. Page or scope the org-wide loads. | after 7b |
| 10 | two truths | `visit.customer_id`, `visit.property_id` vs `job.customer_id`, `job.property_id`; `charge.customer_id`, `invoice.customer_id` vs the job | Stored on both sides with single-column foreign keys, so a visit can point at another customer or property than its job; same for `line_item.job_id` vs `visit_id`'s job and `charge.visit_id` vs `charge.job_id`. Nothing enforces equality. | Composite FKs `(job_id, customer_id)`, or drop the duplicate columns and join through the job; add a check query to the migration guards. | after Jobber exit |

## 2. Legacy still in the schema or the settings JSON

"Who reads it" is non-test code found by grep. "Drop" order: stop writing, ship a release that does not read, then a guarded migration (the 0022 pattern: guard raises if anything would be lost, drops after).

| # | Item | Where | Who still reads it | Drop now? | Order |
|---|---|---|---|---|---|
| L1 | `settings.fallTownOrder`, `springTownOrder` | JSON in `organization.settings`; `src/lib/admin/types.ts:505-507`; `settings/handlers.ts:27-28,44-45`; `defaults.ts:41-42`; `seed.ts:68-69` | Nothing but the seed, once, to fill `area.spring_order/fall_order`. No Settings screen edits them; `SchedSettings` has no such field. **Dead, write-only JSON.** | Yes | Remove from the zod schemas and types, then strip the keys in a data migration. |
| L2 | `area.spring_order`, `area.fall_order`; the `area` table | `src/db/schema.ts:150-162`; `calendar.ts areaOrder` | `area` is **live** (day grouping in `openSlots`, `placeFor`, `visits.move`, `schedule.slots`); the orders are read only as a tie-break in `scheduleVisits` sort. | Orders after 7b; table never | 7b ranks by distance and same area: drop the two order columns, keep `area` (towns per day). |
| L3 | `settings.windows` | see #6 | engine, `visits.move`, `daily.ts`, home-model, change-day | After 7b | derive from services; delete `mirrorWindow` and migration 0024's bridge. |
| L4 | `settings.bufferPercentEarly/Late` | `types.ts:501-503`; `calendar.ts capacityFor` | `openSlots`, `scheduleVisits` only. `visits.move`, `placeFor`, `schedule.slots` ignore the buffer on purpose ("Ryan may use the buffer") but never say so on screen. | After 7b if 7b replaces capacity by minutes | decide with the capacity change (section 3). |
| L5 | `person.capacity_by_kind` | `src/db/schema.ts:137` | `capacityAfterBlocks` callers: `visits.move`, `schedule.slots`, `placeFor`, `openSlots` (via `capacityFor`) | After 7b | replace by minutes (the person's hours less booked minutes). |
| L6 | `person.truck`, `routePeople` | `src/db/schema.ts:132`; `people.ts onRoute` | Being "on the schedule" is derived from a free-text label being non-empty. | After 7b | add `person.on_schedule boolean`; keep the label as a display name only. |
| L7 | `person.jobber_user_id`, `calendar_feed_url` | `src/db/schema.ts:133-135` | the Jobber calendar feed (busy blocks) | After Jobber exit | blocks move to `busy_block`. |
| L8 | `job.legacy_pass_id` | `src/db/schema.ts:290,302`; `pass/server/resolve.ts`, `record.ts:50`, `shape.ts:360`, `links.ts:19` | every old link, signed token, Stripe metadata id, alert key | No (keep) | Re-check after the longest token life (pass image and renewal tokens) has passed; one season. Then drop the unique index, then the column. |
| L9 | `message_log.status` values `delivered`, `bounced` | `src/db/schema.ts:68`; `timeline.ts:67` reads `bounced` | Nothing writes them: delivery lands in `delivery_status`/`delivery_error` (`delivery-report.ts:40`). Two truths for one fact. | Values: yes | Read the delivery words from `delivery_status` only; narrow the enum to queued/sent/failed/skipped. |
| L10 | `charge.status = "refunded"`, `charge.method = "bill"` | `schema.ts:66,396`; `payments/schemas.ts:11,13`; `portal/schemas.ts:36,113`; `words.ts METHOD_WORDS` | A refund is a negative row; no code writes either value. `bill` is read by `events/words.ts:181,214`. | Yes | remove from the zod enums, keep reading for old events until a backfill rewrites them. |
| L11 | `Message.passId`, `passId` on `AdminAlert`, `VisitOut.passId`, `PassOut.id` | `types.ts:~470`; `live.ts:73` selects `passId: s.adminAlert.jobId`; `shape.ts:338` | The pass id is the job id now; the alias costs a mapping in every shaper. | After one season | one name (`jobId`) in the screens; keep API alias. |
| L12 | `truckId` / `truckName` | outputs `visits/schemas.ts:41-42,65`, `visits/queries.ts:126-127`; inputs `visits/handlers.ts:32,40,60,106`, `schedule/handlers.ts:93`, `bookings/handlers.ts:26`, `queue/handlers.ts:19`; webhooks `who()` | External readers of the API and webhooks (a season of grace, set Nov 16). | No: one season | After Dec 2027: stop accepting `truckId`, stop sending the alias, announce once through the webhook changelog. |
| L13 | `visit.exception` (jsonb, "moved-in-jobber") | `src/db/schema.ts:332`; `ScheduleParts.tsx:39`, `WeekGrid.tsx:92`, `daily.ts:96` | **No writer exists** (only `placeVisit`/`pick` clear it). The nightly feed that set it is gone. Home and the crew summary read a column that is always null. | After Jobber exit (UI first) | remove the readers, then drop the column. |
| L14 | `visit.jobber_job_id`, `jobber_visit_id`, `jobber_job_url`, `jobber_invoice_id`; `service.jobber_product_id`; `customer.jobber_client_id`; `property.jobber_property_id`; `organization.jobber_*` | `src/db/schema.ts:99-101,191,209,247,333-336` | `visits.linkRequest` writes `jobber_job_url`; `visitOut` reads it as `jobberRequestUrl`; `live.ts:70` reads `jobber_client_id`. | After Jobber exit | |
| L15 | Mirror tables `jobber_client/job/visit/quote/invoice`, `jobber_token`, `sync_run`; `mirror.upsert`; queue kinds `jobber-webhook`, `jobber-feed-sync` | `schema.ts:615-743`; `api/v1/mirror/handlers.ts`; `live.ts:70-77`; `loadBlocks` | `live.ts` loads all of them on every admin page; **busy blocks live in `jobber_visit` rows with `is_block = true`**, so busy time disappears with the mirror. | After Jobber exit, **after `busy_block` exists (7b)** | 1. create `busy_block`, backfill from `jobber_visit where is_block`; 2. switch `loadBlocks`; 3. remove the mirror reads in `live.ts`/`shape.ts`; 4. drop tables and the two enum values. |
| L16 | `schedule_run` | `src/db/schema.ts:489` | `queueDueRuns` (dedupe), `run.ts` | After 7b | goes with the season "Schedule" run. |
| L17 | Enums with no reader in non-test code | `quoteStatusEnum`, `invoiceStatusEnum` (only the mirror zod, `mirror/handlers.ts:21-22`), `townEnum` (used for zod and the `town` column) | mirror only | With the mirror | |
| L18 | `visit.window` (text "May", "July", "October") | `src/db/schema.ts:319`; written by `rows.ts:85`; `pass-from-api.ts:45`, `PassCard`, `SeasonLine`; constants `WINDOWS` in `shape.ts:177` and `WINDOW_LABEL` | A hard-coded month label duplicating the window. | After 7b | derive "May" from the service span. |
| L19 | `visit.confirmed_at` | `src/db/schema.ts:331` | no prod reader or writer found (confirmation is the `visit.confirmed` event) | Yes | drop after a guard that it is null everywhere. |
| L20 | `visit.preference` + `awaiting_pick` | `schema.ts:321-322` | `schedule.ts` (preferred third, waits on customer-home) | After 7b if the engine drops thirds | |
| L21 | `job.source = "site"` and `"renewal"` | `schema.ts:282` | `site` = a quote job from the contact path that no longer writes (the form only emails, per CLAUDE.md); `jobs.create needsQuote` still writes it. | Tidy | |
| L22 | `invoice.payment_id`, `charge.refunds_payment_id`, `job.renews_job_id` | no FK on purpose | fine, but nothing checks them | Tidy | add a guard query |
| L23 | `property.zones` and the Season Pass price rule | `schema.ts:238` | live | n/a | |

## 3. Scheduling data (ranked, with every reader)

### 3.1 The columns and who reads each

| Fact | Lives in | Written by | Readers (and what each assumes) |
|---|---|---|---|
| Day | `visit.scheduled_on` (date, Mountain) | `placeVisit`, `visits.pick`, `run.ts`, `chosen-days.ts`, `office.ts` | Admin shaper (`shape.ts:239`, always), account (`visitDay`: done by `completed_on`), `order-day.ts`, `loadTaken`, `dayFill`, `windowTold` key `${visitId}-${day}` |
| Time | `visit.start_time` (text "HH:MM") | `orderDay` (pass visits only, from 08:00), `chosen-days.ts` (checkout slot start), `placeVisit` when `startTime` given, `pick` (nulls it), `run.ts` (nulls it) | `timeBooked` (`move-rules.ts:9`: one-off with a time = a promise; pass visit = a stack), `placeVisit` (text rules), `loadVisitFacts` (null until the day-before text), calendar `.ics`, account window words |
| Order | `visit.stop_order` | `orderDay` | `StopRow` number, map pin, `schedule.day` (`order ?? next`), `order-day` |
| Who | `visit.person_id` | the same writers | `visitsQuery`, `loadTaken`, `dayFill`, `placeFor` (`dayVisits`), Home By person, messages `who` |
| Length | `visit.duration_minutes`, `service.slot_minutes`, `defaultMinutes(kind)` | create copies `service.slot_minutes` (`office.ts:237`), `run.ts` writes `defaultMinutes` | `openSlots` input is **`defaultMinutes(kind)`, never the service** (`area-days.ts:52`); `schedule.slots` uses `service.slot_minutes`; `dayFill` uses `v.minutes ?? defaultMinutes`; `loadTaken` uses `durationMinutes ?? defaultMinutes` |
| Done day | `visit.completed_on` | `markClosed` | account `visitDay`; Today (`today-model.ts:103`), allocation order, `done-note.ts` ("Done early"); not the grid |
| Works | `person.working_days` | Settings, `people.*` | `assignee` (move), `openSlots`, `placeFor`, `dayFill`, `schedule.slots` (all agree) |
| Hours | `person.hours_start/end` (null = 9 to 5, `people.ts:15`) | Settings | **`dayFill` only** |
| Caps | `person.capacity_by_kind`, `settings.buffer*` | Settings | `capacityFor` (with buffer: `openSlots`, `scheduleVisits`); raw count without buffer: `visits.move`, `placeFor`, `schedule.slots` |
| Season | `person.season_start/end` | Settings | `placeFor`, `dayFill` only |
| Season span | `service.bookable_from/to` (MM-DD) | Settings › Services; mirrored into `settings.windows` | `schedule.slots` only |
| Season dates | `settings.windows` (dated, one per kind) | seed, Settings, `mirrorWindow` | `scheduleVisits`, `openSlots` (via `area-days` year shift), `placeVisit`, `placeFor`, `daily.queueDueRuns`, `run.ts`, home-model, `hasSelfServeDays` |
| Place | `property.lat/lng/geocoded_at` | `geocode/index.ts` once, "never re-fetched" | `orderStops` (`orderDay`), map pins, `schedule.day` |
| Busy | `jobber_visit` rows with `is_block` (feed ids `feed:<person>:…`), no `busy_block` table | Jobber iCal feed sync | `loadBlocks` (`jobber-feed/index.ts:88`) into every capacity check |
| Area | `area` rows (`towns`, orders) | seed, `areas.*` | `areaIdOf` in `openSlots`, `placeFor`, `placeVisit`, `schedule.slots`; orders in `scheduleVisits` only |

### 3.2 Ranked findings

| # | Sev | Disagreement | Evidence | The one truth to keep | 7b must change | Dropped after 7b |
|---|---|---|---|---|---|---|
| S1 | two truths / bug | **Five implementations of "is this person free on this day"**: `openSlots` (`slots.ts:60`), `scheduleVisits` (`schedule.ts:50`), `placeFor` (`place-model.ts:46`), `placeVisit` (`visits/handlers.ts:106`), `schedule.slots` (`schedule/handlers.ts:123`). They differ on season (only `placeFor`), hours (none), buffer (engine only), minutes (engine only: visits count only elsewhere), window (`settings.windows` in four, `service` dates in one, year-specific in all), busy time (all). A customer can be offered a day Ryan could not place, and the office can place a day the engine would never offer. | table 3.1 | one pure `availability(person, day, visit, world)` in `src/lib/scheduling`, returning room in minutes and the reason; the five call it. | build it; `placeVisit` keeps a "may use the buffer" flag as a parameter, not a copy. | the duplicates; `capacity_by_kind` if minutes replace counts |
| S2 | bug | **Window dates carry a year** (see #6): `placeVisit` refuses next season's pass visit; `run.ts`/`queueDueRuns` do nothing after the closing day; `area-days.ts` hides this for the portal and checkout by shifting years (`area-days.ts:41-50`), `visits.move` and `place-model.ts` do not. | `visits/handlers.ts:118-120` | service `bookable_from/to` with the visit's season | `windowFor(service, season)` everywhere; `settings.windows`, `mirrorWindow`, migration-0024 bridge removed | `settings.windows`, `visit.window` |
| S3 | two truths | **`start_time` means two things** (`move-rules.ts:9`, `order-day.ts:14`): a promise on a one-off (booked by the office or the customer), a stack position on a pass visit. Readers that assume "promise": `placeVisit` (always texts), `timeBooked`, account window words. Readers that assume "stack": `orderDay` (overwrites), `visits.pick` (nulls it), `run.ts` (nulls it). `chosen-days.ts` stores a checkout slot start in it, which `orderDay` then replaces. | | two columns: `start_time` is only a booked or told time; stack order lives in `stop_order` (the time of the stop is computed on read from order and minutes). | add `window_told_start`; stop writing a stack into `start_time`; `windowTold` reads that column instead of a `message_log` key. | the `timeBooked` special case; `FIRST_STOP` writes |
| S4 | two truths | **Day hours** (#8) | | `person.hours_start/end`, one org default constant | all readers use `hoursOf` | `WORKDAY`, `WORKDAY_MINUTES` |
| S5 | two truths | **Person season** (#7) | | `person.season_start/end` | loaded in `loadWorld` and tested in availability | |
| S6 | two truths | **Visit length**: three sources (visit, service, `defaultMinutes`); `openSlots` ignores the service and the visit. The services screen lets the office change "minutes" with no effect on any offer (`area-days.ts:52`). | | `visit.duration_minutes` (copied from the service at create, editable); the service value is the default only | offers use the visit's, or the service's when no visit exists yet; delete `DEFAULT_MINUTES` for kinds that have services | `DEFAULT_MINUTES` |
| S7 | two truths | **Done day vs scheduled day** (#4) | | `completed_on` once done | one `visitDay` | |
| S8 | bug | **Checkout offers a start time**: `schedule.offerDays` returns `start` and a window ("8 to 10 am", clamped to 8:00, `schedule/handlers.ts:178`), `holdChosenDays` stores it (`chosen-days.ts:57`), while the rule is "a day is a promise, a window a message, told the day before". `openSlots` starts from 7:00 but offerDays clamps to 8:00 only in this one handler. | | the customer picks a day, never a time | offers return days; the stack is computed after | |
| S9 | legacy | **Town orders and area orders** (L1, L2) | no editor, JSON never read | `area` rows | | `area.spring_order/fall_order`, `settings.*TownOrder` |
| S10 | legacy | **Buffers** (L4): engine only. `visits.move` and `placeFor` ignore them silently. | | decide in 7b: one buffer rule applied by `availability` with a flag | | `settings.buffer*` if replaced |
| S11 | two truths | **Busy time is a Jobber mirror row** (L15): `loadBlocks` reads every block row of the org with no SQL date filter, maps `feed:<key>:` ids to people by string prefix. | `jobber-feed/index.ts:88-100` | `busy_block(person_id, starts_at, ends_at, title, source)` | create and backfill; Block time writes it | `jobber_visit.is_block` |
| S12 | bug | **Geocode misses are permanent**: a property with `geocoded_at` set is never looked up again, a miss included (`geocode/index.ts:14-22`). A typo fixed later keeps `lat = null` forever, and the stop goes last (`order.ts:36-37`). `properties.update` does not clear `geocoded_at` when the address changes (not confirmed in the file; check). | | `lat/lng` plus `geocoded_at` plus the address they were made from | clear `geocoded_at` on address change; route order reads from here | |
| S13 | tidy | **Timezone**: `blockedMinutes(..., "America/Denver")` is a literal in `visits/handlers.ts:127`, `schedule/handlers.ts:154`, `TIME_ZONE` const elsewhere; `services/handlers.ts:57` takes the UTC day (`ctx.now.toISOString().slice(0,10)`) and `checkout-state.ts:132` and `SeasonLine.tsx:143` do the same for "today". After 5 pm Mountain (UTC next day) "today" is tomorrow in those three places. | | `today(ctx)` (`shared.ts:28`) everywhere | one lint rule: no `toISOString().slice(0, 10)` outside `mountainDay` | |
| S14 | two truths | **Who is "on the schedule"** is a non-empty `person.truck` label (`people.ts:15`). | | `person.on_schedule` | | label text |

## 4. Two truths (outside scheduling)

| # | Pair | Truth | Wrong readers |
|---|---|---|---|
| T1 | `job.sold_on` vs the `job.sold` event | the column; the event is the story. Quote jobs: see #1. | the purge (`create.ts:119-120`) treats a `job.sold` event or a succeeded payment as proof of sale even when `sold_on` is null: it keeps the job while `passStatus` reads Pending |
| T2 | invoice frozen `lines`/`amount`/`tax`/`total` vs the job's lines | the invoice for what the customer was asked; the job's lines for what is owed now | `jobOwed` compares payments to the **job** total, not the invoice total: a line added after an invoice is sent makes `owed > 0` with the invoice marked paid by `settleOpenBill` (`record.ts:42-49`) only when `owed` is 0; a part payment leaves it open (documented). Nothing says which total a "Paid" invoice settled. |
| T3 | `customer.card_*` vs Stripe | Stripe; columns are a cache refreshed by webhook only | nothing reconciles; a card replaced in Stripe's own portal never reaches the columns |
| T4 | `visit.price` (derived from lines) in `lineAmountOf` vs `visitPriceOf` | lines | `shape.ts:249` sets `price: lineAmountOf(v, rule)` while the credit allocation (`shape.ts:201`) uses `visitPriceOf(v, lines, rule)` when `lineRows` exist: two helpers for one number |
| T5 | pass preferences, inspection: `passInspection` (`facts.ts:33`) | the live line with `service_id` of the inspection | matches by **name** (`LINE_NAMES.inspection`) or by an **id prefix** `inspection-`; a service made through `services.create` has a uuid id, and a renamed line misses |
| T6 | stage vs `cancelled_at` vs held money | see #2 | |
| T7 | `passStatus` lapsed by calendar year vs `currentSeason` (rolls Nov 1) | documented in `facts.ts` | `portal/me.ts:33` and `jobs.cancel` use `passStatus`; `scheduleRun` uses `currentSeason`: two definitions of "this season" |

## 5. Derivation edge cases

| # | Function | Case | Result | Sev |
|---|---|---|---|---|
| D1 | `stageOf` | job with no visits and priced lines, `sold_on` null, quote never sent | Needs a quote (correct), but also for a $0 job the office sold (`soldOn` set, subtotal 0, no `quote_accepted_on`): **"Needs a quote" forever** (`stage.ts:44`) | bug |
| D2 | `stageOf` | pass with every visit skipped, none done | Canceled (line 38), while `passStatus` says Active | two truths |
| D3 | `stageOf` | job done, then a line added | Done even though a line has no visit (only visits counted, line 39) | tidy |
| D4 | `jobMoney` | job totals 0 and a payment exists (all lines canceled, payment held) | `owed 0` so "Paid" (line `words: "Paid"`), the same word as a settled job | tidy |
| D5 | `visitMoney` | a done visit fully refunded | "Unpaid" (net 0 after a refund), though the money was returned on purpose | bug (wording) |
| D6 | `visitMoney` | payments on the job as a whole | not credited here; callers must pass allocated slices (`shape.ts:201-208`, `portal/visit-money.ts`, `money/credit.ts`): three call sites repeat the allocation | tidy |
| D7 | `jobKindOf` | one-off with every line canceled and no visits | "other" (pure fallback); a canceled repair reads "Other" | tidy |
| D8 | `timeline` | done visit | by `completed_on` (right); but a canceled visit sorts by `canceledOn` read from an event (`wasDay`/`canceled_on`), so past 5,000 events it has no day (#9) | bug |
| D9 | refund larger than payment | refused (`payments/handlers.ts` `left`); **but the Stripe refund runs before the row insert**, and `recordPaymentRow` can answer `undefined` on a `(visit, attempt)` collision after money moved (`payments/handlers.ts` "That refund was already recorded") | two staff refunding two payments of one visit at the same instant: attempt is read then inserted (`record.ts:46-49`) | bug (race) |
| D10 | canceled visit with a payment | `visitMoney` still says Paid (documented); `cancelSelf` keeps the job open; stage reads Canceled (#2) | | two truths |
| D11 | customer with two properties | timeline shows the street only with two properties; `customers.get` and `portal/load.ts` key by job; the one-per-property `must_be_home` is read from the visit's property (`placeVisit`). Nothing assumes one property per customer in the code read, but `live.ts` loads every property of the org once (`propertyRows`) | fine | solid |
| D12 | visit done on a day before its schedule | #4 | | |

## 6. Integrity

| # | Sev | Item | Where | Fix |
|---|---|---|---|---|
| I1 | tidy | No CHECK constraints tie `status` to its columns: `completed` needs `completed_on`; `scheduled` needs `scheduled_on` and `person_id`; `unscheduled` needs none of day, person, order, time. `undo done` resets to `scheduled` even for a visit that was Not closed (`visits/money.ts:37`). | `schema.ts:309` | CHECK constraints added NOT VALID, then validated. |
| I2 | tidy | `charge.job_id` and `customer_id` are nullable "as 0018 left them" although every writer sets them. | `schema.ts:381-382` | guard then NOT NULL. |
| I3 | tidy | `charge.method` is `text` with a TypeScript-only enum; `line_item.quantity` allows 0 and negative; `unit_price` allows negative. | `schema.ts:396,360-362` | CHECK. |
| I4 | tidy | `message_log` unique is `(kind, customer_id, key)` without organization; fine because the customer implies it. `provider_id` index is not unique. | `schema.ts:533` | leave. |
| I5 | tidy | No cascade rules anywhere (default NO ACTION); deletes exist in one place only: `expirePendingPasses` (`create.ts:112-124`), five sequential deletes with no transaction, which skips `charge` and `invoice` rows (it guards on a succeeded charge only; a pending or failed charge row on an unsold pass would raise a foreign key error and leave the job half-deleted: events, lines, visits gone before it fails at `job`). | `create.ts:117-122` | wrap in a transaction; also delete or refuse on any charge. |
| I6 | solid | One open invoice per job (`invoice_job_open_unique`, partial), unique invoice number per org, `pass_number` unique per org (partial), `person` email unique case-insensitive (partial), `visit.job_id` NOT NULL with FK, pass kind unique per job (`visit_job_pass_kind_unique`). | `schema.ts:300-304,320,413-418` | |
| I7 | tidy | Money is integer whole dollars everywhere; tax is rounded **per line** to the dollar (`lib/jobs/tax.ts`), then summed, so an invoice's `amount + tax` equals `jobTotal` by construction, and the invoice freezes `tax`. A per-line round means a 3-line job can differ from a single-line rounding of the same subtotal by a few dollars; the rule is documented. Stripe amounts go through `toCents` (`payments/handlers.ts`). | | leave |
| I8 | tidy | `quantity * unit_price` is integer; no decimals, so no fractional hours ("$145/hr"): a half-hour repair must be priced as a manual line. | | note for the quote step |
| I9 | tidy | `event` has no FKs by design; `customer_id`/`job_id`/`visit_id` can dangle after the purge (events are deleted there too). `admin_alert.job_id` the same. | `schema.ts:461` | guard query in tests |
| I10 | bug | An orphan path: **a visit of a canceled job** (`jobs.cancel` cancels visits not done; `bookings.cancel` and `cancelJobRows` do too), but a visit added to a canceled job through `visits.create jobId` is not refused in the file read (`visits/office.ts` was not read in full). Confirm and refuse. | `visits/office.ts` | |
| I11 | tidy | The timeline, `jobMoney` and the allocation each load or take **all** payment rows; `live.ts:94` loads every charge, line and invoice of the org for every render. Fine at this size; will not be at 10x. | `live.ts` | scope by date or by open records after 7b |

## 7. Migrations

| Check | Result |
|---|---|
| Journal: idx 0 to 26, 27 entries, no duplicate idx, `when` strictly increasing (1794548081947 up to 1795053617241) | **Pass** |
| Every `drizzle/*.sql` file is in the journal and every journal tag has a file; every file has a snapshot (`0000` to `0026`) | **Pass** (diffed) |
| The test DB (`src/db/test-db.ts:3,18`) runs `migrate()` over the whole folder, so the pglite chain runs 0000 to 0026; separate tests re-run 0013, 0021, 0022, 0024, 0025 | **Pass by reading, not run** |
| 0023 to 0026 have `when` values 60,000 ms apart (`…437241`, `…497241`, `…557241`, `…617241`), hand-written. Monotonic and unique today. A future generated migration must exceed `1795053617241` or drizzle skips it silently. | Note |
| 0022's guarded drops match the schema: tables `admin_user, booking, pass_change, quote_request, season_pass, truck`; columns on `job` (`kind, status, price, notes`), `visit` (`pass_id, booking_id, amount, truck_id, notes, charged_at, stripe_payment_intent_id`), `admin_alert.pass_id`, `charge.pass_id`, `jobber_visit.truck_id`, `person.legacy_truck_id`; the four types `admin_role, job_kind, job_status, pass_status`. `schema.ts` has none of them. | **Pass** |
| 0022 gaps in its guards: no guard for a non-pass job with `status = 'cancelled'` and `cancelled_at` null (0008 copied `cancelled_at` for passes, `b.status` for bookings did not carry a date at 0008:36-37); guard 1b covers passes only. No guard for `job.price` on a job with no visit. A "report only" notice (guard 8) lists jobs with nothing to derive a kind from. | Low risk: cannot be re-checked now, the columns are gone. Query the live database for `job where cancelled_at is null` whose visits are all canceled. |
| 0021 deploy-window triggers dropped in 0022 (`DROP TRIGGER`, `DROP FUNCTION`) | **Pass** |
| 0025 hard-codes an email (`hannahn.garner@gmail.com`) and the name "Hannah Garner" in a migration, guarded and idempotent. Harmless; it is a data fix inside the schema chain. | Tidy |
| 0026 uses `IF NOT EXISTS` (the 0025 collision was resolved) | **Pass** |
| Pushed migrations edited after push: not provable from git alone, and a pushed branch migrates production (shared `DATABASE_URL`). `0010_person.sql` was reverted to what the live database ran (`6bd78ee`); `0013`, `0014`, `0020`, `0021`, `0022` each have more than one commit; `0021` and `0022` each reach `main` through one merge (PRs #56, #58). | Confirm in the Neon `__drizzle_migrations` hashes against the files before the next push. |

## 8. API surface

| Handler or field | Problem | Keep or drop |
|---|---|---|
| `passes.*` (13 handlers, `api/v1/index.ts:38`) operate on jobs (`PassOut.id` is a job id) | name no longer matches the model; routes `/passes/...` stay for external readers | keep one season; rename in the docs as "Season Pass (job)" |
| `visits.areaDays`, `visits.pick`, `visits.requestMove` | `requestMove` (`customerSelf`) records an event nothing in the admin acts on (`visits/handlers.ts:200-210`); `areaDays` is the Reschedule, named for a retired concept | `requestMove`: drop after confirming no external caller (the portal reschedules directly); `areaDays`: rename `visits.offerDays` with an alias |
| `bookings.create` | throws `notImplemented` (`bookings/handlers.ts:41-43`) but is listed in the OpenAPI document, the MCP tools and the checkout scope | drop now |
| `bookings.cancel` | cancels a job by id or `job_<booking id>`; duplicates `jobs.cancel` rules (events, lines) in its own code | drop after a season; point to `jobs.cancel` |
| `areas.*` | live, but the town-order fields are dead (L2) | keep, drop the order fields after 7b |
| `mirror.upsert` | the Jobber push | after Jobber exit |
| `truckId` inputs and `truckName` outputs | L12 | keep one season |
| `payments.*` shapes carry `method: "bill"` and `status: "refunded"` | L10 | drop now |
| `jobs.create` accepts `needsQuote` and writes `source: "site"` | the site no longer posts here; only the office does | rename `source` value to `office` for both, or add `quote`, with #1 |
| Customer scopes (`customerSelf: true`): `portal/*`, `invoices` (2), `visits` (3), `passes` (8) | `callApi` admits a customer for these and the handlers re-check ownership (`assertOwnsCustomer`, `visits/handlers.ts:219`). Not every `passes.*` handler was read for a missing owner check; `passes.get` and `passes.list` were not confirmed to scope by `customerId`. | read each of the 14 `customerSelf` handlers and add a test per one: "customer B cannot read customer A's id" |
| `events.list` and `customers.get` carry staff events; `visitOut` hides notes from a customer, `techEvent` filters a tech | `events.list` scope is `read`; a customer principal does not hold it (no `customerSelf` on events). Solid. | |

## 9. Tidy

| Item | Where |
|---|---|
| "bill" still names the invoice in code: `billSent`, `billOf`, `paidBillVisits`, `settleOpenBill`, `cancelOpenBill`, `BillRows` across 22 files; Hannah's rule is "Invoice, not bill". | `words.ts`, `shape.ts`, `payments/record.ts` |
| Handlers that pull whole tables on every admin page (`live.ts:45-58,63-90`). | `live.ts` |
| `loadBlocks` loads every block row of the org, then filters in JS. | `jobber-feed/index.ts:88-96` |
| `passId: s.adminAlert.jobId` aliasing in `live.ts:73`. | `live.ts` |
| `invoiceStatusEnum` still has `overdue`, a stored value where "Past due" is derived (`invoiceStatus(r, today)`). | `schema.ts:67` |
| `charge.attempt` read-then-insert (`record.ts:46-49`) | `src/lib/money/record.ts` |

## 10. What is solid

- The schema matches 0022: every dropped table, column and enum is gone; no live code reads `season_pass`, `booking`, `truck`, `quote_request`, `admin_user`, `pass_change`, `job.status/price/kind/notes`, `visit.amount/notes/charged_at`.
- Journal and files agree, `when` increases, snapshots exist, the test chain migrates the whole folder.
- Money is rows: payments are `charge` rows with signed amounts and a refund pointing at its payment, never edited or deleted; refunds are capped at what is left.
- One open invoice per job, unique invoice numbers and pass numbers, case-insensitive person emails: all enforced by indexes, not code.
- Job kind, stage and pass status are derived, not stored, from one function each; the customer's words are in one file.
- Multi-tenant scoping: every handler read scopes by `organizationId`; the one place a customer is admitted (`customerSelf`) re-checks ownership of the id.
- The 24-hour rule is one function (`withinCutoff`); a button and its refusal cannot disagree.
- `legacy_pass_id` keeps every old link and Stripe id working; the purge never touches a sold pass.
- Tax is rounded per line and frozen on the invoice, so the invoice, job total and charge agree.

## 11. Order of work

1. **Now**: #1 quote dates and `sold_on`; #2 stage vs held payment; #3 job-level payment cap and `paidOn`; #4 one `visitDay`; L1, L9, L10, L19, `bookings.create`, `visits.requestMove` drops; S13 UTC "today" in three places; I5 purge in a transaction.
2. **7b** (one design, one migration): one `availability()` (S1), service dates as the truth and no dated windows (#6, S2), hours and person season honored everywhere (#7, #8), `start_time` split from the stack (S3, #5), no checkout time (S8), `busy_block` table and backfill (S11), visit length one source (S6), `on_schedule` flag (S14), geocode clears on address change (S12). Then drop `settings.windows`, `settings.*TownOrder`, `area.*_order`, `capacity_by_kind` (if minutes), `visit.window`, `schedule_run`.
3. **After 7b**: events-derived facts become columns (#9), CHECK constraints (I1 to I3), composite FKs (#10), scope `live.ts`.
4. **After the Jobber exit**: L7, L13, L14, L15, `mirror.upsert`, the Jobber queue kinds.
5. **After one season**: `truckId`/`truckName`, `legacy_pass_id`, `passId` aliases, `bookings.cancel`.

## 12. Not verified

Read but not confirmed in full: `visits/office.ts` (I10), the `customerSelf` handlers in `passes/handlers.ts` (section 8), `properties.update` clearing `geocoded_at` (S12), `src/lib/scheduling/schedule.ts` past line 80, and the live database (no query was run). The pglite chain was not executed.
