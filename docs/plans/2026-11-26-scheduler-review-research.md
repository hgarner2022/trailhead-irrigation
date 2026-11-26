# The Schedule, second review: research and decisions

Nov 26 2026. Research and decisions only. No code was changed. It answers Hannah's five points from her review of the Storybook Schedule (`admin-walkthrough-clickable--schedule-week`, branch `scheduler-prototype`, PR #164) and settles the three open picks.

It builds on, and does not reopen: `2026-11-25-scheduler-research.md` section 8 (a move never texts on its own; Hannah's answers; Jev's three places), `2026-11-25-scheduler-reconciliation.md`, `2026-11-25-scheduler-holistic-audit.md`, and `2026-11-25-admin-ux-best-practices-research.md` (Hannah said yes on Nov 25: records are pages; a visit has no page of its own; the side panel is a non-modal peek from the Schedule or Home, reached by a Preview control, full screen on a phone, with an Open action; the word is "visit").

How the research was done. About 39 vendor, design-system and standards pages were opened and read, and 16 more searches gave summaries (marked "search summary"). "Not found" means the page I opened does not say. Nothing is filled in from memory. Where a source was not reachable (Material 3 pages are scripts that return no text; Housecall Pro's employee-schedule and new-schedule pages returned 404; Calendly and Cal.com team views were not opened) the table says so.

---

## Point 1. Whose schedule shows

**What she said.** "There might be more than two people, we need a drop down or something." Today `PersonToggles.tsx` draws one chip per person.

### What the tools do

| Tool | What it does | Source |
|---|---|---|
| Jobber, new schedule, web | A **team filter** dropdown. "Select team members from the dropdown to show their schedule." Several can be picked. "Clear" removes all; clicking a picked person unpicks them. In the vertical Day view the filter adds or removes a **column per person**. Search box and label: not found | https://help.getjobber.com/en/articles/schedule-overview-new-schedule/ , https://help.getjobber.com/es/articles/day-view-of-the-schedule-new-schedule/ |
| Jobber app | View options icon, then "check off each team member to add their schedule, then Apply". Own schedule is the default. Day, list, 3 day and map views all have the selector | https://help.getjobber.com/es/articles/schedule-in-the-jobber-app/ |
| Housecall Pro, web | A search bar and filter: "filter by Team member name or tag", an Unassigned checkbox, and a "View by employee" box (a column per person, a photo at the head, unassigned jobs in the first column) | https://help.housecallpro.com/en/articles/6367496-schedule-page-overview |
| Housecall Pro, app | Menu icon, then a checkbox beside each employee, or "Team calendars" for everyone | search summary of https://help.housecallpro.com/articles/1057141-how-do-i-filter-the-calendar-by-employee |
| ServiceTitan dispatch board | A Filter menu with a Teams dropdown (and Business Units, Skills). Close the dropdown, press **Apply**. Technicians on no team always show. Teams can be collapsed instead of filtered. Selection survives leaving the page, cleared at sign out. No search | https://help.servicetitan.com/residential-s-r/docs/filter-the-dispatch-board |
| Google Calendar | A left-hand list of calendars; click a name to hide or show it; a "Hide from list" item in a hover menu. Checkboxes and colour: not on that page | https://support.google.com/calendar/answer/37188?hl=en |
| Outlook | Classic: a checkbox per calendar in the navigation pane, checked ones open side by side. New Outlook: pick calendars from a list, then "Split view" for side by side or overlay in assigned colours. No maximum stated; the example shows three | https://support.microsoft.com/en-us/outlook/calendar/view-multiple-calendars-at-the-same-time-in-outlook |
| Notion Calendar | A list in the left sidebar; an **eye icon** per calendar hides or shows it; colour from a "..." menu | https://www.notion.com/help/manage-your-calendars-and-events |
| Calendly, Cal.com team views | Not read | |

### What the guidance says

| Source | Says | URL |
|---|---|---|
| Primer (GitHub) | A segmented control is for 5 or fewer options (6 icon-only). "Don't use a SegmentedControl for more than 5 options." More: RadioGroup or ActionMenu | https://primer.style/product/components/segmented-control/guidelines |
| Material (Android docs, translated; the m3 page returned no text) | Segmented buttons for 2 to 5; more items: chips | search summary of https://developer.android.com/develop/ui/compose/components/segmented-button |
| Carbon | Use a multiselect "when the user needs to select multiple options from a list". It shows a count tag ("total number of selected options") that also clears. Filterable for long lists. Do not use a parent "select all" checkbox in filters | https://carbondesignsystem.com/components/dropdown/usage/ |
| Atlassian | A dropdown menu is for 5 to 15 items; a select is for searching and picking one or more from a list. Menu items can be checkboxes | https://atlassian.design/components/dropdown-menu/usage |
| NN/g | Checkboxes for "any number of choices, including zero". Lay lists out vertically, one per line | https://www.nngroup.com/articles/checkboxes-vs-radio-buttons/ |
| NN/g | A simple filter is easier to understand and faster to use than a big one | https://www.nngroup.com/articles/filters-vs-facets/ |
| Apple HIG toggles page | Returned no guidance text | https://developer.apple.com/design/human-interface-guidelines/toggles |

Reading: every scheduling tool that has to cope with many people uses a list with a checkbox or an eye per person (Jobber, Google, Outlook, Notion, Housecall Pro app). None uses chips. Design systems stop chips and segments at 5 and move to a menu. Chips would work for Ryan and Hannah and break at a crew of six.

### Decision

One control, a **People** menu button, drawn only when there are two or more people. It is a checkbox list: a colour dot, the name, a tick. It works the same for 2 people and for 15, so Hannah learns it once. The button says what is showing: "Everyone" when all are shown, the names when two or three ("Ryan, Hannah"), and "3 of 12" beyond that. A search box appears inside the menu from 8 people. The last person on screen cannot be unticked (the rule we already have). The choice is a view, not a rule, and is kept in the browser. With one person nothing is drawn.

It sits in the Schedule header at the left of the Week, Day, List switch, because that is where every other view setting lives. Selected people are the only columns and rows on screen, as in Jobber's Day view.

### What changes in the prototype

- Replace `src/components/blocks/PersonToggles.tsx` (chips) with a menu button: build it on the existing `DropdownMenu` checkbox items. Keep the file name or rename to `PeopleMenu.tsx`; keep the props (`people`, `hidden`, `onToggle`) and the "one person always stays on" rule (`aria-disabled`, title "One person always stays on"). Add a `search` input rendered only when `people.length >= 8`. Button label from a small pure helper `peopleSummary(people, hidden)`.
- `ScheduleProtoHeader.tsx`: mount it in place of the chips, left of the view switch.
- Update `PersonToggles.test.tsx` and `PersonToggles.stories.tsx` (story with 2, 5 and 15 people; `schedule-people-shown.test.tsx` keeps passing).
- 1280: the button sits in the header row, menu opens under it (about 280 px wide, 8 rows visible then scrolls). Day view shows one column per ticked person, scrolling sideways past what fits.
- 375: the button is a full-width row under the title ("People: Everyone"); the menu opens as a bottom sheet with 44 px rows and a Done button. Changes apply as ticked (no Apply, because the list is short and immediate; Jobber's app and ServiceTitan use Apply, which costs a step and is not needed).

---

## Point 2. What a click on a visit does, and where editing lives

**What she said.** "Should I be able to click on this, what is all this", and on the block's menu (Move, 15 minutes shorter, 15 minutes longer): "should there be an edit modal here".

### What the tools do

| Tool | Click on a visit | Edit | Source |
|---|---|---|---|
| Jobber web | "click it to open a pop-up with an overview of the appointment". It has **Edit** and **View details** buttons, a Completed checkbox, and add or remove team members | Edit in the pop-up; also "Edit Visit" from the job page | https://help.getjobber.com/en/articles/schedule-overview-new-schedule/ |
| Jobber app | "Tap a visit from the schedule to open the visit details": tabs Visit, Details, Notes; from the top, start a timer, complete, or send "on my way" | In the details | https://help.getjobber.com/es/articles/schedule-in-the-jobber-app/ |
| Housecall Pro | Clicking a job opens its **details page in the same tab** | On the details page | https://help.housecallpro.com/en/articles/6367496-schedule-page-overview |
| ServiceTitan | Single click opens the **Job Details Flyout** on the board; "view and edit... without leaving the board". Right-click menu: reassign, confirm, dispatch, reschedule, open the job record, customer record, map. Double click: not found | In the flyout; reschedule by drag or right-click | https://help.servicetitan.com/docs/use-the-daily-dispatch-board , https://help.servicetitan.com/residential-s-r/docs/reschedule-a-job |
| Google Calendar | "Click an event", then "Edit event" (a pencil at the top right of the card). The card's other buttons are not on the page I read | Pencil opens the full editor | https://support.google.com/calendar/answer/72143?hl=en |
| Notion Calendar | Click opens a **right context panel**; edit there; a "..." menu at its top right | In the panel | https://www.notion.com/help/manage-your-calendars-and-events |
| Outlook, Square, Calendly | Not found for the click. Square shows a "Reschedule Appointment" pop-up after a drag | | https://community.squareup.com/t5/Product-Updates/New-Drag-amp-drop-to-reschedule-appointments-available-on-Square/ba-p/702876 |

Changing length: Jobber, "Click and drag the edge of an appointment to extend or shorten its duration" (https://help.getjobber.com/es/articles/day-view-of-the-schedule-new-schedule/); ServiceTitan, "drag either end of the appointment" (https://help.servicetitan.com/residential-s-r/docs/reschedule-a-job). Neither offers "15 minutes shorter" menu items, as far as the pages say.

### What the guidance says

| Source | Says | URL |
|---|---|---|
| NN/g, contextual menus | Contextual menus are for "secondary or low-priority options". Do not hide one or two actions in a "..." ("Display single actions... directly"). Icons are missed when small and faint; they have low information scent. Right-click and long press are shortcuts, never the only way | https://www.nngroup.com/articles/contextual-menus-guidelines/ |
| NN/g, progressive disclosure | Two levels is the practical limit. Show the few most important things first; "the very fact that something appears on the initial display tells users that it's important" | https://www.nngroup.com/articles/progressive-disclosure/ |
| WCAG 2.2, 2.5.7 (from the Nov 25 doc) | Every drag needs a way to do the same with a plain click | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html |
| Nov 25 best-practices doc | A peek has no ARIA pattern: focus to its heading, Esc closes, focus returns to the opener, not `aria-modal` | `2026-11-25-admin-ux-best-practices-research.md`, rule 26 |

### Reconciling with Hannah's yes

Her yes says a visit has no page and the peek is non-modal with an Open action. Three of the tools above (Jobber, ServiceTitan, Notion) open a small panel on a plain click of a calendar item. A calendar block has no name link to click, so unlike a list row there is no conflict about what "the link" is: on the Schedule, the click is the explicit Preview.

### Decision

**One click on a visit opens the peek. Nothing else happens on a click, and there is no menu on the block.** The peek is the docked side panel (a full-screen sheet on a phone). It shows the facts, and three buttons at most. Editing has one home: the **Edit visit** dialog (the reviewed Schedule dialog, with its day, time, person, and now Length). The block's "..." menu is removed, because it holds Move and two length nudges that are better handled by drag and by the dialog, and NN/g says not to hide one or two actions. "15 minutes shorter" and "15 minutes longer" are cut.

The peek shows: the customer and street, service, day and time (or "Any time"), length, who, the town, the status pill, and the newest note. Its buttons: **Edit** (opens Edit visit), **Mark done** (only on a visit that is today or earlier), and **Open job** (the job page, where the visit lives). The history of the visit, payments and photos stay on the job page, not in the peek.

Length changes two ways: drag the bottom edge of the block (kept; 15 minute steps), or the Length field in Edit visit (the click route that WCAG 2.5.7 asks for). The dialog is called **Edit visit** whether the visit has a day or not; for a visit with no day it reads **Schedule visit**.

Keyboard: Tab to a block, Enter opens the peek, Esc closes it and returns focus to the block. Space lifts the block, arrows move it, Enter drops it (existing). In the peek, Edit is a plain button. A right-click does nothing special. Phone: tap opens the full-screen peek with a Close at top and Open job; no drag, no menu.

### What changes in the prototype

- `TimeBlock.tsx`: delete the `DropdownMenu` and its trigger (`data-slot="time-block-menu"`), the `BlockAction` type values `"shorter" | "longer"` (keep `"move"` as the name of the drop handler only if still used) and the "Actions for" label. The main `<button>` calls `onSelect(id)`. Keep the resize handle (`data-slot="time-block-resize"`), the conflict words and the done and waiting marks. Update `TimeBlock.stories.tsx`.
- `ScheduleProtoPanels.tsx` and `SchedulePrototype.tsx`: a block click sets the open visit; render the peek (`SidePanel variant="docked"`, as `UnscheduledPanel.tsx` already does) with the buttons above. If the walkthrough's job page already exists in `walkthrough/`, the peek's Open job goes there.
- `ScheduleDialog.tsx`: title "Edit visit" ("Schedule visit" when no day); add a Length field (chips 15 to 240 minutes in 15 minute steps, or a stepper). Remove the "Move the visit" title (see point 5).
- Remove `use-schedule-prototype.ts` code paths for `shorter` and `longer` menu actions; keep the drag-resize path and its toast.
- 1280: week or day on the left, peek docked at the right (about 360 px), the grid stays usable. 375: tap opens a full-height sheet.
- Tests: update the click story ("A click on a block only selects it" in `SchedulePrototype.stories.tsx`) so a click opens the peek, and add a play test for Esc returning focus.

---

## Point 3. Telling the customer after a move

**What she said.** "We probably shouldn't automatically send people. On the notification box there's a notify customer when you move." And on the header count "2 customers not notified": "What does customers not notified mean, why would we have that?"

### What the tools do

| Tool | After a move | Standing count, list or mark of moved but not told? | Source |
|---|---|---|---|
| Jobber | A "Notify client?" prompt after dragging, resizing or Edit Visit: send no notification, a text, or an email; the message can be read and edited first; then Done. Reminders tied to the old time are cancelled. Not offered for bulk reassigns. The "Rescheduled visit, Notify" toast is in Hannah's screenshot (the help page does not name a toast) | Not found | https://help.getjobber.com/en/articles/schedule-overview-new-schedule/ , https://help.getjobber.com/en/articles/new-schedule/ |
| Housecall Pro | A pop-up "Notify Customer" or "Don't Notify Customer" if notifications are on for the customer. After Optimize: "Save & notify customers" and "Save & don't notify customers" | Not found | https://help.housecallpro.com/en/articles/6367496-schedule-page-overview , https://help.housecallpro.com/en/articles/14093813-optimize-by-drive-time |
| Google Calendar | A change dialog lets you add a message to guests; the API has `sendUpdates` of all, externalOnly or none | Not found | https://workspaceupdates.googleblog.com/2018/05/include-message-when-changing-meeting.html |
| Notion Calendar | "Send update" and "Send update without email" | Not found | https://www.notion.com/help/manage-your-calendars-and-events |
| Calendly | The invitee is always emailed when a host reschedules; no silent option found | Not found | https://calendly.com/help/how-to-reschedule-a-meeting |
| Square | A "Reschedule Appointment" pop-up after a drag; its words are not on the page | Not found | Square post above |
| ServiceTitan | No notify prompt on the reschedule page | Not found | https://help.servicetitan.com/residential-s-r/docs/reschedule-a-job |

The answer to her question is no: across Jobber, Housecall Pro, Google, Notion, Calendly, Square and ServiceTitan, no page I read keeps a standing count, list, tab or calendar mark of moved visits whose customer was not messaged. Every tool asks once, at the moment of the move, and then forgets. Jobber's one extra is that reminders for the old time are cancelled.

### What the guidance says

| Source | Says | URL |
|---|---|---|
| Polaris toast | A toast action is allowed only when the same action is available elsewhere on the page, so someone who misses the toast can still do it. Label: one verb ("Undo", "Edit", "View") | https://cdn.jsdelivr.net/npm/superv5_polarisui@2.0.1/dist/docs/components/Toast/README.md |
| WCAG 2.2.1 | A timed message is fine when users can learn the same information another way | https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html |

### Decision

**Remove the idea of "not notified" completely.** After a drag or a save in Edit visit, one toast appears at the top (the existing bar): **"Moved to Thu, Nov 19, 10:00 am"** with two buttons, **Notify customer** and **Undo**. Nothing is texted unless Ryan presses Notify customer; that opens the message (text or email, editable) before it goes, as Jobber does. The toast closes by itself after 10 seconds (see pick b). After that, nothing stays on the screen: no count, no list, no mark on the block.

What remains is only the visit's history line, which every move writes anyway: "Moved to Thu, Nov 19, 10:00 am by Ryan" and, if sent, "Customer texted" on the next line. If Ryan changes his mind later, "Send a text" on the visit and the customer is the way (it already exists, and it satisfies the rule that a toast action must exist elsewhere). The reviewed dialog keeps its two choices, because the dialog is the place to decide before the move: "Schedule and notify customer" and "Schedule without notifying".

To check in code, not found in sources: whether the day-before and two-week texts are built from the visit's current day when they are sent (then a move re-times them for free, which is what Jobber's cancelled-reminders line is for).

### What changes in the prototype (what is removed)

- **Removed:** the header button "N customers not notified" (`ScheduleProtoHeader.tsx`, `openNotN...`, `notNotifiedCount`); the **Not notified** tab and its "Every customer has been notified." empty state, its "Notify all" footer and "Don't notify" buttons (`UnscheduledPanel.tsx`, `defaultTab`, `notTold`, `onNotifyAll`; the panel becomes Unscheduled only, with no tabs); the **bell mark** on blocks (`TimeBlock.tsx` `notToldMark`, `notTold` in the aria text, the `Bell` in stories and `TimeGrid.stories.tsx`); the **legend entry** for it; the toast sentence ". No message sent." and the `notified` prop of `ScheduleToast.tsx`; `ScheduleOverlays.tsx` notify-all dialog; the "not told" state in `schedule-world-store.ts` and `use-schedule-prototype.ts`; the stories "Not notified list" and their play steps.
- **Changed:** `ScheduleToast.tsx` shows "Moved to ..." plus **Notify customer** and **Undo**; Notify opens the message dialog, then the toast turns to "Customer notified" for 4 seconds with no Undo.
- 1280 and 375 are the same: a bar at the top, one line and two buttons (it wraps to two lines on a phone).

---

## Point 4. What a day's header shows in the Week view

**What she said.** "This should definitely be cleaned up, I don't think you thought about all this." Today `TimeGridHeader.tsx` draws the day, a stop count, the towns, and per person an open time and driving figure.

### What the tools do

| Tool | Week or day header | Drive time and capacity | Source |
|---|---|---|---|
| Jobber | Hannah's screenshot: the day and a "2 visits" chip. The help pages do not describe the header; Anytime visits sit in a section at the top of each day | Drive time sits in **Find a Time** (a range in the corner of each open gap, each person's time in the Assign dropdown), not in headers | https://help.getjobber.com/en/articles/new-schedule/ , https://help.getjobber.com/hc/en-us/articles/29840886387351 |
| Jobber month | Colour-coded blocks per day; a map shows visits per property. No counts or capacity | Folded into availability | https://help.getjobber.com/es/articles/month-view-of-the-schedule-new-schedule/ |
| Housecall Pro | Header content not described (holidays show at the top of a column). Routes: each route is a column headed by route name and employees | Drive time only in the **Day view of the Map**: hover a route line for distance and time | https://help.housecallpro.com/en/articles/6367496-schedule-page-overview , https://help.housecallpro.com/en/articles/13871869-getting-started-with-routes-in-housecall-pro |
| ServiceTitan | Technician name, photo, zone dot. Capacity: the old board showed booked and available hours (marketing page, replaced by Adaptive Capacity) | Dispatch Pro: **hover an appointment** to see how long the drive is; Assist suggestions show predicted drive change | search summaries of https://help.servicetitan.com/docs/dispatch-pro-overview and https://help.servicetitan.com/docs/plan-your-teams-capacity |
| FullCalendar defaults | Month: short weekday. Week: short weekday plus date. Day: full weekday | n/a | search summary of https://fullcalendar.io/docs/dayHeaderFormat |
| Google Calendar, Outlook, Notion Calendar | Not found in help pages | | |

### What the guidance says

| Source | Says | URL |
|---|---|---|
| NN/g, progressive disclosure | Put on the first screen what most people need; defer the rest one level; more than two levels loses people | https://www.nngroup.com/articles/progressive-disclosure/ |
| NN/g, contextual menus | Hover is for extra information only, never the only way to reach it | https://www.nngroup.com/articles/contextual-menus-guidelines/ |

Reading: where drive time and capacity are shown at all, they sit in the **Day view, a map, or a hover**, never in the Week header. Jobber's header is the day plus a count.

### Decision

**Week header: the day and a count, nothing else.** "Wed 25" and a chip "3 visits" (no chip on an empty day). When every person is out of room, the chip reads "Full" instead of the count. Today's day is marked by shape (a filled circle behind the number), not by colour alone. Towns, open hours and driving are cut from the Week header.

Where the goals went. How full a day is: the count and the "Full" chip, and in Day view each person's column head reads "7 h open". Where Ryan is working: the towns move to Day view's date line ("Erie 3, Lafayette 2") and to a hover or tap on the Week header (below). How much driving: the "26 min drive" gap labels between stops show **in Day view only**, and the day's driving total per person is one line at the bottom of the Map panel ("Ryan 1 h 12 min driving"). The Week view loses its drive lines.

One quiet extra: hovering or focusing a Week header opens a small card with the same three facts ("Erie 2, Lafayette 1. Ryan 4 h open. 38 min driving."). It is not needed to use the Week, so nothing depends on it, and on a phone (where Week is not drawn) it does not exist.

### What changes in the prototype

- `TimeGridHeader.tsx` (`DayHead`): reduce to weekday, date number, and the chip. Delete the towns line, the per-person lines, the container-query shortening (`@[320px]`) and the `stat.open` and `stat.driving` rendering for `variant="week"`. Keep a `variant="day"` that shows the towns line and, per person column, the name and "7 h open".
- `TimeGridColumn.tsx`: draw the "N min drive" gap label only when `variant="day"`.
- Add a small `DayHeadDetail` hover and focus card (use the existing `HoverCard` or `Popover` primitive) reading the same `dayFill` figures.
- Map panel (`ScheduleProtoPanels.tsx`): add the per-person driving line at the bottom.
- 1280: Week columns are as wide as the grid allows; headers are one line high. 375: the phone grid shows one day, headed "Wed, Nov 25. 3 visits."
- Stories and tests: update `TimeGridHeader.stories.tsx`, `TimeGrid*.stories.tsx`.

---

## Point 5. The words

**What she said.** "Go out and research best practices. Just do it. I don't know the best words." Then "we need to research it more" and "make it good".

### What the tools say about each

| Item | What I found | Source |
|---|---|---|
| Button that reorders a day | Jobber: icon "Optimize anytime appointments", a pop-up "Optimize", checkboxes "Keep first appointment at start of route" and "Keep the last appointment at end of route", a bottom message "started optimization of anytime appointments"; no savings figure, no undo, "can be repeated as often as needed" | https://help.getjobber.com/es/articles/route-optimization-new-schedule/ |
| | Housecall Pro: "Optimize by drive time", "Optimizing by drive time...", a summary with the reordered list, total travel time, "Time saved versus the original order... 'Saved 23 min'", the new end time; a lock icon pins a job; jobs that cannot be placed stay at their original times and a warning names up to three; main button "Save & notify customers", caret "Save & don't notify customers" | https://help.housecallpro.com/en/articles/14093813-optimize-by-drive-time |
| | Google Maps, Routific, OptimoRoute, Circuit: exact words **not found** (searches returned generic vendor pages) | search summary |
| Added driving on a suggested time | Jobber Find a Time: a range of drive times in the corner of each gap, each person's drive time in the Assign dropdown, best slots in green; labels "Unavailable" and "Unfeasible"; no "minutes" format on the page | https://help.getjobber.com/hc/en-us/articles/29840886387351 |
| | ServiceTitan Dispatch Assist: "a predicted change in drive time"; the "+ 12 min (4 mi)" wording in the brief was **not found** on any page. ServiceM8: not read | search summary of https://help.servicetitan.com/docs/use-dispatch-assist-in-dispatch-pro |
| A full day or person | Calendly: a day with no free time simply loses its highlight; no "Full" label (community answer: not a setting). Jobber: not found. ServiceTitan: utilisation reports, no label | search summary of https://community.calendly.com/how-do-i-40/can-the-show-the-booked-hours-as-full-or-something-instead-of-just-hidding-it-678 |
| Bulk schedule button and its toast | Jobber: More, then "Reschedule & reassign", with Confirm; "a success message appears after updates", an error with "Try again". Gmail: "3 conversations archived. Undo" (named in the brief; not confirmed on a page I could open). Asana, Linear: not opened | https://help.getjobber.com/en/articles/schedule-overview-new-schedule/ |
| Toast wording | Polaris: short and affirmative, noun plus verb ("Product updated"), no "successfully", about 3 words, one verb as the action label | https://cdn.jsdelivr.net/npm/superv5_polarisui@2.0.1/dist/docs/components/Toast/README.md |
| Dialog before a rule is broken | Jobber and Housecall Pro: no such dialog described. Our own rule 1 (a button says what happens) and rule 2 (one name per action) from `docs/UX_WRITING.md` decide it | |
| Settings line on when a change applies | Google Calendar working hours, Calendly availability: exact words not found | |
| Label vs colour | Atlassian: every lozenge needs a text label; "Don't use color alone"; short labels; sentence case. WCAG 1.4.1 needs a visible alternative to colour | https://atlassian.design/components/lozenge/usage , https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html |

### The words, old to new

Rules applied: `docs/UX_WRITING.md` (verb on a button, one name per action, "visit" not "job", sentence case, no em dashes), the repo copy rules (plain short words, only the words needed, units named), and Polaris for toasts (short, affirmative, one verb to act).

| Current string | What the tools say | Decided string | Why |
|---|---|---|---|
| Order the day (button; dialog title) | Jobber and Housecall Pro say "Optimize", which is jargon for a non-technical owner; Housecall Pro adds "by drive time" | **Reorder stops** (button); dialog title **Reorder stops to save driving** | Says what happens in plain words; "stops" is what the Day view already numbers |
| Ordered Thu, Nov 19, saves 28 min of driving | Housecall Pro: "Saved 23 min", shown as a summary; Jobber states no saving | **Stops reordered. 28 min less driving.** (toast with Undo) | The result first, the saving stated once as minutes less driving; no date, the day is on screen |
| (saving of zero) | not found | **Already in the shortest order.** | Tells Ryan nothing changed and why, in one line |
| Doesn't fit today | Housecall Pro: skipped jobs "remain on the tech's calendar at their original times", named in a warning | **No room today.** Under it: "Stays at 9:00 am." Button: **Another day** | Plain reason, then what happens to it, then the way out |
| adds 3 min driving | ServiceTitan: a predicted change in drive time; Jobber: a range of drive times | **+3 min driving** (and **No extra driving** at zero) | Shortest form that still names the unit; the plus sign is the "added" |
| Estimated drive times | Jobber: "real-world traffic variations mean these estimates may not always be 100% accurate" | **Drive times are estimates.** | A full sentence, a statement, and says what it is |
| Adds 25 min of driving. | As above | **Adds 25 min of driving.** (unchanged) | Already plain; kept so the two warnings read alike |
| Ryan needs 15 minutes to drive from/to X. | not found | **Ryan needs 15 minutes to drive from X.** and **...to X.** (unchanged) | Plain, names the person and the unit |
| Ryan is full that day. | Calendly shows nothing; no tool words it | **Ryan is full that day.** (unchanged) | "Full" is the word Hannah already sees in the header chip; one word for one idea |
| Full (chip) | Atlassian: text label, not colour only | **Full** (unchanged), replaces "N visits" | Text carries the meaning |
| Schedule all 4 | Jobber: "Reschedule & reassign" with Confirm | **Schedule all 4** (unchanged) | Verb first, count shown, matches Hannah's word "Schedule" |
| Scheduled 3 jobs | Gmail: "3 conversations archived. Undo"; Polaris: short, noun plus verb | **3 visits scheduled** with **Undo**; if some did not fit: **3 visits scheduled. 1 has no room.** | Glossary: "visit"; result first; failures counted, not hidden |
| Suggested: Thu, Nov 19, 10:30 am, Ryan Garner | Jobber: green highlight on the best slots, no label read | **Suggested: Thu, Nov 19, 10:30 am with Ryan** | First name only (the rest of the app does the same); never says why |
| 26 min drive | HCP: hover shows "expected drive time"; ST: hover shows the drive | **26 min drive** (unchanged), Day view only | Already plain; the point 4 change is where it shows |
| 58 min drive | as above | **58 min drive** (unchanged) | A long drive is the information; no warning colour on its own |
| 7 h open | ST: booked and available hours; Jobber: none | **7 h open** (unchanged), in the Day column head only | Unit named; "open" is Hannah's word for free time |
| No message sent | Nobody states it; the prompt appears and goes | **(removed)** | There is no "not notified" state any more (point 3) |
| A change applies to the next opening offered. | Not found in Google Calendar or Calendly | **Applies to new openings only. Booked visits don't move.** | Names the one thing an owner worries about, in two short sentences |
| Outside this service's dates, Apr 15 to May 31. | not found | **Outside the dates for this service, Apr 15 to May 31.** | Same fact, plainer; shown as a warning the office may override |
| Changed to 8:00 to 8:45 am | Polaris: "Product updated" pattern | **Now 8:00 to 8:45 am** (toast with Undo) | Shortest true statement; no Notify, because the start time did not change |
| Move the visit (dialog title) | Google: "Edit event"; Jobber: "Edit Visit"; ST: "Reschedule" | **Edit visit** (**Schedule visit** when there is no day) | One place and one name for changing a day, time, person or length (point 2) |
| (the dialog that asks before a move that breaks a rule) | no tool words it | **Move anyway?** with the reasons listed under it; buttons **Move anyway** and **Cancel** | A question as a title, the button repeats the action (UX_WRITING rule 1); reasons use the strings above |
| Moved to Thu, Nov 19, 10:00 am | Jobber: "Rescheduled visit" | **Moved to Thu, Nov 19, 10:00 am** (unchanged) | Matches the glossary ("moved") |
| Notify the customer | Jobber "Notify"; Housecall Pro "Notify Customer" | **Notify customer** (everywhere, including the dialog: "Schedule and notify customer", "Schedule without notifying") | One name for one action; Polaris asks for one verb |
| Don't notify | Housecall Pro "Don't Notify Customer" | **(removed)** | It only existed in the Not notified list; the dialog's "without notifying" covers the choice |
| Another day | not found | **Another day** (unchanged) | Plain |

### Three open picks

**(a) The mark on the one recommended time a customer sees.**

| Source | Says | URL |
|---|---|---|
| Atlassian lozenge | "Every lozenge needs a text label"; "Don't use color alone... use clear labels and, if relevant, a supporting icon"; labels short, sentence case | https://atlassian.design/components/lozenge/usage |
| WCAG 1.4.1 | Colour cannot be the only way to show something; "a visible alternative to color" is required | https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html |
| Google Flights | A text label "Best" on the default tab, with a help page that says it balances price, convenience and booking ease | search summary of https://support.google.com/travel/answer/7664728 |
| Baymard | Time pickers do best with "a clear visual hierarchy"; the detail is behind a paywall | https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/time-booking-interface |
| Booking and delivery-slot tools | No tool with a "Recommended" slot badge was found | search summary |

Decision: **A, the word "Recommended" in small text under the time.** A star needs a text name anyway, and an outline alone fails the colour rule without a word beside it, so the word is the cheapest version that is always readable, on a phone, and to a screen reader (the time button reads "9:30 am, recommended"). Only one time carries it, it stays when the time is selected, and it has no tooltip and no reason. In the code: keep `RecommendedMark` look "A" (already the default `DEFAULT_LOOK`), delete looks B and C, `recommendedChip`'s look "C" branch and the `RecommendedMarkCandidates*` stories.

**(b) Does a toast with Undo close by itself, and when.**

| Source | Says | URL |
|---|---|---|
| Polaris | Default 5 s; a toast with an action "at least 10,000 milliseconds for accessibility"; action only if available elsewhere | https://cdn.jsdelivr.net/npm/superv5_polarisui@2.0.1/dist/docs/components/Toast/README.md |
| Radix | Default 5 s; for undo use "duration={10000}"; closing "pauses on hover, focus and window blur"; give an alternative to the action | https://radix-ui.com/primitives/docs/components/toast |
| Android (Material) | Snackbars "disappear after a few seconds"; undo after a delete is a named use; an Indefinite option exists | https://developer.android.com/develop/ui/compose/components/snackbar |
| Gmail | The "send cancellation period" is 5, 10, 20 or 30 seconds, default 5 | search summary of https://support.google.com/mail/answer/2645922 |
| WCAG 2.2.1 | A timer needs turn off, adjust or extend, unless the same information is available another way | https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html |
| Primer (GitHub) | Recommends against toasts; they can fail 2.2.1 | https://primer.style/accessibility/toasts/ |
| Our own `DESIGN.md` | Plain toast 4 s; `UndoToast` 10 s | `docs/DESIGN.md` Toast row |

Decision: **yes, it closes by itself after 10 seconds, and the timer pauses while the pointer or focus is on it.** That matches Polaris, Radix and our own `UndoToast`. It is safe under WCAG 2.2.1 because the same actions exist elsewhere: the move is in the visit's history, and Notify customer has "Send a text" on the visit and the customer. A toast with no Undo or Notify (for example "Customer notified") closes after 4 seconds. The toast must be announced to screen readers when it appears. `SCHEDULE_TOAST_SECONDS` stays at 10; add the pause on hover and focus if it is not already there.

**(c) The look of the map under the dispatch pins.**

| Source | Says | URL |
|---|---|---|
| Mapbox Light | "A subtle, light-colored basemap designed to provide a neutral backdrop for overlaying data visualizations"; muted tones "help data layers stand out". (Marked classic, no longer maintained; not our style, the point is the principle) | https://docs.mapbox.com/map-styles/reference/light/ |
| OpenFreeMap | Styles Liberty, Bright, Positron. Positron is "a special clean looking style" with points of interest removed and some labels only at high zoom; Liberty is "fresh and alive"; Bright is forked from an abandoned upstream. The page does not describe colours | https://github.com/hyperknot/openfreemap-styles , https://openfreemap.org/ |
| Jobber, Housecall Pro, ServiceTitan basemaps | Not found on any help page | |

Decision: **switch from Liberty to Positron.** The pins and route lines are the content and each person has a colour; a quiet grey map lets those colours carry, which is the Mapbox principle. Liberty draws colourful land and many labels that fight them. Positron is free with no key (OpenFreeMap's public instance). In `DayMap.tsx` change `STYLE` from `https://tiles.openfreemap.org/styles/liberty` to `https://tiles.openfreemap.org/styles/positron`; the page does not list that URL, so open it once in the browser before relying on it (the Liberty URL in our code follows the same pattern). The attribution stays on.

---

## Summary for Hannah (plain words)

**1. Choosing whose schedule shows.** One "People" button with a list of names and ticks, like Google Calendar's list. It says "Everyone" or the names. It works the same with two people or fifteen. With one person you won't see it.

**2. Clicking a visit.** One click opens a small panel on the side with the facts, and an Edit button, a Mark done button when it's today, and an Open job button. The "..." menu on the block is gone. Edit opens one box where you change the day, time, person or length. You can also drag the bottom edge to change the length.

**3. Telling the customer.** After a move, a bar at the top says "Moved to Thu, Nov 19, 10:00 am" with Notify customer and Undo. It goes away by itself after 10 seconds. Nothing is sent unless you press Notify. The "customers not notified" count, its tab, the bell and the legend are all removed. No tool we read keeps such a list.

**4. The week's day header.** Just the day and "3 visits" (or "Full"). Towns, open hours and driving come out of it. They show in the Day view and when you hover over the header. Driving between stops shows only in the Day view.

**5. The words.** I used the app's own words and what Jobber and Housecall Pro do. The main ones: "Reorder stops", "Stops reordered. 28 min less driving.", "No room today", "+3 min driving", "3 visits scheduled", "Edit visit", "Notify customer". The full old-to-new list is above.

**The recommended time** a customer sees gets the word "Recommended" under it. **A toast with Undo** closes by itself after 10 seconds. **The map** goes to the plain grey style so the pins stand out.

### Questions only Hannah can answer

| # | Question | Default that will be built unless she says otherwise |
|---|---|---|
| 1 | Should Mark done be a button in the side panel on the Schedule? Ryan would use it in the field. Jobber has it there; the job page also has it | Yes, shown only for a visit that is today or earlier |
| 2 | Should the Week header say "Full" when nobody has room? It is the one place the header says more than the count | Yes, "Full" replaces "3 visits", one word, nothing added |
| 3 | When a move is saved from the Edit visit box, should the box ask about notifying before it saves (the reviewed dialog does), or should it save and show the top bar like a drag? | Keep the two choices in the box (Schedule and notify customer, Schedule without notifying); a drag shows the bar |
