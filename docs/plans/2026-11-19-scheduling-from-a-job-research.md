# Scheduling from a job: assignment and crew notice

Nov 19 2026. Research only, nothing built. Hannah: "We should really research scheduling from here [the job]... I do like that they can assign a team, they can inform the team when they've been assigned something, it's optional." Builds on `2026-11-18-scheduling-engine-design.md` (sections 4 and 6) and the prototype `SchedulePicker.tsx` (day cards, open-time chips over the booked-stops timeline, Who, Any time, the split button) under `src/app/(admin)/admin/_screens/design/`.

## 1. Sources and what was verified

Time was short this session (plan window nearly full), so no vendor page was fetched fresh. Everything in section 2 is **(recalled)** from the vendors' help centres as known before this session: Jobber Help ("Schedule a job", "Assign team members", "Team reminders"), Housecall Pro help (scheduling, dispatch, notifications), ServiceTitan docs (dispatch board, appointments, technician notifications), Workiz help (scheduling, assigning techs). The Jobber Edit visit fields are as Hannah showed them (verified by her screenshot). Re-check each row against the live help page before quoting it anywhere. The NN/g and Baymard guidance in section 3 is also recalled; the patterns are accurate, the wording is not quoted.

## 2. How four tools schedule a visit from the job (recalled)

| | Jobber | Housecall Pro | ServiceTitan | Workiz |
|---|---|---|---|---|
| Entry | Job page, Schedule or Edit visit, a dialog | Job, Schedule; drag on the calendar | Book a job, then the dispatch board assigns | Job, Schedule; drag on the calendar |
| Date and time | Start and end date, start and end time; "Schedule later" and "Anytime" boxes | Date, start time, arrival window | Appointment with an arrival window; dispatch sets the technician | Date, start time, duration |
| Duration | End time sets it | From the service or typed | From job type, editable | Typed |
| Anytime or all day | Anytime box | Arrival window | Window | All-day option |
| Assign | Team chips, several, optional | One or more pros, optional | Technician(s), usually at dispatch | One or more techs |
| Notify the assignee | Optional "Email team when assigned", off by default; app push | Push, optional text or email | Push to the technician app on dispatch | Push, optional SMS |
| Team reminder | Team reminder picker | Pro reminder before the job | Configurable | Reminder setting |
| Crew instructions | Instructions field on the visit | Notes and private notes | Job summary and technician notes | Job notes |
| Repeat and return | Recurring job; "a job with one visit" notice, edits update the original job | Recurring, follow-ups | Recurring service agreements, call-backs | Recurring jobs |
| Customer told | Reminders and on-my-way, per client settings | Confirmation, reminder, on-my-way text | Confirmation, reminder, tech en route | Confirmation, reminder |

Across all four: assignment is optional and takes several people; telling the assignee is a separate opt-in from telling the customer; the crew reads instructions on the visit. Jobber is the one that puts date, team, notify, reminder and instructions in a single dialog, which is what Hannah likes. Its weak spot (recalled): date and time are free fields and nothing shows what else is booked that day. Housecall Pro and ServiceTitan solve that with a calendar or dispatch board beside the form, which a dialog cannot hold; our day cards and booked-stops timeline are the dialog-sized answer.

## 3. UX guidance (recalled)

- **Date and time pickers.** Show the weekday with the date; never make someone compute it. A calendar grid for one near-term pick is heavier than a short list of nearby days.
- **Slot pickers versus free entry.** A list of open slots removes impossible choices; free entry is faster for an expert and is needed for the exception. Slots first, an escape to type. The engine design already settled this (open slots, any time allowed with a conflict warning).
- **Assignment controls.** Chips with a list for a set that can grow; a select for exactly one; a default so the common case needs no click. With one truck the control should barely show.
- **Optional notices.** A checkbox that states its effect in a sentence ("Ryan gets a text with the street, the day and the instructions") beats a bare "Notify". This is the `docs/DESIGN.md` rule for customer-facing actions, applied to staff texts.

## 4. Trailhead's dialog, on top of the prototype

Keep `SchedulePicker` as is. Add, in this order:

1. **Who as chips.** Default: the person with room that day (the engine's `placeFor` result), one removable chip; "Add another person" opens the list. One truck means one quiet chip. The first chip is the lead (`visit.person_id`).
2. **Text the crew when assigned**, a checkbox, **off by default**, with its own sentence: "Ryan gets a text with the street, the day and the instructions." Several people: "Ryan and Tech Two each get a text." Hidden when you assign yourself.
3. **Crew reminder**, a select: None (default) or "The morning of, 7:00 am", with its sentence: "Ryan gets a text at 7:00 am Tuesday with the day's list." Offered only when the visit has a day.
4. **Instructions**, a textarea (2,000 characters). It lands on the visit's note (a `note` event, as notes already are) and on the checklist card the crew sees, written once and read in both. Placeholder: "Gate code, dogs, zones to skip."
5. **Duration** shown from the service as a line under the time chips ("60 minutes, from Spring turn-on", Change). The override recomputes the chips. No duration field by default.
6. **Any time** stays the quiet option. Choosing it hides the crew reminder and reads: "No time. The customer is told the day only."
7. **The customer sentence** under the split button follows the contact preference: "Andrea gets a text: 'Trailhead: Spring turn-on Tue, Nov 24 at 9:00 am.'", or email, or "No contact preference, nothing is sent." Staff and customer sentences are separate lines so neither is mistaken for the other.

Where Jobber warns "any changes will update the original job", ours says "This changes this visit only" when the job has more than one visit.

## 5. Data each needs

| Need | Exists | Add |
|---|---|---|
| Lead person | `visit.person_id` | none |
| More than one person | no | `visit_assignee` (`visit_id`, `person_id`, `notified_at` nullable); `person_id` stays the lead, and a one-person visit writes no row, so existing reads keep working |
| Instructions | notes are `note` events | `visit.instructions` text, so the dialog and checklist card read one column; the dialog also writes a `note` event for the history |
| Text when assigned | `queueStaffMessage`, `queueStaffText` | staff message kind `assigned`, one per person, in `message_log`; sets `notified_at` |
| Crew reminder | none | `visit.crew_reminder` nullable (`morning-of`), sent by the daily cron as staff kind `crew-reminder` |
| Duration override | service minutes | `visit.minutes` nullable, null means the service's |
| Event | `visit.moved`, `visit.placed` | `visit.assigned`, with the people and who did it |

Staff texts follow the existing rule: plain ASCII, "Trailhead:" lead, the STOP line only on a number's first text.

## 6. For Hannah (defaults stated)

1. Should "Text the crew when assigned" be off by default, as in Jobber? Default: **off**, and hidden when you assign it to yourself.
2. Do you want the morning-of crew reminder now, or only the assigned text? Default: **both in the dialog, reminder set to None**, fixed at 7:00 am until Settings has hours.
3. When two people are on a visit, who does the customer hear about ("Ryan is coming")? Default: **the first chip**, one first name.
