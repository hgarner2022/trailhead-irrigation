# The Schedule and the job flow, made one

Nov 25 2026. For the next engineer. Nothing here is built except the small word fixes in Part B marked "applied". Hannah's decisions in Part C are settled; do not reopen them.

Why this exists. Hannah reviewed the Schedule prototype and said: "You need to use language we already use. Audit it." and "You're supposed to reconcile what the other job flow looks like, so there's continuity between them and the schedule." The Schedule prototype was built without looking at the clickable admin walkthrough. This doc says what the walkthrough already has (A), checks every Schedule string against it (B), and plans the merge (C).

Short names used below.

| Name | Means |
|---|---|
| (1) | The reviewed prototype: the clickable walkthrough and the job page flow. Code in `src/app/(admin)/admin/_screens/design/` and `.../design/walkthrough/` |
| (2) | The new Schedule prototype. Blocks in `src/components/blocks/` (`TimeGrid*`, `FindATime`, `NotifyDialog`, and the rest), screen in `_screens/design/ScheduleProto*` |
| Live | The real admin screens in `_screens/` (`ScheduleScreen`, `VisitMove`, `NewJob`, `settings-tabs/People.tsx`) |

The merge repair (Job 1) is done: `RecommendedMark` now rides on `TimeChips` (props `recommendedStart`, `recommendedLook`) and `DayCalendar` passes `recommendedStart`, `recommendedDay`, `recommendedLook` through. `DayTimePicker` no longer exists. Nothing else about the mark changed.

---

## Part A. What already exists

### A1. The most important facts

1. **The walkthrough has a Schedule screen, and it is not the job flow's.** `walkthrough/WalkScreens.tsx` renders `case "schedule": <ScheduleScreen data={LIVE} today={LIVE_TODAY} defaultDay={route.id} />`. That is the live `_screens/ScheduleScreen.tsx` (Week, Day, List; Unscheduled list with Schedule and Schedule all; the 60 second texting strip; live `VisitMove`) over `snapshot.json` with `LIVE_TODAY = "2026-11-12T19:56:30Z"`. A comment in the file says Home, Schedule, Reports and Settings "are not re-keyed to this world's customers". So the customers and jobs on the walkthrough's Schedule are not Andrea Dalton, Marcus Bell and the others.
2. **"The Schedule and Move dialog with crew options" is not on that Schedule screen.** It is `design/ScheduleDialog.tsx` with `design/SchedulePicker.tsx`. It opens from the job page's footer buttons Schedule and Move (and from a Season Pass trip's buttons and from `JobFlow`). Story: `admin-confirmations--schedule-tech`. The Schedule screen's own Move is the live `MoveDialog` (`_screens/VisitMove.tsx`), a different dialog with different words.
3. **A job opens as a page, not a panel.** In the walkthrough a route `{ screen: "job", id }` renders `JobPage` or `JobPagePass` (`RecordPage` with a title, status badges, a four-cell summary band, a main column and an aside). The router (`walkthrough/routes.ts`, `Walkthrough.tsx`) listens in the capture phase for clicks on links like `/admin/jobs?job=<id>` and turns them into routes; a table row opens the first record chip in it. Live uses `RecordHost`, which opens a side panel; the design prototype chose pages (`docs/plans/2026-11-19-admin-page-layout-research.md`). The job page's "Day" chip links to `/admin/schedule?day=...`, which the walkthrough maps to `{ screen: "schedule", id: day }` and the Schedule opens on that day (`defaultDay`).
4. **A visit is called a "trip" in code and "Visits" or "visit" on screen.** Files, types and props say trip (`TripRow`, `TripBody`, `TripData`, `JobPageTrips.tsx`, `tripsHeading`). The screen says the section "Visits", the band cell "Next visit", the button "Add a return trip" (the one place trip leaks). A job with one visit is `JobPage`; a Season Pass or a repair with a return is `TripsPage` with one `TripRow` per visit and one open at a time (`defaultOpen` takes a trip id).
5. **The walkthrough world has no dated visits.** Its jobs are `GridJob` rows (`walkthrough/jobs-data.ts`) with a `next` string ("Mon, May 3", "Unscheduled", "Today") and a `who` string. Dated visits exist only as trip fixtures (`trip-fixtures.ts`, written as "Mon, May 3") and job-page fixtures ("Today, Wed Nov 18"). Three different "todays" exist: `WALK_TODAY` 2026-11-12, the job page's Nov 18, and the Schedule prototype's Nov 25.

### A2. The table

| The Schedule prototype draws | What (1) already has | Files |
|---|---|---|
| Opening a visit or job from somewhere | A route `{ screen: "job", id }` rendering a page. Links with `recordHref.job(id)`, `RecordChip kind="job"`, `RecordChip kind="day"`. The "Day" chip goes to the Schedule on that day. Live: `RecordHost` panel through `useOpenRecord()` | `walkthrough/routes.ts`, `walkthrough/Walkthrough.tsx`, `design/RecordChips.tsx`, `src/components/blocks/record-preview-model.ts` |
| What a visit is called | "Visits" (section), "Next visit" (band), `TripRow` titled by service ("Spring turn-on"). Code says trip | `JobPageTrips.tsx`, `TripBody.tsx`, `trip-fixtures.ts` |
| Facts and sections shown for a visit | One-trip job: band Day or Next visit, Who, Where, Total; sections Visits or What's included, Billing, Messages; aside Customer, Property, Past visits, Notes and history. A trip opened in place: facts "When" (day chip, time) and "Who" (person chips), then the buttons, then the checklist, Photos, Notes and history. Job facts rows are "Day", "Time", "Who" (`job-fixtures.ts` `day()`) | `JobPage.tsx`, `JobPageParts.tsx`, `TripBody.tsx`, `job-fixtures.ts` |
| Buttons on a visit, by state | Scheduled: primary Move, then Mark done, Send a message, More (Edit, Add a note). Today: On my way, Mark done, Send a message, More (Move, Edit, Add a note). Active: Mark done, Send a message, More (Move...). Done: Collect payment, Send a message, More (Undo done, Edit). Paid: More (Refund $145, Send a message, Undo done). Unscheduled: Schedule, Mark done, Send a message, More, Cancel job. Late: Mark done, Skip, Move | `trip-fixtures.ts` `footerOf`, `job-fixtures.ts` `jobPageOf` |
| The Schedule and Move dialog | `ScheduleDialog`: titled "Schedule the job" or "Move the job"; the one calendar (`DayCalendar` office mode, `timed={false}`, `free={{ from: today }}`); "Who" chips for one or more people; "Start time (60 minutes)" with a line "Ryan is booked: 9:00 am Dana, Erie" and `TimeChips` with "Any time" first; the crew text checkbox "Text Tech Two that it's assigned" with the exact text under it; "Instructions for the crew (optional)", 140 characters; a sentence "Andrea gets a text with the day and time."; confirm is a `SplitButton` "Schedule and notify the customer" with "Schedule without notifying" under the caret (greyed when a time is set). Live `MoveDialog` has "Move and text the customer" and "Move without texting", "A line for the text" | `ScheduleDialog.tsx`, `SchedulePicker.tsx`, `crew-copy.ts`, live `VisitMove.tsx` |
| How telling the customer is worded | "notify the customer", "without notifying" (confirm copy, `ScheduleDialog`). "Tell Beth" and "Keep the change without telling Beth", "Beth has not been told the new total" (price change dialog, `docs/DESIGN.md`). Live: "Move and text the customer". Messages: `MessageDialog` titled "Send a message", channel chips "Text to (970) 555-0123" and "Email to andrea@...", "What Andrea will see", "N of 160, one text", confirm "Send the text" or "Send the email" | `confirm-copy.ts`, `MessageDialog.tsx`, `docs/DESIGN.md` rows 218 and 219 |
| Confirmation dialogs | `confirm-copy.ts`: every customer-facing action opens a dialog that says its effect in one or two sentences with the channel, then a confirm named for the action ("Move the visit", "Charge $145", "Send the reminder"), and a quiet twin under a caret ("without notifying"). Cancel is the default dismiss; a destructive one says "Keep it" | `confirm-copy.ts`, `src/components/blocks/ConfirmDialog.tsx` |
| Toast or undo | `Toast` (4 seconds, no button) says what a payment or invoice did: "Charged $145 to the Visa ending 4242". `UndoToast` (10 seconds, at the top) says "Moved to Thu, Oct 14, no text sent." with Undo and is what live Move, Mark done, Not done use. `UndoToast`'s bar already takes up to two actions (the Schedule work added Notify) | `src/components/blocks/Toast.tsx`, `UndoToast.tsx`, `VisitMove.tsx` line 69 |
| New job | Opens as the real `NewJob` sheet from Jobs, a customer's page or the header, over `WALK_DATA`: the customer type-ahead, then "What are we doing?" (Season Pass first, then services), zones, "Day (optional)", "Add job". A new job is Unscheduled, or Scheduled when a day is chosen, then its page opens | `WalkScreens.tsx` `NewJobSheet`, `_screens/NewJob.tsx`, `NewJobService.tsx`, `walkthrough/walk-new-job.ts` |
| Unscheduled and "needs a day" | The status word is "Unscheduled" everywhere (`GRID_WORDS`, `StatusPill` `needs-a-day`, `WORK_WORDS`). Live Schedule heading "Unscheduled (4)" with Schedule on a row and "Schedule all N". Home: "Nothing booked today. Jobs with no day wait on the Schedule." | `JobsGridDesign.tsx`, `src/lib/admin/jobs.ts`, `ScheduleUnscheduled.tsx` |
| Who is coming, crew, person naming | "Who" is the label. Full names in chips ("Ryan Garner", "Hannah Garner", "No one yet"); the customer hears the first name (`firstNameOf` in `src/lib/admin/people.ts`). Crew is the people on a trip; "Tech Two" is the second person in the live snapshot | `JobsGridDesign.tsx` `WHO_OPTIONS`, `SchedulePicker.tsx` `PEOPLE`, `people.ts` |
| Time and date formatting | `dayLabel` ("Thu, Oct 14") and `clockLabel` ("8:00 am") in `_screens/visit-panel-model.ts`; `clock12` and `longDay` for the customer; `shortDate` ("Oct 4") and `writtenDate` in `src/lib/admin/format.ts`; `hoursWords` and `fillWords` ("5 stops, 3 h open") in `src/lib/admin/day-fill.ts`; `dayTitle` in `walkthrough/routes.ts` | those files |
| Status pills and colours | `StatusPill` (`src/components/blocks/StatusPill.tsx`): Unscheduled and Waiting on customer are gold, Scheduled and Today navy, Active progress, Done and Paid green, overdue and failed red, cancelled grey. Money words from `src/lib/money/words.ts` ("Past due", "Invoice sent", "Unpaid") | `StatusPill.tsx` |
| Settings > People | Live `settings-tabs/People.tsx` is the only one (the prototype has no Settings). Rows: Name, Email, Phone, Role, Takes visits, Working days, Hours (start and end `TimeField`s, hint "The weekly rule. A day off or a dentist visit is Block time on the Schedule."), Most per day by kind | `settings-tabs/People.tsx` |
| The Schedule inside the walkthrough | The live `ScheduleScreen` over the repo snapshot, described in A1 item 1. No job page opens from it: a stop opens the live visit panel through `RecordHost` | `WalkScreens.tsx`, `_screens/ScheduleScreen.tsx` |

### A3. Where the two disagree on principle

| Topic | (1) says | (2) says | Settled by |
|---|---|---|---|
| Moving texts the customer | Schedule and Move confirm with "notify the customer" as the default; "without notifying" under the caret | A move never texts. "Visit moved" with Notify and Undo | Decision (c): (2) wins. The dialog's default changes (Part C step 3) |
| Where time off lives | Live People hint says it is "Block time on the Schedule" | A Time off button in the Schedule header | Decision (d): Settings > People. The live hint must change with it |
| Jev | Nowhere. `docs/DESIGN.md` 2026-11-12: "No proposals" | A week plan of moves, Ask Jev | Decision (e): no plan, no header button |
| Opening a record | A page | A stand-in side panel | Decision (a): the page |

---

## Part B. The language audit

Verdicts: **matches** (same word or format exists), **replace with X** (X is the existing word), **new thing** (nothing in (1), live, `docs/UX_WRITING.md`, `docs/DESIGN.md` or the repo `CLAUDE.md`). "Applied" means it was changed in this pass.

### B1. Header and toolbar

| String | Where it shows | What (1) already calls it | Verdict |
|---|---|---|---|
| Schedule | Header title | "Schedule" (`SCREEN_TITLE` in `walkthrough/routes.ts`, live `PageHeader`) | matches |
| Week of Nov 23 | Header context | "Week of Nov 9. 12 visits." (live `weekContext`) | matches (the live line adds the count) |
| New job | Header primary button | "New job" (live and walkthrough) | matches |
| Ask Jev | Header button and phone menu | nothing; `docs/DESIGN.md` 2026-11-12 "No proposals" | new thing, and decision (e) removes it |
| Time off | Header button, phone menu, dialog title | live People hint "Block time" | replace: it leaves the header (d). The word is for Hannah to choose (Part C) |
| More | Phone menu button | "More" (`RecordFooter`) | matches |
| More actions | That button's aria-label | none | new thing, minor. Kept: the phone tab bar is also named "More" and a story finds the two apart by it |
| Previous week, Next week, Previous day, Next day, Previous month, Next month | Arrow buttons | "Previous day", "Next day" (live `ScheduleParts`), "Previous month" (`DayCalendar`) | matches |
| Today | Toolbar button | "Today" (Home, live) | matches |
| Schedule view | Segmented control label | none | new thing (a label for a screen reader) |
| Week, Day, List | View switch | "Week", "Day", "List" (live) | matches |
| Month | View switch | none | new thing: the view is new. The word follows the pattern |
| Keyboard shortcuts | Phone menu item and dialog title | none | new thing |
| Day view, Week view, Month view, Go to today, Next day, week or month, Last day, week or month, Show this list | Shortcuts list rows | none | new thing (reads as the view names above) |
| 3 not told | Toolbar button | "Beth has not been told the new total" and "Tell Beth" (price change, `docs/DESIGN.md`) | replace with the told words, but see the conflict in Part C "For Hannah to choose" |
| Unscheduled 4 | Toolbar toggle | "Unscheduled (4)" (live heading, `ScheduleUnscheduled.tsx`) | replace with "Unscheduled (4)". **Applied** |
| Map | Toolbar toggle, panel title | none on the Schedule (Home has an unlabelled map) | new thing, a plain name for a panel |

### B2. The calendar

| String | Where it shows | What (1) already calls it | Verdict |
|---|---|---|---|
| 5 visits (week day header chip) | Week column header | "5 stops, 3 h open" (live `DayHeader`, `fillWords`) | replace with `fillWords(dayFill(...))`. **Applied** (Day view already did) |
| 4 stops, 5 h open | Day column caption | same | matches |
| N stops, No stops | Month cell, map | "5 stops", "No stops" (`fillWords`) | matches |
| Erie, Lafayette +1 | Month cell towns | "Erie 3, Lafayette 2" (`townsWords`) | replace with `townsWords` when there is room; keep "+1" only as the narrow fallback |
| RG, TT | Week column headers, block chips | full names "Ryan Garner" in chips; `firstNameOf` for "Ryan" | replace with the first name, or the full name in chips. Initials are new |
| Tech Two | Fixture person | "Tech Two" (live snapshot) | matches. In the walkthrough world the people are Ryan Garner and Hannah Garner (`WHO_OPTIONS`) |
| Ryan, Tech (first names in headers) | Day column heads | `firstNameOf` | matches |
| Any time | Strip label, gutter, block text, move choice | "Any time" (job page, `ScheduleDialog`, `TimeChips`) | matches |
| Set a time | Block menu | none ("Start time" in `ScheduleDialog`) | replace with opening the one Schedule dialog |
| Make it Any time | Block menu | "Any time" | replace with the dialog's "Any time" chip |
| 15 minutes shorter, 15 minutes longer | Block menu | Services has a "Minutes" field; no resize in (1) | new thing. Lengths come from the service; see Part C |
| Actions for Briggs St | Block menu aria | none | new thing, minor |
| Clash: Ryan has Cheesman St at 9:00 am. | Block and drop notices | none. "Has X at 9:00 am" sentences are new | replace: drop the word "Clash:" and let the sentence stand. The sentence is new |
| done, waiting on customer | Block aria | "Done", "Waiting on customer" (`StatusPill`) | matches |
| customer not told | Block aria | see 3 not told | replace (told words) |
| proposed | Block aria | `docs/DESIGN.md`: no proposals | delete with Jev's plan |
| Ryan off 12 to 2 pm, Ryan off all day | Time off band label | none | new thing (d) keeps the band |
| Edit time off: ... | Band aria | none | replace: the band opens Settings > People (d) |
| everyone off, Tech off, a move the customer has not been told about | Month cell aria | none | new thing, follows the told words |
| A move not told | Month legend | none | replace with the told words |
| 9 am, 10 am (hours) | Hour gutter | "8:00 am" (`clockLabel`), customer windows "8 to 10 am" | matches (`hourWords`) |
| 9:00 to 11:00 am | Block range | "8 to 10 am" window words (`docs/UX_WRITING.md`) | matches in spirit; use one formatter (`rangeWords` is a second one) |
| Thu, Nov 26 | Many places | `dayLabel` "Thu, Oct 14" | matches the output; it is a second formatter (`dayShort` in `find-a-time-model.ts`). Replace with an import when `dayLabel` moves to `src/lib/` |
| Nov 23 | Plan strip title | `shortDate` in `src/lib/admin/format.ts` | replace with `shortDate`; `schedule-prototype-words.ts` goes with the strip |
| 1 h, 1 h 30 min | Unscheduled rows, Find a time | `hoursWords` ("3 h", "1 h 30 min") | matches; the fixture has its own formatter, replace with the import |

### B3. Visit moved toast and the move itself

| String | Where it shows | What (1) already calls it | Verdict |
|---|---|---|---|
| Visit moved | Toast title | "Moved to Thu, Oct 14, no text sent." (live `UndoToast`, `VisitMove.tsx` line 69) | replace with "Moved to Thu, Nov 26". **Not applied**: Part C step 3 rebuilds the toast and every assertion goes with it |
| Visit scheduled | Toast title | "Scheduled for Tue, Nov 24" (trip history line, `trip-fixtures.ts`) | replace with "Scheduled for Thu, Nov 26". Not applied, same reason |
| 11 visits moved | Toast after a plan | none | delete with Jev's plan |
| Briggs St to Thu, Nov 26, 9:00 am | Toast detail | none | the toast carries the day once ("Moved to ..."); drop the repeat |
| Briggs St now 11:00 am to 12:30 pm | Resize toast | none | new thing. Resize leaves the toast pattern until Part C decides it |
| Notify | Toast action | "notify the customer" (`ScheduleDialog`) | matches the verb |
| Notify all | Toast action after a plan | none | delete with Jev's plan |
| Undo | Toast action | "Undo" (`UndoToast`) | matches |

### B4. Unscheduled panel

| String | Where it shows | What (1) already calls it | Verdict |
|---|---|---|---|
| Unscheduled (4) | Panel title | same | matches |
| Not told 3 | Tab | told words | replace with the told words |
| Every job has a day. A job with no day waits here until you schedule it. | Empty state | "Jobs with no day wait on the Schedule." (Home) | matches the pattern (`docs/UX_WRITING.md` rule 10) |
| Oldest, Newest | Sort | none | new thing |
| Andrea Reyes · Erie | Row line 1 | "Sprinkler repair · Added Nov 18" uses the same middle dot | matches |
| Spring turn-on · 1 h | Row line 2 | `LINE_NAMES` ("Spring turn-on") | matches |
| Find a time for Andrea Reyes | Row button (aria) and the visible icon button | "Schedule" (live row button and the job page's primary) | replace with "Schedule". It opens the one Schedule dialog with the best times inside |
| Everyone has been told. A moved visit waits here until you notify the customer or decide not to. | Empty state of the Not told tab | none | new thing; goes with the told words |
| Andrea Reyes · Erie, Thu, Nov 19, 9:00 am to Thu, Nov 26, 9:00 am | Not told row | none | new thing |
| Notify Andrea Reyes, Don't tell Andrea Reyes | Row buttons | "Tell Beth" and "Keep the change without telling Beth" (price change); "notify" and "without notifying" (schedule) | replace: see "For Hannah to choose" |
| Don't tell | Not told button | as above | replace, as above |

### B5. Find a time

| String | Where it shows | What (1) already calls it | Verdict |
|---|---|---|---|
| Find a time | Button, section, panel title when opened from a row | none; the job page says "Schedule" | new thing as a name. Inside the one Schedule dialog it is a list, not a screen |
| Recommended, Soonest, Least driving | Sort control and row badge | "Soonest" (calendar legend, customer and office), "Recommended" (`RecommendedMark`, `preferenceLabel`) | "Soonest" and "Recommended" match. "Least driving" is a new thing |
| Sort | Aria | none | new thing, minor |
| adds 4 min | Each row, right | none | new thing (office only) |
| Next to an Erie visit | Row line | none | new thing (office only; never reaches the customer) |
| Estimated drive times | Grey note | none | new thing |
| Add an address to find a time | State line | none | new thing |
| Finding times | Screen reader | none | new thing |
| No time before Dec 7. | Empty state | "No open day before May 31. Pick a day yourself." (live Place, `CLAUDE.md` step 3) | replace with "No open day before Dec 7." **Applied** |
| No time open. | Empty state | none | new thing |
| Outside the six towns. | Empty state | the six towns (checkout serviceability) | matches the phrase "six towns" |
| Pick a day yourself. | Empty line | "Pick a day yourself." (live Place) | matches |
| Openings | Aria | none | new thing, minor |
| Show all times (3 more), Show fewer times | Button | none | new thing |
| Book it anyway | Tick on a forced row | none; "the office may book over the rules with a warning" is Hannah's rule (Nov 18) | new thing |
| Thu, Nov 26 9:00 to 10:00 am Ryan | Row | "Day, Time, Who" | matches |

### B6. Dialogs

| String | Where it shows | What (1) already calls it | Verdict |
|---|---|---|---|
| Tell Andrea about the new time | Notify dialog title | `MessageDialog` is "Send a message"; "Tell Beth" is the price change | replace with the one `MessageDialog` ("Send a message"), prefilled |
| Tell 3 customers about their new times | Many dialog title | none | delete with the plan (the many form only existed for Jev's plan) |
| How to tell them, Text, Email | Channel control | `MessageDialog`: "Channel" with "Text to (970) 555-0123" and "Email to andrea@..." | replace with the same chips |
| No phone on file, No email on file | Disabled reasons | "the address on file" (`via`) | new thing, minor |
| to (970) 555-0142 | Line under channel | "Text to (970) 555-0123" | replace, same chips |
| Message | Field label | "Message" (`MessageDialog`) | matches |
| 52 of 140 characters | Hint | "52 of 160, one text" (`MessageDialog`) | replace with the 160 and "one text" form |
| Shorten the message by 4 characters. | Error | none | new thing; `MessageDialog` has a count instead |
| Send, Send to 3 | Confirm | "Send the text", "Send the email" | replace |
| No way to reach Andrea | State | none | new thing |
| Who to tell, Tell Andrea Reyes | List and aria | none | delete with the plan |
| Words in braces fill in for each customer | Hint | the placeholders in Settings > Messages (`{day}`, `{time}`, `{service}`) | matches (`src/emails/editable.ts`) |
| Trailhead: your spring turn-on moved to Thu, Nov 26 at 9:00 am. | Default message | "Day moved, text" template in `src/emails/editable.ts` | matches |
| Move anyway?, Move anyway | Warning dialog | confirm names the action ("Move the visit") | replace the confirm with "Move the visit"; the title is new |
| Keep it where it was | Dismiss | "Cancel" (`ConfirmDialog` default) | replace with "Cancel". **Applied** |
| Ryan has Cheesman St at 9:00 am. Ryan is off all day. Ryan works until 5:00 pm. | Warning list | none | new thing, the engine's own words (design doc 7.13) |
| Move Briggs St | Stand-in Move dialog title | "Move the job", "Move the visit" | replace: the stand-in goes (Part C) |
| Day | Stand-in Move field | "Day" (job facts) | matches |
| Time | Stand-in Move field | "Time" (job facts), "Start time" (`ScheduleDialog`) | matches |
| Person | Stand-in Move field, Time off field, phone group | "Who" | replace with "Who". **Applied** in the stand-in Move and its visit panel; the Time off dialog and phone group are untouched because they go |
| Move | Stand-in confirm | "Move" is the primary button name; the dialog confirm is "Move and notify the customer" | replace by (c) |
| Time off | Dialog title | none | new thing, moves to Settings (d) |
| Person, All day, From, To, Times, Start time, End time, Note, Staff only | Time off fields | People has "Working days", "Hours" (`TimeField`s "day starts", "day ends") | replace: these become fields on the person (d) |
| 2 visits are inside this time. They stay where they are. | Time off notice | none | new thing |
| Add time off, Save, Remove | Time off buttons | none | new thing |

### B7. Stand-in visit panel, New job sheet, Map, other

| String | Where it shows | What (1) already calls it | Verdict |
|---|---|---|---|
| Service, When, Who, Town | Stand-in visit panel facts | "Day", "Time", "Who" (job facts); Where | replace: the page (a) |
| Customer not told | Panel notice and block mark | told words | replace |
| Move | Stand-in panel footer | "Move" (primary for a scheduled visit) | matches |
| Find a time | New job sheet title when opened from a row | none | replace with "Schedule" opening the one dialog |
| New job | Sheet title | "New job" | matches |
| Customer, Address, Service, Choose a customer | Stand-in fields | the type-ahead, the customer's property, "What are we doing?" | replace: the walkthrough's `NewJob` |
| Add job | Footer | "Add job" | matches |
| Place | Footer when opened from a row | "Schedule" (live button, job page primary) | replace with "Schedule". **Applied** |
| Add without a day | Footer | "Day (optional)" empty, then "Add job" | replace: leave the Day empty |
| Show on the map, Unscheduled, No stops on this day. | Map panel | "No stops" | matches ("No stops"); the rest new |
| The List view stays as it is today. | List view placeholder | the live List (`VisitsList`) | replace with the live List |
| Recommended, Suggested, Recommended time | The customer's recommended mark (looks A, B, C) | "Recommended" appears in `preferenceLabel` | A matches; the look is Hannah's pick |
| Jev's plan, week of Nov 30; Jev is resting. Try again later; Jev found nothing to change; 11 moves, 94 fewer driving minutes; Accept all; Accept 3; Throw away; Move Briggs St (aria); Saves 12 minutes of driving.; Erie stops are together on Thursday.; Customer picked Thu. Needs your call.; Changed since | Plan strip and its fixtures | none | delete, decision (e) |
| Start here: Scheduler (Nov 25) page | Owner's docs page | n/a | rewrite last, after Part C, with the same words |

### B8. Counts

Counted from the verdict column of the tables above, 116 rows; a row is a group of strings that share one verdict.

| Verdict | Rows |
|---|---|
| matches | 35 |
| replace with an existing word | 38 |
| delete (goes with a removed part) | 6 |
| new thing, no existing word | 33 |
| mixed or noted (a split verdict, listed in its row) | 4 |
| Applied now | 6 |

The six applied: Place to Schedule; Person to Who in the stand-in Move and visit panel; Keep it where it was to the default Cancel; the week header "N visits" to `fillWords`; "No time before" to "No open day before"; "Unscheduled 4" to "Unscheduled (4)". Not applied on purpose: the toast titles (the toast is rebuilt in step 3) and "More actions" (the phone tab bar is also "More"; a story tells them apart).

---

## Part C. The plan to make them one

Decisions, from Hannah, not to be reopened: (a) a click on a visit opens the walkthrough's job page with that visit in focus; (b) Move and Schedule are the walkthrough's one Schedule dialog with the ranked best times inside; (c) a move never messages on its own, after a move the "moved" confirmation with Undo and a way to tell; (d) Time off is set in Settings > People and the calendar only draws the band; (e) Jev never moves a customer who has a day: no plan, no Ask Jev; Jev appears in New job, on Unscheduled rows and behind the recommended time; (f) New job on the Schedule is the walkthrough's New job with the best times added; (g) the Schedule prototype lives inside the walkthrough's Schedule step.

### C1. Order of work

Do it in this order. Each step ends green (`npx tsc --noEmit`, `npm run check:design`, `npm run test:gate`, unit tests, the storybook tests for the files touched).

| Step | Do | Why first |
|---|---|---|
| 1 | One fixtures world: build walkthrough visits | (g) and (a) need dated visits that belong to the walkthrough's customers |
| 2 | Put the Schedule prototype in the walkthrough's Schedule step | The shell and routes then carry (a) to (f) |
| 3 | The one dialog and the moved confirmation | (b), (c) |
| 4 | New job with best times | (f) |
| 5 | Unscheduled suggestions and the recommended mark | (e) |
| 6 | Time off to People | (d) |
| 7 | Delete the stand-ins and the plan | Cleanup, once nothing reads them |

### C2. Step by step

**Step 1. The walkthrough world gets dated visits.**

| Item | Detail |
|---|---|
| New file | `design/walkthrough/visits-data.ts`: dated visits for the week of Mon Nov 23 2026 built from the world: the jobs in `jobs-data.ts` `GRID_ROWS` and the customers in `world-customers.ts`. Output `GridBlock[]` (the shape `TimeGrid` reads), a `Meta` record (customer, phone, email, point), and `ProtoJob[]` for the Unscheduled list |
| Mapping | `GridJob.id` becomes the block's `jobId`; `GridJob.who` ("Ryan Garner", "Hannah Garner", "No one yet") becomes the block's person; `GridJob.stage` `unscheduled` becomes an Unscheduled job; `today` and `scheduled` become blocks; `done` becomes `done: true` blocks in the past of the week. Andrea Dalton's repair and Season Pass visits come from `trip-fixtures.ts` (`SPRING`, `FALL`) so the pass trips on the calendar are the pass trips on the page |
| People | The calendar takes `Person` objects. Use the walkthrough's two: Ryan Garner and Hannah Garner (`WHO_OPTIONS`), not Ryan and Tech Two. Edit `scheduler-calendar-fixtures.ts` `PEOPLE` or pass the walkthrough's people into the prototype hook |
| Today | The walkthrough has three todays. Make one: set the Schedule prototype's `TODAY` (Nov 25) and the walkthrough's job pages and `WALK_TODAY` to the same day, or move the calendar's fixtures to Nov 18 week. Prefer Nov 25 for the calendar and change `job-fixtures.ts` `NOW`/`TODAY` strings in one pass; `design/walkthrough/data.ts` already imports from one place |
| Hannah's job states | A visit on the calendar for a job whose page says "Scheduled" must read Scheduled; the state names come from `src/lib/admin/jobs.ts` only |

**Step 2. The Schedule step.**

| Item | Detail |
|---|---|
| Change | `walkthrough/WalkScreens.tsx` `case "schedule"`: render the prototype screen (a new `design/WalkSchedule.tsx` that wraps `SchedulePrototype`'s hook with the walkthrough's visits and callbacks) instead of `<ScheduleScreen data={LIVE} ...>`. Keep `LIVE` for Home, Reports and Settings |
| Props to add | `SchedulePrototype` takes `onOpenJob(jobId, visitId)`, `world` (blocks, meta, unscheduled, people, today), and a `useToast`/`useUndoToast` from the shell instead of its own toast |
| Route | Add `visit?: string` to `Route` in `walkthrough/routes.ts` and a parse of `/admin/jobs?job=<id>&visit=<id>`. `RouteScreen` passes `defaultOpen={route.visit}` to `JobPagePass` (it already has that prop). For a one-trip `JobPage` there is nothing to open, so `visit` is ignored |
| Day link | A job page's "Day" chip already goes to `/admin/schedule?day=<iso>`; `{ screen: "schedule", id: day }` stays, and the prototype opens on that day |
| Keep | The walkthrough's `AdminShell`, Strip, link interception, Cmd+K search |
| What breaks | The live Schedule's List view and its tests are not used in the walkthrough any more. The List view should still be the live `VisitsList` over this world's visits, or be dropped from the walkthrough with a placeholder. `routes.test.ts` and `Walkthrough.stories.tsx` stories that click Schedule need new assertions. `src/app/_review/review-steps.ts` ids must still exist |
| Feasibility | Yes. The shell takes any screen by route. The blocks are pure props. The size of the work is step 1 (the data) |

**Step 3. The one dialog and the moved confirmation.**

| Item | Detail |
|---|---|
| Open | A block click calls `onOpenJob` (a). A block's menu, a keyboard move and a drop on the clock use the same `ScheduleDialog` only when Ryan asks for a day or a time; a plain drop moves at once and shows the moved confirmation |
| Dialog | Reuse `design/ScheduleDialog.tsx` and `SchedulePicker.tsx` unchanged for the fields (day calendar, Who, start time, crew text, instructions). Put `FindATime` inside `SchedulePicker`, above the calendar: the ranked rows, and a picked row sets day, person and time. `FindATime` needs a new prop set that reads the job's town and minutes, not the New job draft |
| (c) The default | `ScheduleDialog` today confirms with a split "Schedule and notify the customer" / "Schedule without notifying". Under (c) a move never texts on its own, so change the confirm to "Schedule" / "Move" and drop the caret. The customer sentence under the picker becomes "Andrea is not texted until you press Notify." Update `confirm-copy.ts` `footerConfirms` `Move` the same way ("Move the visit to Wed, Nov 25 at 9:00 am." with no text) and its test |
| Confirmation | After Schedule or Move or a drop: `UndoToast` (already allows two actions) reads "Moved to Thu, Nov 26, 9:00 am" with **Notify** and **Undo**. A first placement reads "Scheduled for Thu, Nov 26, 9:00 am". Notify opens `MessageDialog` ("Send a message"), channel chips and preview as (1) has them, prefilled with `moveMessage` (the "Day moved, text" template). Delete `MovedToast` and `NotifyDialog` once nothing imports them |
| Not told | A moved visit whose customer has not been told keeps the dashed edge and the mark; the words come from the told choice in "For Hannah to choose". The Unscheduled panel's Not told tab stays, with Notify opening `MessageDialog` |
| Delete | `ScheduleProtoMove.tsx`, the "Move anyway?" path becomes the dialog's own warnings list (reuse `placementProblems` and render them as a sentence under the picker; the confirm stays "Move the visit") |
| Reuse | `ConfirmDialog`, `SplitButton` (only where (1) still has it), `crew-copy.ts` (`crewText`, `notices`) |

**Step 4. New job with best times.**

| Item | Detail |
|---|---|
| Change | The header's New job opens the walkthrough's `NewJobSheet` (`WalkScreens.tsx`), not `ScheduleProtoNewJob`. After the service is chosen, a "Best times" region (`FindATime`, same component as in step 3) lists the ranked rows. Picking a row fills the sheet's Day and Start time and lights the dotted block and map pin through the `ghost` the prototype already computes |
| Files | `_screens/NewJobService.tsx` (insert the region under the Day field, behind a prop `bestTimes`), `walkthrough/WalkScreens.tsx` (pass the world's finder), `use-new-job-proto.ts` (its `found`, `ghost`, `ghostPin` move into the walkthrough as `useBestTimes`) |
| Button | "Add job". The Day stays optional: no row picked and Day empty makes an Unscheduled job. There is no "Add without a day" |
| From a row | A row in Unscheduled has "Schedule", which opens the step 3 dialog for that job |
| Jev | One office-only line of why under the top row (see step 5) |

**Step 5. Jev's three places.**

| Place | Detail |
|---|---|
| Inside New job | The first row of Best times carries one office-only line of why ("Next to an Erie visit" today). It is computed by the engine; Jev only words it. It never shows to a customer |
| Unscheduled rows | Each Unscheduled job shows a suggestion: the best day and time as a quiet line ("Thu, Nov 26, 9:00 am, Ryan") with **Schedule** (accepts: opens the step 3 dialog with that row picked) and nothing to dismiss; ignoring it changes nothing. Data: `UnscheduledJob.suggestion?: OpeningRow` in `scheduler-panels-types.ts` |
| Recommended time | The customer's calendar marks one time with `RecommendedMark`. The mark never says why. Wiring: `DayCalendar`'s `recommendedStart` and `recommendedDay` get the engine's pick (`schedule.offerDays` already returns one time marked `recommended`) |
| Never | Jev never moves a customer who has a day. No `PlanStrip`, no `use-jev-proto.ts`, no `apply-plan` action, no Ask Jev |

**Step 6. Time off in Settings > People.**

| Item | Detail |
|---|---|
| Where | `_screens/settings-tabs/People.tsx`: a row "Time off" under "Hours" in each person's card, listing each block ("Mon Nov 30, all day", "Wed Nov 25, 12 to 2 pm") with Remove, and an "Add time off" opening the existing `TimeOffDialog` fields as a small dialog with the person fixed (drop its "Person" field). Reuse `TimeField` for the times and `DayPopoverField` for dates |
| Hint | Change the Hours hint ("A day off or a dentist visit is Block time on the Schedule.") to match the word Hannah chooses |
| Calendar | Keeps `TimeOffBand`. A click on the band goes to Settings > People (the walkthrough routes `settings`; live `/admin/settings`). Remove the Schedule header's Time off button and the phone menu item |
| Data | `docs/DATA_MODEL.md` needs a row for a person's time off (who, from, to, start, end, note) before any build; the prototype's `TimeOff` type is the shape |

**Step 7. Delete and tidy.**

| Delete | Why |
|---|---|
| `ScheduleProtoVisit.tsx` | (a) the job page replaces it |
| `ScheduleProtoMove.tsx` | (b) the one dialog replaces it |
| `ScheduleProtoNewJob.tsx` | (f) the walkthrough's New job replaces it |
| `PlanStrip.tsx` and its stories and tests, `use-jev-proto.ts`, `schedule-prototype-data.ts` plan fixtures (`PLAN`), the `apply-plan` reducer case | (e) |
| `ScheduleProtoHeader.tsx` Ask Jev and Time off | (d), (e) |
| `MovedToast.tsx`, `NotifyDialog.tsx` | Replaced by `UndoToast` actions and `MessageDialog` |
| `schedule-prototype-words.ts` | Plan strip only |
| `ScheduleProtoDialogs.tsx` | Keeps only the shortcuts help; fold it into the Schedule step |

Components to reuse as they are: `TimeGrid`, `TimeBlock`, `AnytimeStrip`, `TimeOffBand`, `MonthGrid`, `MapPanel`, `UnscheduledPanel`, `CalendarKeysHelp`, `use-calendar-keys`, `TimeChips`, `DayCalendar`, `RecommendedMark`, `FindATime`, `ExternalJobDraggable`, `ScheduleDialog`, `SchedulePicker`, `MessageDialog`, `UndoToast`, `ConfirmDialog`, `StatusPill`, `RecordChip`.

### C3. Risks

| Risk | What to do |
|---|---|
| The walkthrough has no dated visits (A1 item 5) | Step 1 is the real work. Without it the calendar shows other people's customers and a click opens nothing |
| Three todays | Pick Nov 25 and change the job pages' strings once; run the walkthrough's tests |
| `onClickCapture` in `Walkthrough.tsx` intercepts every `a[href]` and `tr` | A calendar block is a `button`, so call the route function directly; do not render it as a link or the table-row rule might open a wrong record |
| `TimeGrid` drag stories are flaky under load | Run `TimeGrid.stories.tsx` alone, as the verification did |
| `ScheduleDialog` is a reviewed screen | Changing its confirm (c) changes a reviewed prototype; list it in `src/app/_review/review-steps.ts` so Hannah sees the one change |
| Job page has no per-visit focus for a one-trip job | `visit` in the route is ignored there; for a pass it opens that trip with `defaultOpen` |
| The live `ScheduleScreen` keeps its own Move and texting strip | Out of scope: the app is not changed. Live still texts on Place; the design says it will stop. Do not hide this from the build plan |
| `Chart.test.tsx` fails (a chart width of 0 in jsdom) and failed before this work | Not part of this merge |

### C4. For Hannah to choose

Only things that have no word yet. Each has two candidates made of words (1) already uses.

| # | What needs a word | Candidate A | Candidate B |
|---|---|---|---|
| 1 | The state of a moved visit the customer has not heard about (the toolbar count, the dashed block, the tab) | "Not told yet" (from "has not been told the new total") | "Not notified" (from "without notifying") |
| 2 | The button after a move that opens the message, and the button that leaves it | "Notify" with "Keep the move without notifying" | "Tell Andrea" with "Keep the move without telling Andrea" (the price change dialog's pair) |
| 3 | The name for a person's days off and blocked hours in People | "Time off" (Hannah's own phrase) | "Block time" (what the live Hours hint says now) |
| 4 | The ranked list inside the Schedule dialog and New job | "Best times" | "Soonest" (the word the customer's calendar already uses) as the first sort, with the region unnamed |
| 5 | The minutes a row adds to the drive, office only | "4 min added" | "4 min more driving" |
| 6 | The label on a time that overlaps another visit | no label, the sentence alone ("Ryan has Cheesman St at 9:00 am.") | "Waiting on customer" style pill is wrong here; use "Overlaps" in a plain sentence: "Overlaps Cheesman St at 9:00 am." |

Not for choice: the look of the recommended mark (A, B or C), already hers; and "Month", which follows "Week" and "Day".
