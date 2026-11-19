# UX audit fixes: the admin (Nov 18 2026)

Status of every row of `docs/plans/2026-11-18-ux-audit-ryan.md` section 1, and of Hannah's decision that Schedule is the one verb. Branch cut from main; one commit per item.

| # | Row | Status | What changed or why not |
|---|---|---|---|
| Schedule words | Place, Place all, Give it a day, Set the day, Needs a day, "Jobs needing a day" retired | fixed | The visit panel's footer button, each Unscheduled row and the Needs action row read "Schedule"; "Schedule all N" above the list and in the preview dialog; the dialog for a visit with no day is titled "Schedule" with a "Schedule" confirm; Home's pill is "Unscheduled"; the Reports tile is "Unscheduled jobs"; API summaries say Unscheduled. Identifiers keep their names. CLAUDE.md step 3 and 4 words updated. |
| 1 | Visit panel Messages showed the customer's whole list | fixed | `visitFacts` keeps only messages with that `visitId`; the customer panel keeps the customer-wide list. |
| 2 | Move with no change texted the same date | fixed | Both Move buttons (and the caret) stay disabled until the day, the time or the person differs. |
| 3 | Grids sideways on a phone | skipped | A separate build (cards below `md`). |
| 4 | Needs action "Open job" opened a visit; canceled visit "When" read Unscheduled | fixed | The button reads Open visit, Open job or Open customer by what it opens. A canceled visit reads "Canceled, was Fri, Apr 30" (the day comes from the `visit.cancelled` event, since a cancel clears the day: new `Visit.cancelledWas`), or "Canceled". |
| 5 | Canceled job Total read "Quote later" | fixed | The Total shows the canceled lines' amount struck through; "Quote later" is for unpriced lines only. |
| 6 | Settings tabs Areas and Capacity | skipped | Step 5 of the build order. |
| 7 | Job panel footer too tall on a phone | fixed | Below `md` the footer is the primary and More; Add a line, New visit, Change the pass and the cancel go under More. Laptop unchanged. |
| 8 | Customer panel: no call, no balance | fixed | Phone is a `tel:` link, "Call" beside "Send a text", facts gain Last visit and Unpaid (Unpaid leaves out canceled jobs and a pass's charges not yet due). |
| 9 | Cmd+K | fixed | Customer hits show phone and email; Jobs and Days stop at three with a "See all N" line to the list (the lists have no search parameter yet, so it opens the full list). |
| 10 | New job list of 15 entries | skipped | A separate build. |
| 11 | Test people named like customers | skipped | Hannah's data: rename in Settings > People. |
| 12 | Done visit drawn as work ahead | fixed | A done block on the week and the day has a check, is lighter, and says "Done early" (or "Done late") when its done day is not its scheduled day. |
| 13 | Pass "$280 unpaid" against Home's $0 | fixed | `jobMoney` takes the pass's done visit ids; with no done unpaid visit it reads "$280, charged after each visit". Wired for the admin job money and `customers.get`. The customer portal's own call (`src/api/v1/portal/load.ts`, another build's) is not changed. |
| 14 | Schedule all preview rows | fixed | Each row says "Any time" and "Texted in 60 s, with Undo". |
| 15 | Add job 4.4 s, Cancel job 3.7 s | left | Measure only. Likely cause: each mutation calls `revalidatePath` and the next render reloads the whole admin data (`getLiveAdminData` reads customers, visits, passes, messages and the newest 5,000 events) before the panel updates. Returning the new row from the action and updating the panel before revalidating would remove the wait. Not measured here. |
| 16 | Phone tap targets | fixed | 44px below `md` for By job / By person, the Settings tabs, Settings row buttons and checkboxes (a 44px hit area), the New job sheet's Close, the Must be home checkbox. |
| 17 | Reports | fixed | Quotes awaiting hidden until quotes exist; "Passes not yet paid"; three-letter months on the season chart. |
| 18 | Customers list | fixed | Unpaid column added; Marketing off by default (the Columns menu brings it back). |
| 19 | Export 0 rows enabled | fixed | Disabled at zero rows. |
| 20 | Home map blank | fixed | "No stops left today" when every stop is done or none is booked. |
| 21 | Week block name cut; Schedule all a text link | fixed | The name wraps; Schedule all is an outline button. |

Also: `src/lib/admin/live.test.ts` "Waiting on customer" failed on main because the snapshot's customer has no phone or email, so `queueMessage` found no channel, no text was queued and no ask went out (Waiting on customer is read only from a move whose ask went out). The test now gives that customer a mobile.

Not run here: `npm run test:stories` cannot start in this worktree (every story file, including untouched ones, fails to import the Storybook Vitest setup file from the parent `node_modules`). Run it from a checkout where it starts.
