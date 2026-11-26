# The Schedule, audited as one product

Nov 25 2026. Audit only. No code was changed. Owner's instruction: "Go research the whole product, make sure it's holistic, right? He needs to be able to really optimize these things... Also make sure nothing is confusing." Then three lenses: "Audited for simplicity, audited for completion, audited for consistency of the other products."

## How this was done, and what it could not do

Read this first, it limits how much of the doc is "seen".

| What | Status |
|---|---|
| Storybook at 6008 | **It was up but broken.** Every story, including `screens-schedule-prototype-nov-25--week` and `admin-walkthrough-clickable--schedule-week`, shows a red Vite overlay: `Failed to resolve import ".../src/components/blocks/ServiceCardOptions.stories.tsx"` (`storybook-stories.js:202`). That file does not exist in this checkout (`ls src/components/blocks | grep ServiceCard` finds only `ServiceCard.tsx` and `ServiceCard.stories.tsx`). The server's story list is stale. It needs a restart by whoever owns port 6008, which I was told not to do |
| Screenshots at 1280 and 375 | **Not taken.** So no finding below cites a screenshot. Each cites a file and line of the component that draws it. Anything that depends on how it looks (truncation width, how crowded 360px of panel makes the week) is marked "check on screen" |
| Everything else | Read from the code that draws each screen, the fixtures it runs on, and the docs |

First fix of all: restart Storybook on 6008 so the review the owner is about to do works. Until it is restarted nobody can open the Schedule.

Short names. **Schedule** is the new prototype (`SchedulePrototype*.tsx`, blocks `TimeGrid*`, `FindATime`, `UnscheduledPanel`, `MapPanel`, `MonthGrid`, `ScheduleToast`). **Walkthrough** is the clickable admin (`design/walkthrough/`). **Live** is the real admin (`_screens/ScheduleScreen.tsx` and friends).

---

# PART 1. THE WHOLE PRODUCT, ONE SYSTEM

## 1.0 The two root causes

Almost every break below comes from one of two facts.

1. **The Schedule runs on one world, the rest of the walkthrough on another.** Schedule today is `2026-11-18` (`WALK_SCHEDULE_TODAY`, `visits-data.ts:15`). Home, Reports and Settings are "the live screens over the repo's own fixture", whose today is `2026-11-12T19:56:30Z` (`WalkScreens.tsx:50-52`, `LIVE_TODAY`) with the live snapshot's customers (Andrea Reyes) and "Tech Two". The Jobs grid, job pages and customer pages read a third source, `jobs-data.ts` rows (`next` is a string like "Mon, May 3"). So Home says it is Nov 12, the Schedule says Nov 18, and the Jobs grid says May.
2. **The Schedule has its own copies of things the app already has.** Its own move text (`moveMessage`, `schedule-prototype-model.ts:61`), its own date formatters (`dayShort` in `find-a-time-model.ts`, `rangeWords`, a second `dayLabel`/`clockLabel` in `ScheduleDialog.tsx`), its own drive times (`schedule-prototype-find.ts:19`: same town 3 min, near 15, else 25), its own placement rules (`placementProblems`, which knows hours, overlaps and time off and nothing else). The real engine (`offerFor`, `src/lib/scheduling/offer.ts`) and the real templates (`src/emails/editable.ts`) are not used.

## 1.1 One table per surface

Key: **Agrees** = same facts and words as the Schedule. **To Schedule / Back** = can Ryan get there and return.

### Home (Today, Needs action, map)

| Check | Finding | Where |
|---|---|---|
| Same facts | **No.** Home's day is Nov 12, the Schedule's is Nov 18; different customers; Home's stops are not on the Schedule | `WalkScreens.tsx:50-52`, `visits-data.ts:15` |
| Same words | Home: "By job / By person", "Ahead today", "Past its window". Schedule: "Any time", "Unscheduled (N)", "not notified". Home has no "not notified" row | `today-model.ts`, `ScheduleProtoHeader.tsx` |
| Same component | Home's map is `DayMap`; the Schedule's is `MapPanel` around the same `DayMap`. OK | `MapPanel.tsx` |
| To Schedule | Yes: "Open Schedule" on an empty day, "View schedule" in the money strip | live `HomeScreen` |
| Back | A Home stop opens the live visit **panel**; a Schedule block opens the job **page**. Two different destinations for the same visit | `RecordHost` vs `WalkSchedule onOpenJob` |
| Dead end | "N customers not notified" exists on the Schedule only. Nothing on Home says a moved customer has not been told | |
| Scheduling Needs-action rows | "not marked done", "Unscheduled jobs", "Waiting on customer" open a record in place and do not land on the Schedule at the right day | `NeedsAttention.tsx` |

### Jobs grid (Next column, statuses)

| Check | Finding |
|---|---|
| Same facts | **No.** `next` is a fixed string on a `GridJob` (`jobs-data.ts`). A visit moved on the Schedule never changes the Jobs grid's Next (only the store `walkSchedule()` changes) |
| Same words | Status words "Unscheduled", "Scheduled", "Waiting on customer" match `StatusPill`. The Schedule draws no status words at all, only marks |
| To Schedule | A job's Day chip goes to the Schedule on that day (`RecordChip kind="day"`). Good |
| Back | Block click goes to the job page. Good |
| Dead end | "Add job" with a day creates a scheduled job that **never appears on the Schedule** (finding B1 below) |

### Job page (one visit, a Season Pass, a job that needs a day)

| Check | Finding |
|---|---|
| One visit | Schedule and Move open `ScheduleDialog` with best times (`WalkBestTimes`). Same dialog the Schedule's block menu opens. Good. The page then shows a "Visit scheduled" history from `trip-fixtures.ts` text, not from the store |
| Season Pass with several visits | `WalkBestTimes` returns `null` for a job the calendar does not hold, so a pass's Schedule falls back to the **old dialog with no best times** (comment at `WalkSchedule.tsx:34`). Same button, two different dialogs |
| Needs a day | Unscheduled jobs join the store only the first time `syncWalkSchedule()` runs (`walk-schedule.ts`). A job created later in the same session appears only after the Schedule is next opened |
| Words | Page says "Visits", "Next visit", "Move" (primary before the day). Schedule's block menu says "Move", "Set a time", "Make it Any time", "15 minutes shorter". The page has no way to change length |
| Confirm | Page and Schedule both go through the same toast ("Moved to ..." with Notify the customer, Undo), because `ScheduleOverlays` is drawn once in `Walkthrough.tsx:233`. Good |

### The Schedule dialog from each entry point

| Entry | Verb and title | Best times | Notes |
|---|---|---|---|
| Block menu > Move (Schedule) | "Move the job" | yes, current day excluded | title says "job", a block is a visit |
| Unscheduled row > Schedule | "Schedule the job" | yes, the row's suggestion preselected | |
| Job page > Schedule or Move | same | yes if the calendar holds it, else the old dialog | break (see above) |
| Season Pass trip > Schedule | old dialog | no | |
| Drop from Unscheduled onto the clock | none: places directly, toast | n/a | a drop that breaks a rule opens "Move the visit" with a list of problems |
| Drag a block | none, toast | n/a | same |

Confirm button in every one: **"Schedule and notify the customer"** with "Schedule without notifying" under a caret (`ScheduleDialog.tsx:57`). Research section 8 says a move never texts and the split button is replaced by "Visit moved" with Notify and Undo. The dialog still has the split button. See fix row 6.

### New job (every entry point)

| Entry | Finding |
|---|---|
| Schedule header, Jobs header, Customers header, customer page | One `NewJob` sheet. `NewJobService.tsx` is the only place that uses `FindATime`. Good: best times appear under Day |
| Schedule header "New job" | Does not pass the screen's open day. The live Schedule's week-column "+" and Day header opened New job with that day. The prototype dropped it (`onNewJob` takes no argument) |
| Result | Unscheduled job joins Unscheduled; **a job given a day vanishes from the calendar** |

### Requests and Quotes

A request converts to a quote, a quote to a job (`WalkRequests.tsx`, `WalkQuotes.tsx`), and the job is made Unscheduled or Scheduled. The "Scheduled" case has the same B1 break. Words: "Needs a quote", "Quote sent" never reach the Schedule (correct: they have no day). Nothing on Requests or Quotes says "N jobs wait for a day".

### Customer page

Next visit and visits list come from `customer-fixtures.ts`, not the store. A visit moved on the Schedule does not change the customer page's "Next visit". The customer page's Messages block does not list the move text that Notify "sends".

### Invoices

A visit date shows on an invoice line from fixtures. No path to the Schedule. Low priority.

### Cmd+K "Days"

The live `CommandSearch` has a "Days" group that opens the live Schedule Day view. In the walkthrough, Cmd+K is the walkthrough's search. Check on screen whether "Days" lands on the new Schedule at that day (`route.id` is passed as `day`, so it should).

### Settings > People and Services

| Item | Finding |
|---|---|
| People: working days, hours | The Schedule reads them (`worksOn`, `hoursOf`). Same data. Good |
| People: time off | Where Hannah said it lives. The Schedule shows a band; the band opens Settings, People (`onTimeOffClick`). Good path both ways, but the aria-label is "Time off, change it in Settings: Ryan off 12 to 2 pm", and on a phone there is no hover to tell you a click leaves the screen |
| People: "Most per day, by kind" | The Schedule never reads it. A day can be filled past the cap with no warning (`placementProblems` has no cap check) |
| Services: minutes | The Schedule's block length comes from `MINUTES_OF[kind]` in `visits-data.ts`, not from Services. Change Minutes in Settings and nothing on the Schedule changes. Block menu "15 minutes shorter/longer" changes the visit's own length with no word that it is not the service's |
| Services: bookable dates | `placementProblems` and `FindATime` ignore them. The office may book anything (decided), but nothing says "outside this service's dates" |

### Messages

| Check | Finding |
|---|---|
| Template used | **No.** `moveMessage` builds "Trailhead: your repair moved to Thu, Nov 26 at 9:00 am." by hand. The shipped `date-moved` text (`editable.ts:46`) is "your {service} moved to {day} at {time}." with `{who}`, the signed visit link, "Doesn't work? Pick another day:" and the one-line note from Move. Same first words, but the Schedule's version has no link, no who, and ignores Settings > Messages edits |
| On my way, day before, two weeks out | The Schedule has no "On my way" and no way to see which texts are queued for a visit |
| Opt-out words | Shipped first-text rule ("Reply STOP...") is not in the prototype's message |
| Email | Notify offers a channel from the customer's data. Fine |

### Customer's side

| Check | Finding |
|---|---|
| Booking form day and time step | Uses `DayCalendar` + `TimeChips` + `RecommendedMark`. Office uses the same `DayCalendar` and `TimeChips` inside "Another day". Shared. But the office's ranked list says "Recommended" in words and the customer's mark has none, as decided. Fine |
| "Customer can change online until Sun, Apr 26, 11:59 pm" | Only in the live visit panel (`visit-panel-model.ts:93`). The Schedule's block, dialog and "Move the visit" never say whether a move falls inside the customer's 24-hour window. A move inside it is the one that most needs a text |
| Reschedule and Cancel | Customer's own changes raise a Home row "Customer change". The Schedule has no mark for a visit the customer changed or cancelled. A cancelled visit: no state on the clock |
| Account visit page | Says "We'll text your window the day before"; the Schedule shows an exact `9:00 to 11:00 am` range on every block and calls it the visit's time. The office sees a time the customer was never told until the day-before text. Nothing on the block says whether the time is promised, told or only planned (live had `timeBooked` / `windowTold`) |
| Customer walkthrough | Separate world; no link to the admin Schedule. Acceptable |

## 1.2 Single consistency table (lens 3)

Each row is one thing the Schedule must share with the other parts.

| Thing | Rest of product | Schedule | Verdict |
|---|---|---|---|
| Page header | `PageHeader` with title, context, one filled primary | same block, but **three** header rows: title row, toolbar row, panel toggles in toolbar | Agrees on the block; denser |
| Date format | `dayLabel` "Thu, Oct 14", `shortDate` "Oct 4" (`format.ts`) | `dayShort` (second formatter), `rangeWords`, `whenWords`, a third `dayLabel` in `ScheduleDialog.tsx` | Same output, 4 formatters |
| Time format | `clockLabel` "8:00 am", customer "8 to 10 am" | "9:00 to 11:00 am" ranges on blocks (`timeRange`, `clockWords`), "9 am" in the gutter | Agrees in shape; one formatter needed |
| Duration | `hoursWords` "3 h", "1 h 30 min" | uses it in Unscheduled, but Day header says "5 stops, 15 h 30 min open" | Agrees; but see Part 3 |
| Person names | Full name in chips, `firstNameOf` for customers | initials "RG", "HG" in week headers and blocks, first names in Day | Initials are new |
| Status pills | `StatusPill`: Unscheduled and Waiting gold, Scheduled and Today navy, Done green | Schedule draws no pills: grey+check = done, clock icon = waiting, dashed edge = not notified, red outline = conflict | Different system for the same states |
| Status words | "Unscheduled", "Waiting on customer", "Done" | "not notified" (told words in `docs/DESIGN.md` say "has not been told") | Mixed: the app's own told-words vs "notified" |
| Colours | Orange, navy, green are area/person colours; gold = needs attention; red = failed | person colour = left bar; warning (gold) = not notified; red outline = conflict; red dot = now | Reuse of gold and red meaning is consistent; the person colour doubles as nothing else. OK |
| Dialogs | `ConfirmDialog` with a named confirm and a quiet twin under a caret | `ConfirmDialog` for Move and Schedule; `MessageDialog` for Notify | Agrees |
| Toasts | `UndoToast` 10 s with Undo: "Moved to Thu, Oct 14, no text sent." | `ScheduleToast` on `ToastBar`: "Moved to Thu, Nov 26, 9:00 am" + Notify the customer + Undo | Agrees; needs "no text sent" |
| Empty states | `EmptyState` (title + one line) | Uses `EmptyState` in Unscheduled, Find a time. **List view is a placeholder sentence** | Breaks once |
| Header layout | One filled primary, outline secondaries | New job primary. But a "not notified" ghost button, two toggle buttons and a segmented control are on the toolbar | Busier than Jobs or Home |
| Customer language | "Customer", first name; "Notify" is used by Jobber; the app says "tell" | "Notify the customer", "not notified", "Notify all", "Don't notify" | App says "Tell Beth", "has not been told" (`docs/DESIGN.md`); Schedule says notify. The reconciliation doc chose "notify" for the verb; keep one |
| Opening a visit | Page from the Jobs grid; panel from Home and live Schedule | page | Home differs |
| Map | `DayMap`, numbered pins, person colours | same | Agrees |

## 1.3 Ranked breaks in continuity

| # | Break | Why it ranks here |
|---|---|---|
| B1 | **A job created in New job with a day never shows on the Schedule.** `syncWalkSchedule()` only adds rows whose stage is "unscheduled" (`walk-schedule.ts`) | Ryan books a caller for Thursday and Thursday is empty. The one thing the Schedule is for |
| B2 | **Two different "today" and two different worlds.** Home is Nov 12 with other customers; Schedule is Nov 18 | Every Home number disagrees with the calendar next to it |
| B3 | **Moves on the Schedule change nothing else.** Jobs grid Next, customer page Next visit, job-page history, Messages block are fixture strings | A move leaves four screens saying the old day |
| B4 | **A Season Pass visit gets a different Schedule dialog** (no best times, no drive minutes) than a one-off | Same button, two dialogs, on the job that matters most in spring |
| B5 | **The move text is hand-written and leaves Settings > Messages.** No link, no who, ignores edits | Ryan edits the template and the Schedule ignores it; a customer would get a text with no way to change the day |
| B6 | **The Schedule never says whether the customer is inside the 24-hour window** and never marks a visit the customer cancelled or changed | The two rules the customer's account enforces are invisible in the tool that moves the visit |
| B7 | **Dialog confirm still reads "Schedule and notify the customer"** against the decision that a move never texts and the split button goes | Contradicts research section 8 |
| B8 | **Same visit, two doors:** Home opens a panel, Schedule opens the page | Muscle memory |
| B9 | **Settings changes not read:** Minutes, Most per day, bookable dates | A person who tunes Settings sees no effect |
| B10 | **Initials, "notified" and a dashed edge** are new words and marks where the app already says full names, "told" and pills | Extra vocabulary |

---

# PART 2. CAN RYAN REALLY OPTIMIZE?

**Short answer: not yet.** The Schedule shows where visits are. It does not show what the driving costs. The only drive number on the screen is "adds N min" in the Find-a-time list and the dialog, and it is a made-up fixture (3, 15 or 25 min by town pair, `schedule-prototype-find.ts:19`), labelled "Estimated drive times". Nothing shows the drive between two consecutive stops, a day's total, or a week's total. "Order the day" is in the design docs and is not on any screen (grep for it in `TimeGrid*`, `ScheduleProto*`, `MapPanel` finds nothing).

## 2.1 Each job to be done, from what is on screen

| Job | Verdict | What I saw in the code |
|---|---|---|
| P1 caller: best days and times with added drive | **Done well, in the list** | `FindATime` with Recommended / Soonest / Least driving, "adds N min", a "next to" line. Weak: the reason line (`nextTo`) is kept only on the recommended row (`schedule-best-times.ts:21`), so rows 2 and 3 have a number and no why. The number is a fixture, not the engine |
| P2 caller can only do Thursday | **Done weakly** | "Another day" is a closed `<details>` with the calendar and Who and Start time chips. Picking Thursday shows what is booked that day in one grey line and open starts as chips. It does not rank Thursday's starts by added drive, so Ryan has to guess which chip is cheapest. "Show all times (N more)" lists rule-breaking rows with the engine's reason: good |
| P3 not sure, save without a day | **Done well** | New job with Day empty makes an Unscheduled job (`NewJob`) |
| W1 clock with real lengths and gaps | **Done** | `TimeGrid`: hour gutter, blocks of true height, Any time strip. Gaps are only the blank space; no number |
| W2 map of the day, stops in order | **Done weakly** | `MapPanel` draws the open day (or today's, or Monday's: `mapDayOf`). In Week view it shows one day, not the week, and the title is a date with no word that it follows the week. Stop numbers exist (`stopOrder`) |
| W3 unscheduled in a list and on the map, drop where it fits | **Done** | `UnscheduledPanel` with Suggested line, drag on desktop, hollow pins when the panel is open. Weak: not a way to place several at once |
| W4 drag, see what breaks, undo, choose to tell | **Done well** | drop checks `placementProblems`, "Move the visit" lists them, toast with Notify the customer and Undo. Weak: breaks are overlap, hours, time off only (no 24-hour window, no cap, no drive) |
| W5 one button to order a day | **Missing** | no button, no menu entry, no keyboard shortcut |
| W6 block an afternoon | **Done weakly** | Time off is only in Settings > People (owner's decision). The Schedule draws the band. A drag on the clock sets a span (`span` in `TimeGridColumn`) that opens Settings: check on screen |
| W7 rain or running late | **Missing** | no Rain out, no "Push back N minutes". `Resize` extends a block but nothing slides the rest of the day |
| W8 two people side by side | **Done** | Day view columns per person; Week splits each day by person. Weak: initials only on week |
| R1 today's stops in order on phone with the map | **Done weakly** | `TimeGridPhone` has a Day strip and a Person strip and the stops; Map is a sheet, one at a time. No "next stop" line, no drive to it |
| R2 a visit runs long | **Missing** | same as W7 |
| B1 fill days by neighbourhood | **Missing** | Colour is by person, not town. The town is text inside a block at "full" detail only. No cluster, no grouping, no towns on the week header (Month has them) |
| B2 never break a promise | **Done weakly** | Overlap and hours checked. The customer's 24-hour window, a booked exact time, and "must be home" confirmation are not |
| B3 cost near nothing | n/a here | |

## 2.2 What an optimizer needs, and whether it is visible

| Need | On screen? | Notes |
|---|---|---|
| Drive minutes between consecutive stops | **No** | Not on blocks, not between them, not in the Day column |
| A person's total drive for a day, for a week | **No** | `dayFill` gives stops and open hours only |
| Stop order | **Partly** | Map pins are numbered. Blocks show a clock time, not a number. Anytime chips are "in the order the day will be driven" (AnytimeStrip.tsx) but with no number and no drive |
| Put the day in the best order, promised times fixed | **No** | Designed (design doc 2.x, Housecall Pro lock icon, Jobber pin first/last) and not built. There is no "locked" mark either |
| Group by town on the calendar | **No** | colour = person |
| Group by town on the map | **No** | person-coloured pins only |
| Route line per person on the map | **Yes** | the person colour carries the route (`MapPanel.tsx:11-12`); no drive minutes on it |
| Map usable beside the week | **Yes at 1280, only one panel at a time at 375** | 360px column holds both panels stacked at 1280; check on screen how small each gets (`GRID_HEIGHT` is fixed) |
| Gaps and open time | **Partly** | "15 h 30 min open" in a week header sums both people's open hours with no unit of who. A single gap is not labelled |
| Warning before a move that adds a lot of driving | **No** | `placementProblems` has no drive term |
| Best-times list explains itself | **Partly** | "adds N min" has no noun after it (min of what?). The reason line only on the top row. "Estimated drive times" is a caption not a mark on each number |
| Alternative sorts | **Yes** | Recommended / Soonest / Least driving (the rows reorder; the preselected row does not move) |
| Suggestion on Unscheduled and schedule several | **Suggestion yes, many no** | "Suggested: Thu, Nov 26, 9:00 am, Ryan Garner" per row (`suggestionFor`). Each row is placed one at a time. The live Schedule had "Schedule all N" with a preview; the prototype dropped it |
| A day that is full | **No word** | open hours go to "0 h open"? A full day is not marked and not refused (no cap) |
| Visit runs long, or rain | **No** | see W7 |
| Does the customer's recommended time steer toward tight routes | **Can't tell** | The customer mark is wired to the same `recommendedId` rule in the walkthrough, but the Schedule's Recommended is a fixture score; the real `offerFor` ranks by town, then within 10 minutes. The two are not the same function (root cause 2) |

## 2.3 Ranked gaps with the smallest design that fits

Ranked by driving or time saved. Nothing here moves a customer who has a day, and nothing messages a customer on its own.

| Rank | Gap | Smallest design | Extend |
|---|---|---|---|
| 1 | **Drive minutes between stops, and the day's total** | A quiet line between consecutive blocks in a Day column ("12 min drive") using the same drive function the list uses; the Day header caption becomes "4 stops, 38 min driving, 3 h open". Week header caption becomes "5 stops, 1 h 10 min driving". No new control | `TimeGridColumn` (gap row), `DayHead` caption, `columnsFor` in `schedule-prototype-view.ts`, `fillWords` in `src/lib/admin/` |
| 2 | **Order the day** | One outline button in the Day view header, "Order the day". Opens the preview dialog the live Schedule uses for Schedule all (`PlaceAllDialog` / `ConfirmDialog`): "Moves 3 stops with no set time. Saves 22 min of driving. Stops with a time stay." Confirm gives the toast with Undo. Never texts (only Any time stops move, so nothing was promised) | `ConfirmDialog`, `AnytimeStrip` (only these move), existing `moveOutcome`; Jobber's lock rule |
| 3 | **Warn before a drag that adds driving** | Add one line to `placementProblems`: "Adds 25 min of driving." shown in the existing "Move the visit" dialog, and as the `title` of the dropped block. No new dialog | `placementProblems`, `ConfirmDialog` |
| 4 | **Explain "adds N min"** | Rename to "adds 3 min driving"; put the reason line on every row, not only the top; replace the caption "Estimated drive times" with a quiet "est." after each number until the road lookup answers | `FindATime` `Row`, `schedule-best-times.ts` |
| 5 | **Rank Thursday's starts by added drive** inside "Another day" | After picking a day, show the same `FindATime` rows filtered to that day instead of bare chips. One list, one component | `SchedulePicker` `AnotherDay`, `FindATime` |
| 6 | **Towns visible** | Show the town as a second line on blocks at "line" detail (already in `detail === "full"`), and give the week header "Erie 3, Lafayette 2" (`townsWords`, already in Month). Colour stays by person | `TimeBlock`, `columnsFor` |
| 7 | **Schedule several unscheduled** | Bring back "Schedule all N" in the Unscheduled panel footer with the existing preview dialog listing each placement; confirm marks them not told, toast Undo | `UnscheduledPanel` footer, `ConfirmDialog` |
| 8 | **Running late or rain** | One Day-view menu entry "Push back from here": pick a block, "Push back 30 minutes" moves it and the later Any-time and timed stops of that person by 30 minutes, then the toast offers Notify the customer for each moved. Only on the day, only Ryan's own stops. Rain out: "Move the day" opens the one Schedule dialog for each stop one at a time (no auto-moving) | `useBlockActions`, `ScheduleToast` |
| 9 | **Week map** | Map panel in Week view lets the day chip row choose which day to show (today by default) with the day written in the title ("Map, Wed, Nov 25") | `MapPanel` `description`, existing chips |
| 10 | **Full day** | Day head caption "Full" (no word "0 h open"); a drop into a full day is flagged in `placementProblems` ("Ryan has no room that day") | `placementProblems`, `dayFill` |

Items 1 to 4 are the ones that change the number Ryan cares about. The rest only matter once those exist. The real engine's drive times (Mapbox, decided) replace the fixture without changing any screen above.

---

# PART 3. WHAT IS CONFUSING

All locations are code locations; "check on screen" means the width needs a Storybook look once it is restarted.

## 3.1 Labels, counts and marks

| # | Where | What a first-time user sees | Why it confuses | Fix in existing words |
|---|---|---|---|---|
| C1 | Day head caption, `TimeGridHeader` + `fillWords` | "5 stops, 15 h 30 min open" over a Week day with two people | The open time is both people's, summed. No unit of "who". Looks like one person has 15 hours | In Week show each person's own open time under their initial, or say "15 h 30 min open, 2 people"; Day view already per column |
| C2 | Week day heads | "RG" "HG" (`TimeGridHeader.tsx` `p.initials`), `title` shows the name only on hover | Initials are new; phone has no hover | Use the first name when it fits ("Ryan"), initials only when it does not, as Day view does |
| C3 | Find a time rows | "adds 3 min" | Added to what? Drive, or the day? | "adds 3 min driving" |
| C4 | Find a time | "Estimated drive times" caption above the list | Reads as a note about a different part; the user cannot tell which number is estimated | "est." after the number or hide when the road lookup is live |
| C5 | Find a time | "Recommended" pill on one row; the other rows have no reason line | Looks like the others are worse for no reason | Show the reason line (`nextTo`) on every row |
| C6 | Dialog | "Another day" `<details>` closed by default | The label does not say it holds the calendar and who and start time | "Pick another day" with the first chip row labelled; keep closed |
| C7 | Unscheduled rows | "Suggested: Thu, Nov 26, 9:00 am, Ryan Garner" | Person's full name next to a day; the app says first name to customers only. Not a link; tapping the row does nothing but the button next to it | Make the line the Schedule button's own preview: "Schedule for Thu, Nov 26, 9:00 am" opens the dialog |
| C8 | Toolbar | The bell ("not notified", `NotTold`, `size-4`) in a gold ghost button "3 customers not notified" | Bell + gold + dashed edge are three marks for one state; the word "notified" differs from the app's "told" | Keep one mark (the gold dot) and the app's word: "3 customers not told" |
| C9 | Block | Dashed left edge | Needs the legend to be known; only the Month grid has one ("A move not notified") | A one-line legend under the clock: person colour, dashed = not told, clock = waiting, grey check = done. Or the block says it in its aria and the legend opens from "?" |
| C10 | Block | Red outline (`outline-destructive`), reason only in the `title` tooltip | Phone has no hover. The reason (the sentence "Ryan has Cheesman St at 9:00 am.") is hidden | Show the sentence on tap (the block's menu or the aria live line already exists) |
| C11 | Block | Dotted/dashed ghost "planned-from" | A ghost of the old place during a drag. After the drag it is a dashed navy box: looks like a second visit | Keep it only while dragging, or label it "was 9:00 am" |
| C12 | Block | Clock icon (waiting on customer), check icon (done) | Icon-only, bottom right, 3.5 | Same legend; the word is the StatusPill's "Waiting on customer" in the block aria |
| C13 | Time off | Hatched band with the label in `title` and a click that leaves the Schedule | No sign that a click goes to Settings | Say it in the band: "Ryan off 12 to 2 pm. Change in Settings" (already in aria; make visible on touch) |
| C14 | Day head | Red dot in the hour gutter | The now line, no label | Fine; give it the word "Now" in the aria |
| C15 | Month cell | A dot per person, "Erie, Lafayette +1" | `+1` of what; narrow fallback | `townsWords` where it fits |
| C16 | Anytime strip | Chips with "Briggs St, spring turn-on, 1 h" in a row above the clock | A row of chips is not "the order the day will be driven" and has no numbers | Number the chips 1, 2, 3 |
| C17 | Block menu | "Set a time" / "Make it Any time" / "15 minutes shorter" / "15 minutes longer" | "Shorter" changes the visit's own length, not the service's; nothing says Settings' Minutes is unchanged | After a resize the toast says "Now 11:00 am to 12:30 pm"; add "for this visit" |
| C18 | Dialog | "Move the job" for a block that is a visit; "Schedule the job" | Job and visit are two things in the app (a job has visits) | "Move the visit" / "Schedule the job" for a job with no day |
| C19 | Dialog | "The customer hears about Ryan, the first one chosen." | Reads as a bug | "The customer is told Ryan is coming." |
| C20 | Dialog | "Text Hannah that this is assigned" checkbox with a preview and "Instructions for the crew (optional) 0 of 140" | Four things Ryan did not ask for on a move | Keep only when more than one person; otherwise hide |
| C21 | Month and toolbar | "Month" and "List" next to "Week", "Day" | **List is a placeholder**: "The List view stays as it is today." (`ScheduleProtoCalendar.tsx`) | Hide List until it exists, or draw it (see Completion) |
| C22 | Phone More menu | "Keyboard shortcuts" | A phone has no keyboard | Hide below `md` |
| C23 | Phone, Week view | No Today button | The Previous/Next/Today group is `hidden md:flex` except in Day view (`ScheduleProtoHeader.tsx`); the More menu has Previous and Next only | Show Today on a phone |
| C24 | Toolbar | "Unscheduled (4)" and tab "Unscheduled" inside the panel titled "Unscheduled (4)" | The same word three times in one glance | Panel title only; tabs "Waiting for a day" / "Not told" |
| C25 | Panel tabs | "Not notified 3" as a tab in the same panel and again as a toolbar button | Two doors to one list | Keep the toolbar button, drop the tab or the button |
| C26 | Unscheduled | Sort "Oldest / Newest / Name" | Three sorts for 4 rows | Keep Oldest only until the list is long |
| C27 | Block text | "Laurel S...", "Repair, Lafa..." (`truncate`) | Width of a 15-minute block; the street is cut where it means something | Check on screen; show the town only at the line detail, the street always, or the full text in a tap panel |
| C28 | Toast | "Moved to Thu, Nov 26, 9:00 am" | Does not say that no one was told | "...no text sent." as the live Undo toast does |
| C29 | Not-told after a dialog confirm | The dialog button was "Schedule and notify the customer"; the toast then offers Undo alone and the visit is told | Two meanings of notify: it opens no message, it just marks told | Use Jobber's: Notify opens the message first; the dialog's confirm is "Schedule" |
| C30 | Notify | The Message dialog's body is typed by the Schedule, no link | The customer receives a text whose only action is to reply | Use `date-moved` from `editable.ts` |
| C31 | Map | A map beside a week with no label of which day | Title is "Map"; description is a date only (`day`) | "Map, Wed, Nov 25" |
| C32 | Unscheduled panel at 1280 and Map stacked in one 360px column | Two panels fight for the same fixed height (`GRID_HEIGHT`) | Check on screen; each gets half | Open one by default, the other on request (it already is a toggle) |

## 3.2 States with no explanation

| State | Finding |
|---|---|
| Empty week | `EmptyState` exists in `Screens/Schedule prototype` as a story "empty week"; calendar draws just a blank clock otherwise |
| Searching | Skeleton rows and "Finding times" (sr-only) good |
| No time open | "No open day before Nov 30. Pick a day yourself." Good |
| Outside the six towns | "Outside the six towns. Pick a day yourself." Good, and matches the offer rule |
| Nothing notified | "Every customer has been notified." |
| Error state | None in `FindATime` or the dialog. A failed road lookup has no state |
| Drop refused | Dialog lists problems, then "Move the visit". Good |

---

# LENS 1. SIMPLICITY

Owner's rule: only the words that are needed. Counts are from the code; "check on screen" for what wraps.

## Control counts

| Screen | Controls a first look needs | Controls present | Count |
|---|---|---|---|
| Header + toolbar, 1280 | New job, Prev, Today, Next, Week/Day/Month, Unscheduled | + List, Map, "N not notified" | 11 (1 filled, 10 outline or ghost) |
| Header + toolbar, 375 | New job, Week/Day/Month | + More (3 items), Unscheduled, Map, not-notified chip, in Day view the Prev/Today/Next | 8 to 11 |
| Week, 1280 | Blocks | + a hover-only "..." per block (5 actions), a + per day column in the live one | per block 2 |
| Unscheduled panel | Rows with Schedule | tabs (2), sort (3), row Schedule, row drag, Notify, Don't notify | 4 + 2/row |
| Map | pins | chips per person + Unscheduled chip | 3 |
| Find a time | rows | sort (3), Show all, Book it anyway, "Another day" | 6 |
| Schedule dialog | pick, confirm | best list, Another day (calendar, Who chips, start chips), crew checkbox, instructions, split confirm | 12 to 30 |

Jobber's new schedule (research doc section 3) has a segmented Month/Week/Day, an Unscheduled panel button with a count and a Map button. Ours has all of them plus List, "not notified", Time off (now in Settings), Keyboard shortcuts, sorts and the not-told tab. Jobber has no "not notified" chip; it uses the toast.

## What to remove, merge or hide

| # | Item | Action | Job lost? |
|---|---|---|---|
| S1 | List view | Remove until built | none (a placeholder) |
| S2 | Not notified tab **and** toolbar button | Keep the button only | none |
| S3 | Unscheduled sort (3) | One order, Oldest | none until 10+ jobs |
| S4 | Panel title and tab both "Unscheduled" | One name | none |
| S5 | Find a time sort of three | Keep, but the preselected row does not move; or two sorts, Soonest and Least driving, and the Recommended pill stays | none |
| S6 | Crew checkbox, instructions, "first one chosen" line | Show only with 2 or more people | none for Ryan alone |
| S7 | "Book it anyway" checkbox | Replace with the "Move the visit" dialog's list that already exists | none, one fewer pattern |
| S8 | Keyboard shortcuts in the phone menu | Remove below `md` | none |
| S9 | Block "..." menu items "Set a time" and "Make it Any time" | One item: "Time..." opening the Schedule dialog (reconciliation row said this) | none |
| S10 | Block "15 minutes shorter/longer" | Resize by drag only, or keep menu on phone | none |
| S11 | Initial avatars in blocks and heads | Colour only, name in the Day view | none |
| S12 | Week day head: count chip and caption | One line: "5 stops" and the caption on hover is not available on a phone, so keep the caption only | none |
| S13 | Three marks for not told (dashed edge, bell, gold) | Gold dot only | none |
| S14 | Map chips (person + Unscheduled) | Hide when there is one person | none |
| S15 | `Another day` calendar and Who and start chips | Keep behind the disclosure (already) | none |
| S16 | Words "Customer not notified" aria and visible both | visible word once | none |

## Steps that could be one
Schedule dialog "Pick a time" then "Notify" then message is three steps. One path: dialog confirm "Schedule", toast "Scheduled for Thu... Notify the customer / Undo". Already designed; the dialog's old split button is the extra step.

---

# LENS 2. COMPLETION

## Every state of each block

| Block | Empty | Loading | Error | One | Many | Result and undo |
|---|---|---|---|---|---|---|
| `TimeGrid` Week | clear grid, no sentence | n/a | none | fine | overlaps cascade 12px on touch; on desktop check lanes | drag/resize: toast Undo |
| `TimeGrid` Day | same | n/a | none | | | |
| `MonthGrid` | empty cells | | | | selects a day, opens Day | none |
| List | **placeholder text** | | | | | |
| `UnscheduledPanel` | `EmptyState` | | none | | scroll | placing: toast Undo |
| `MapPanel` | check on screen: no stops message? | | tiles fail: none | | | |
| `FindATime` | "No time open" | skeletons | **none for a failed lookup** | | list | pick: radio only |
| `ScheduleDialog` | needs best | none | none | | | confirm: toast Undo |
| `ScheduleToast` | | | | | | auto-closes in 10 s; the visit keeps "not told" |
| `MessageDialog` | | | **Send always succeeds** (clears mark) | | Notify all goes one at a time | no undo after Send |

## Unfinished things

| # | Thing | State |
|---|---|---|
| U1 | **List view** | placeholder sentence |
| U2 | **New job with a day** | never appears on the calendar (B1) |
| U3 | **Order the day, Block time, Rain out, Push back** | not built |
| U4 | **Schedule all N** | live had it, prototype does not |
| U5 | **Month** | a click opens Day; no way back except the segmented control; a month with no data shows empty cells |
| U6 | **Map** | one day only; no routes' drive time; unscheduled pins only when the panel is open |
| U7 | **Phone parity: drag from Unscheduled** | `dragWrap` only when `wide` (>= 1280). On phone the Schedule button is the only way; fine, but a drop onto a time is impossible; Set a time from the menu is |
| U8 | **Phone parity: Today** | missing in Week/Month/List |
| U9 | **Phone parity: block menu** | always visible, 44px: good. At 1280 it is hover-only (`opacity-0 group-hover:opacity-100`): a keyboard user sees it on focus; a touch laptop does not |
| U10 | **Keyboard reach** | Tab to a visit, Space to pick up, arrows, Enter (documented in `CalendarKeysHelp`); Find a time is a radiogroup with arrows; shortcuts d, w, m, t, j, k exist. The Unscheduled panel rows are not a drag by keyboard; the Schedule button is |
| U11 | **Drawn but does nothing** | block `title` conflict text; "Month" cell dot; Map chips without a pin; time-off band click does nothing outside the walkthrough (`onOpenSettings` optional) |
| U12 | **Undo after Send** | none |
| U13 | **Real data** | every drive time is fixture; the Schedule's offer is not `offerFor` |
| U14 | **Error and loading for the road lookup** | no state |
| U15 | **Cancelled and customer-changed visits** | no look on the clock |
| U16 | **"Must be home" / waiting on customer** | the clock icon exists; the "Waiting on customer" move text ("Reply YES or pick another day") does not |
| U17 | **A visit with a booked time vs only planned** | one look for both |
| U18 | **Customer's 24-hour window** | not shown or warned |
| U19 | **Where Cmd+K "Days" lands** | check on screen |
| U20 | **Walkthrough Home** | not on the Schedule's world |

---

# THE FIX LIST

Size: S small, M medium, L large. **Lens**: 1 simplicity, 2 completion, 3 consistency, O optimizer (Part 2), C confusion (Part 3). ★ = one engineer's next single pass. "Decision" refers to the six at the end.

| # | What | Where | Why | Size | Lens | Decision | ★ |
|---|---|---|---|---|---|---|---|
| 1 | Restart Storybook 6008 (stale story list references a missing file) | whoever owns the server | nothing can be reviewed | S | 2 | no | ★ |
| 2 | A job made in New job with a day joins the calendar as a visit | `walk-schedule.ts` `syncWalkSchedule` (add scheduled rows) | B1 | S | 2, 3 | no | ★ |
| 3 | Put Home on the Schedule's world and day (Nov 18), or pass the Schedule's store to `HomeScreen` | `WalkScreens.tsx` LIVE, `LIVE_TODAY` | B2 | M | 3 | no | ★ |
| 4 | A move on the Schedule also updates Jobs Next, customer Next visit, job-page history, Messages block | `walk-schedule.ts`, `jobs-data.ts`, `customer-fixtures.ts` | B3 | M | 3 | no | |
| 5 | A Season Pass visit's Schedule gets the same dialog with best times | `WalkBestTimes` (`WalkSchedule.tsx`) | B4 | M | 3 | no | ★ |
| 6 | Dialog confirm becomes "Schedule" / "Move"; telling happens through the toast's Notify | `ScheduleDialog.tsx`, `ScheduleToast` | B7, C29 | S | 3, C | no | ★ |
| 7 | Move text from the `date-moved` template with who, link, STOP rule, the note | `moveMessage` -> `fillTemplate` in `src/emails/editable.ts` | B5, C30 | M | 3 | no | |
| 8 | Show the customer's 24-hour window: a line in the dialog and "Move the visit" ("Inside the customer's 24 hours, tell them"), and "Customer can change online until ..." on the block's panel | `placementProblems`, `ScheduleDialog`, `withinCutoffOn` | B6 | M | 3, O | no | |
| 9 | Drive minutes between consecutive stops and the day's driving total | `TimeGridColumn`, `DayHead`, `columnsFor`, `fillWords` | O1 | M | O | no | ★ |
| 10 | "Order the day" button in Day view with a preview and Undo | `ScheduleProtoHeader`, `ConfirmDialog`, `AnytimeStrip` | O2 | L | O | no | |
| 11 | Warn "Adds N min of driving" before a drag | `placementProblems` | O3 | S | O | no | ★ |
| 12 | Find a time: "adds N min driving", reason line on every row, "est." on the number | `FindATime` `Row`, `schedule-best-times.ts` | C3-C5 | S | C, O | no | ★ |
| 13 | Day pick inside "Another day" shows ranked rows for that day | `SchedulePicker` | O5 | M | O | no | |
| 14 | Hide the List view until built (or draw it from the live List) | `ScheduleProtoHeader` `VIEWS` | U1, S1 | S | 1, 2 | **D1** | ★ |
| 15 | Week head: per-person open time or "2 people"; first names where they fit | `TimeGridHeader` | C1, C2 | S | C | no | ★ |
| 16 | Phone: add Today; hide Keyboard shortcuts below `md` | `ScheduleProtoHeader` | C22, C23 | S | C, 1 | no | ★ |
| 17 | A legend line for the clock's marks (colour, dashed, clock, check, hatched) | new line in `TimeGrid` footer | C9-C13 | S | C | no | ★ |
| 18 | Conflict reason visible on tap (not only `title`) | `TimeBlock` | C10 | S | C | no | |
| 19 | One word for "not told" and one mark | `NotTold`, `UnscheduledPanel`, header, `MonthGrid` legend | C8, S13 | S | 3, 1 | **D2** | ★ |
| 20 | Remove the "Not notified" tab or the toolbar button, not both | `UnscheduledPanel`, `ScheduleProtoHeader` | S2 | S | 1 | no | |
| 21 | Unscheduled: sort to one; panel title only | `UnscheduledPanel` | S3, S4 | S | 1 | no | |
| 22 | Crew checkbox and instructions only with 2+ people | `SchedulePicker` | S6, C20 | S | 1 | no | |
| 23 | Dialog titles "Move the visit" / "Schedule the job" | `ScheduleDialog` | C18 | S | 3 | no | |
| 24 | Toast adds "no text sent" until Notify | `ScheduleToast` | C28 | S | 3 | no | |
| 25 | Use `shortDate`, `dayLabel`, `hoursWords` imports; delete the Schedule's four formatters | `find-a-time-model.ts`, `ScheduleDialog.tsx`, `schedule-prototype-view.ts` | consistency | M | 3 | no | |
| 26 | Replace fixture drive times and placement with `offerFor` and the Mapbox lookup | `schedule-prototype-find.ts`, `schedule-best-times.ts` | root cause 2 | L | 3, O | no | |
| 27 | Read Settings: Minutes from Services, Most per day, bookable dates | `visits-data.ts` `MINUTES_OF`, `placementProblems` | B9 | M | 3 | no | |
| 28 | Schedule all N with a preview | `UnscheduledPanel` footer | O7, U4 | M | O, 2 | no | |
| 29 | Map titled with its day; day chips in Week view | `MapPanel` | C31, O9 | S | C | no | |
| 30 | Town on the week head and on blocks | `columnsFor`, `TimeBlock` | O6 | S | O | no | |
| 31 | Number the Any-time chips 1, 2, 3 | `AnytimeStrip` | C16 | S | C, O | no | |
| 32 | Push back from here / rain out through the Schedule dialog | `useBlockActions` | O8 | L | O | **D3** | |
| 33 | A cancelled or customer-changed visit has a look and an Undo | `TimeBlock` | U15 | M | 2 | no | |
| 34 | Hide the "same visit, two doors": Home opens the job page like the Schedule | `RecordHost` in walkthrough | B8 | M | 3 | **D4** | |
| 35 | Error state for the road lookup in Find a time | `FindATime` | U14 | S | 2 | no | |
| 36 | Initials and first names rule for people in chips | `TimeGridHeader`, `TimeBlock` | C2, S11 | S | 1, 3 | no | |
| 37 | Hide the Map's person chips when there is one person | `MapPanel` | S14 | S | 1 | no | |
| 38 | Schedule header "New job" passes the open day | `ScheduleProtoHeader`, `onNewJob(day)` | continuity | S | 2, 3 | no | |
| 39 | Block text truncation: street first, town at line detail | `TimeBlock` | C27 | S | C | **D5** | |
| 40 | What a "full" day says, and its cap | `dayFill`, `placementProblems` | O10 | M | O | **D6** | |

The ★ rows are 2, 3, 5, 6, 9, 11, 12, 14, 15, 16, 17, 19: twelve, plus row 1 as the precondition.

## The genuine decisions (six, two options each)

| # | Question | Option A | Option B |
|---|---|---|---|
| D1 | The List view | Remove it from the Schedule (Jobs has a list) | Build it as the live Visits grid inside the Schedule |
| D2 | The word and the mark for a visit that moved and the customer has not been told | Keep "notify" (Jobber's word) with the gold dot | Use the app's "told": "not told" |
| D3 | Rain or running late | A Day-view "Push back from here" that moves later stops and offers Notify one at a time | Nothing now; Ryan uses Move |
| D4 | Where a Schedule block and a Home stop open | Both open the job page | Both open the side panel in place |
| D5 | What a short block shows | Street first, then service | Customer's first name first |
| D6 | A full day | Refuse nothing, mark "Full" and warn on a drop | Refuse a drop beyond Most per day unless "Book it anyway" |
