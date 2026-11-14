# UX patterns for the office, the truck and the pass page

Written Nov 13 2026 for the admin, the day view, New job, the pass page and the messages. It sits beside `docs/UX_WRITING.md` (the words) and `docs/DESIGN.md` (the look), and under the two build documents `2026-11-14-jobs-to-be-done.md` and `2026-11-14-build-1-office-acts-on-a-job.md` (on `scheduling-design`). Each rule has a one-line why and a source number from the list at the bottom. Where a source could not be read in full, the list says so.

## Home

1. **Home holds today, tomorrow and what needs action, and nothing else.** Why: a dashboard carries only the information one task needs, and it is not a portal. [1]
2. **Every row on Home has its one button, and the row opens the job.** Why: operators act on exceptions, so deviations must stand out without a search. Housecall Pro's Needs Attention banner lists only unscheduled and unpaid jobs and opens the job. [1][9]
3. **Show a count only when it is the headline of a list that sits right under it.** Why: a count with no action is a number to worry about. "3 charges didn't go through" is useful beside the three rows; "142 passes sold" belongs in Reports. [1]
4. **Fit Home on one screen on a laptop, with no chart.** Why: glanceable beats explorable, and Reports exists for exploring. [1]
5. **Order the list by what is due first, not by a score.** Why: position and length are what people read fastest. [1]
6. **A quiet Home says so and says what is next.** "Nothing needs you. Tomorrow has 7 stops, first at 8:00." Why: a blank space reads as broken. [3]

## Jobs and tables

1. **Search finds a person by name, street or phone, from one box.** Why: the admin has a voice on the phone, not a pass number (build 1, principle 3). Polaris index tables put search and filters above the list. [13]
2. **Default sort is by day, soonest first, with Needs a day pinned on top.** Why: users should see the part that matters before choosing to narrow. [4]
3. **Filters are visible chips with an active state: state, kind, truck, town.** Why: a hidden filter makes people think rows are missing. [4][13]
4. **The name is the link; the row has no other target.** Why: row click and checkbox must not fight, and targets must stay at least 24 px apart. [6][13]
5. **Keep the table a table on a phone: sticky header, frozen first column, a cut-off edge as the scroll cue.** Why: that is the guidance for tables wider than a phone. [4]
6. **Bulk actions appear only when rows are selected and name the count: "Send card link to 3 customers".** Why: the button should say what it does and to whom. [2][13]
7. **Empty tables say why and offer the task: "No jobs match. Clear filters" or "No jobs yet. New job".** Why: say the status, teach, give the next step. [3]

## The job panel

1. **The panel opens beside the table on a laptop and as a sheet on a phone, and the row stays visible.** Why: context is kept while acting on one row. (Already in `SidePanel`.) [4][13]
2. **One filled button, the next likely action for that state.** Needs a day: Move. Scheduled: Done. Others are outlined. Why: one primary per surface (build 1, principle 2). [13]
3. **Order inside: who and where, then the job, then the thread, then the actions in a pinned footer.** Why: Housecall Pro shows customer, address, then notes, in that order. [9]
4. **Before an action, one sentence says what will happen: "Moves the blowout to Thu, Oct 14 and texts Dana."** Why: specific wording beats "Are you sure?". [2]
5. **Cancel a visit gets a confirm that names the visit and what happens to the money, with buttons "Cancel visit" and "Keep visit".** Why: the confirm is for serious, hard-to-reverse acts only. [2]
6. **Move, Done and Not done get no confirm; they get an Undo for ten seconds.** Why: undo beats a confirm for routine errors and reduces anxiety. Texts already sent cannot be unsent, so Move says "texts Dana" before it runs and Undo moves it back and sends a correction. [2]
7. **A refusal appears next to the field, in the API's words, and keeps what was typed.** Why: name the problem and the fix, never blame. [UX_WRITING][3]
8. **A finished job locks its Move, like ServiceTitan locks Working and Done appointments.** Why: it stops changes that make the record wrong. [10]

## Schedule

1. **Every move can be done by picking, not only by dragging.** The panel's Move and a "Place" button on each tray row are the main path; drag is the shortcut. Why: Jobber says drag does not work in a mobile browser, and a chair at a phone call needs a form. [11]
2. **A tray of jobs with no day sits beside the week, as in both Jobber and ServiceTitan.** Why: this is the shape every field-service tool settled on, and it matches Needs a day. [10][11]
3. **A stop card in the week shows time or "any time", customer, town, kind and a state colour; the rest comes on click.** Why: ServiceTitan keeps the card to status colour and icon and puts detail in a flyout. [10]
4. **A problem is a red outline plus words, and the day says why.** Why: ServiceTitan outlines late jobs and explains in the popup; colour alone fails some people. [1][10]
5. **Each truck-day shows used time against capacity as a bar and a number, and the number is minutes: "5 h 10 of 7 h".** Why: capacity that cannot be seen gets overbooked; one length encodes it. [1]
6. **Thin days are visible so Hannah can fold them.** Why: it is a job in the jobs document, and a short bar shows it at once. [1]
7. **Week by truck for planning; one day with a map and numbered stops for the route.** Why: Jobber pairs a map with the day and week for the same reason. [11]
8. **A drop that is refused snaps back and says why, in a line beside the block.** Why: the refusal belongs to the thing refused. [3]

## The day view

1. **Stops in route order, one per card, today first, with the drive between stops.** Why: Housecall Pro opens the phone schedule as a list, since a list is read one-handed. [9]
2. **Card order: time or window, street address, access note or gate code, what to do (zones, kind, last visit's notes), then customer name and Call.** Why: it follows what the person needs on the way, at the gate, at the box, and last if something is wrong; Housecall Pro lists customer, address, notes. [9]
3. **Tap the address to open the phone's own maps app with it set.** Why: Housecall Pro hands the address to the default navigation app. [9]
4. **Done is one large button at the bottom of the card, in thumb reach; Not done sits beside it, quieter, and asks a reason.** Why: frequent actions go in the lower screen; critical ones should not need a stretch. [7]
5. **Every target is 44 px or larger with room between; Call and Done are never neighbours.** Why: 24 px is the floor, 44 is the target. [6][7][8]
6. **Mark a stop done offline and show "Saved, will send" until it syncs.** Why: Housecall Pro shows only previously opened jobs without signal, so Trailhead loads the whole day when the phone has signal in the evening. Field-service vendor posts also say to show queued items. [9][12]
7. **Photo and a note are optional, one tap each, after Done, never before.** Why: the required path stays one tap. [5]
8. **Ryan never sees admin: no Reports, no other truck.** Why: Housecall Pro limits techs to their own jobs. [9]

## New job

1. **Search the customer first, as you type, by name, street or phone; "New customer" is the last row of the results.** Why: most calls are existing customers, and typing on a phone is slow. [5]
2. **Required: customer, kind, day. Everything else has a default and sits under "More details".** Why: show a few core options, defer the rest, and use two levels at most. [5]
3. **Defaults are the product: today, any time, the kind's minutes, the first truck, the kind's price.** Why: it removes five decisions in a call. (Build 1.) [5]
4. **One column, labels above fields, the right keyboard for phone and email.** Why: one column is read in order on a phone, and the wrong keyboard costs time. [12]
5. **Show the address suggestion list as the street is typed and only the six towns as valid.** Why: out-of-area is caught before the form ends. [UX_WRITING]
6. **The button says the result: "Add job and text Dana", or "Add job" when she has no phone.** Why: say what will happen before it happens. [2]
7. **After saving, stay on the new job's panel, with Move one tap away.** Why: the admin on the phone often needs to set the time next. [10]

## The pass page

1. **The first thing is the dates, written out: "Spring turn-on, Tuesday, April 14."** Why: "When was that again?" is the job. (Jobs document.) [2]
2. **Each visit has one verb beside it: Move.** Why: the change-your-day pattern in delivery apps is one control next to the day, not a settings hunt. [14]
3. **Move shows the days that are really open and says what happens: "Moves your blowout to Oct 16. We'll text you the window."** Why: offer only choices that hold, as Amazon Day offers days it can keep. [14]
4. **The money is stated plainly: what was charged, what is next, to the card ending 4242.** Why: trust comes from the amount, the date and the card. [UX_WRITING]
5. **Cancel is last, in text, with what happens to the money above the button.** Why: it is serious and rare, so it gets a confirm and no prominence. [2]
6. **Change the card is a link, not a form, and appears first when a charge didn't go through.** Why: the one task that cannot wait goes up. [3]
7. **Sign-in is the emailed link, never a password; the page works at 375 px with targets of 44 px.** Why: no account is a promise in the jobs document. [7][8]

## Messages

1. **One thread per customer, newest first on the job panel, showing the exact words sent.** Why: the admin never has to wonder what the customer knows (build 1, principle 8). [UX_WRITING]
2. **Each message shows channel, day and one of: queued, sent, delivered, didn't send.** Why: status wording should say what happened and what to do. [3]
3. **A message that didn't send is a row on Home with a Resend button.** Why: nothing is found out from a customer. [1]
4. **Free text sits at the foot of the thread, with the consent line and the character count.** Why: sending and reading live in one place. [UX_WRITING]
5. **Texts from the app are one-way for now and say so: "Replies go to Ryan's phone."** Why: a reply box that goes nowhere is a trap. [3]
6. **No read receipts.** Show Delivered only. Why: they invite chasing and the carrier data is unreliable; the admin acts on a failure, not on silence. [1]

## What we are doing wrong today

From the two build documents and the code as of Nov 13.

- **Home is a dashboard, not a to-do list.** `HomeScreen.tsx` has four stat tiles, a season chart and a season prompt card above Today and Tomorrow, so the page runs past one screen. [1]
- **A Home visit row is not a link.** `VisitRow` shows time, name, town and a pill but opens nothing, and the empty line "No visits scheduled." offers no next step. [3]
- **Search is one column.** Passes and Customers both search `firstName` only, so a street or a phone finds nothing. [13]
- **The actions live on the pass, not the job.** `PassesScreen` has Cancel pass, Skip and Add inspection, but there is no Move, Done, Not done, Edit or Cancel visit. The jobs document says the same of the live admin.
- **The cancel dialog is the only confirm, and nothing has an undo.** "Cancel this pass?" says "remaining visits come off the schedule" but names no visit, date or amount, and the confirm button uses the default style. [2]
- **Bulk buttons only log.** In the catalog "Send card update link" and "Resend confirmation" do console.info; the sentence naming the count is missing. [13]
- **The Schedule is drag first.** Moves update local state in the prototype; the panel has no Move form, and drag does not work in a phone browser. [11]
- **The thread is oldest first and read only.** `MessageThread` sorts ascending and shows a bubble per message. Build 1 asks for newest first and a free-text text; there is no "didn't send" row on Home yet. [UX_WRITING]
- **The stop list does not carry the truck's information.** `StopList` shows order, time, name, town, kind and truck; the access note, zones and phone are not on it, and the day view is not started.
- **Offers promise what the product cannot keep.** The checkout shows a fake window and Saturdays the settings exclude. This is a trust cue gone wrong. [UX_WRITING]
- **The nav says Passes** where the jobs document says Jobs.

## Sources

1. NN/g, Dashboards: preattentive design. https://www.nngroup.com/articles/dashboards-preattentive/ (read)
2. NN/g, Confirmation dialogs can prevent errors, with the undo comparison. https://www.nngroup.com/articles/confirmation-dialog/ (read)
3. NN/g, Designing empty states in complex applications. https://www.nngroup.com/articles/empty-state-interface-design/ (read); error wording is NN/g's Error-Message Guidelines, cited in `UX_WRITING.md`
4. NN/g, Mobile tables. https://www.nngroup.com/articles/mobile-tables/ (read; says nothing on row actions)
5. NN/g, Progressive disclosure. https://www.nngroup.com/articles/progressive-disclosure/ (read)
6. W3C, WCAG 2.2 SC 2.5.8 Target Size (Minimum), 24 by 24 px. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html (read)
7. Apple HIG, Layout, 44 pt targets and reach. https://developer.apple.com/design/human-interface-guidelines/layout (page returned a title only; figures are Apple's published guidance, not read in full)
8. Material Design 3, 48 dp targets. https://m3.material.io/foundations/designing/structure (body not returned; figure not re-read)
9. Housecall Pro help, Viewing your schedule in the field. https://help.housecallpro.com/en/articles/1029139-viewing-your-schedule-in-the-field (read); job page, buttons, directions, offline and Needs Attention come from search summaries of its mobile FAQ and job articles
10. ServiceTitan help, Use the Daily Dispatch Board. https://help.servicetitan.com/docs/use-the-daily-dispatch-board (read; marked stale; it does not describe capacity)
11. Jobber help, New Schedule overview. https://help.getjobber.com/en/articles/schedule-overview-new-schedule/ (search summaries, not opened)
12. Field-service vendor blog on offline and queued states. https://www.fieldproxy.ai/blog/mobile-first-design-how-fieldproxys-technician-app-works-offline-d1-32 (low authority)
13. Shopify Polaris index table. The URLs redirect to shopify.dev and returned no text, so these rules rest on its published pattern and `docs/DESIGN.md`; unverified.
14. Amazon, What is Amazon Day delivery. https://www.aboutamazon.com/news/operations/what-is-amazon-day-delivery (search summaries)

Baymard could not be fetched for autocomplete or field counts; fewer-fields rules rest on source 5.
