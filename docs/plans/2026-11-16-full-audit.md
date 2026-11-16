# Full audit, 16 Nov 2026: jobs to be done, what is built, the code, the UX

Hannah: "What else did you probably forget? Review everything… Think about
the jobs to be done, what we're building, the code, UX best practices."
Everything below was checked in the code or on the live site today, not
recalled. **Fixed** means a PR is open or merged today; **building** means
an agent is on it in a worktree; **open** means nobody is.

## 1. The jobs, and whether the product does them

| Chair | Job | State | Evidence |
|---|---|---|---|
| Customer | Buy a pass on the phone in five minutes | **Broken for real addresses, building** | The live address box uses the fixture provider (fourteen invented streets); Google Places was never wired. A typed-address fallback plus Places behind a key is being built (branch `address-live`). |
| Customer | Know when we come, add it to the calendar | Works | Confirmation with the pass card, dates, `.ics`; texts once Twilio's campaign is approved. |
| Customer | Pick or change a day | Partly | Picks at checkout; on the pass page only a must-be-home customer gets area days. The three-open-days offer shows Saturdays and April 26 (build 2). No general "move my day" yet. |
| Customer | Pay without thinking | Works for card passes | Card on file charged after each visit, receipt emailed. No way to pay a bill by card (no payment page): "Bill sent" is a state with no bill behind it. **Open.** |
| Customer | Renew | Partly | Renewal link and `?renew=` work; nothing sends the December email or makes the January pass. **Open** (auto-renew is designed, not built). |
| Customer | Be reached the way they prefer | Deferred | Text first, email when no phone. Hannah: keep it, loop back. |
| Ryan | See tomorrow in order on his phone | **Open** | No day view, no route build; the Schedule page is the office's. Build 2. |
| Ryan | Done, not done, how was it paid | Works | Visit panel. |
| Ryan | Take a job or a pass at the door | Pass **building**; one-off works | New visit exists; New pass with no card needed is being built (branch `office-sells-a-pass`). |
| Ryan | Know what the service includes | **Open** | No service description anywhere; Ryan's Jobber text exists. Next after the pass sale. |
| Ryan | Be the person on the schedule, not "Truck 1" | **Open** | Visits hang off trucks; Employee table is build 2's first step (`DATA_MODEL_V2.md`). |
| Hannah | Is the week sane, how is the money | Works | Home v2 live today: Today or Next up, four money figures, map, Needs action. |
| Hannah | Act on what failed | **Fixed today** | Retry on queue failures did nothing; now one grouped row with a Retry that re-queues. |
| Hannah | Anything she does happens now | **Fixed, PR #36 open** | Every admin action, customer action, API call and MCP call queued its message or charge and waited for the daily cron at 4am Denver. Now drained right after the response. This is why "nothing is really happening". |
| Hannah | Change prices, services, days | Partly | Settings has trucks, areas, capacity, messages, keys. Services are rows but not editable there; capacities 8 and 14 are wrong (build 2 derives capacity from minutes). |
| Both | Texts arrive | Blocked on Twilio | Credentials are right now (PR #33); the number says "Messaging disabled" until the A2P campaign is approved. Hannah's side. |

## 2. What we are building, against what is built

Built: the website, the checkout (card passes), the customer pass page,
the admin (Home, Schedule, Visits with the two pills, Customers, Reports,
Settings), the open API and MCP, messaging (email live, texts pending),
the job table, the Jobber read-only feed. Designed and not built, in the
order they break someone's job: Employee as the hierarchy; the offers
and slots fixed (route days, capacity from minutes, no fake windows);
Ryan's day view; the pass sale from the office (building); service
descriptions and line items; the bill and its payment page; auto-renew;
customer moves with the 48-hour rule; the fall pull-earlier; quotes.
`DATA_MODEL_V2.md` is the shape all of it lands in.

## 3. The code: what was found

| Finding | Severity | State |
|---|---|---|
| Admin, customer, API and MCP mutations never drained the queue; only the checkout and the Stripe webhook did. Messages and charges waited for the daily cron. | High | Fixed, PR #36 |
| The live checkout's address box is the fixture provider; no Google Places; no typed fallback. Real customers cannot pick their street. | High | Building |
| The daily cron runs at 11:00 UTC, 4am Denver, and drains at once: a day-before text queued by it goes out at 4am. Needs a quiet-hours rule (send after 8am local) in the sender, or a later cron. | High | Open |
| Pending-pass expiry (the one-hour rule) runs only in the daily cron, so abandoned checkouts sit up to a day and count toward the three-per-hour limit. | Medium | Open (expire inside `passes.create` too) |
| Retry on a queue failure did nothing; six identical rows. | Medium | Fixed, merged |
| Twilio auth failure retried forever instead of falling back to email. | Medium | Fixed, merged |
| An active pass must have a card (checkout only); no office sale. | High | Building |
| `pass-charge` on a pass with no card would fail; Done must ask how it was paid instead. | Medium | Building (same branch) |
| "Bill sent" money state has no bill, no payment page, no invoice record. | Medium | Open (`DATA_MODEL_V2.md` step 4) |
| Visits hang off `truck_id`; no employee. | Medium | Open (step 1) |
| Zones, access note and must-be-home live on the pass, not the property, so a one-off visit has none of them. | Medium | Open (step 3) |
| `job.price` is one number; no line items; a repair with labour and materials cannot be itemised or receipted line by line. | Medium | Open (step 2) |
| No error monitoring: failures are console lines in Vercel logs only. A queue failure reaches Home, a thrown page error reaches nobody. | Medium | Open (Sentry or Vercel's log drain + a Home row for 5xx counts) |
| The Jobber mirror tables (quotes, invoices) are read-only and the exit plan is nightly feed only; fine for now. | Low | By design |
| 34 remote branches, most merged. | Low | Housekeeping |
| The PassCard tilt test is flaky. | Low | Open |
| Move's time dropdown starts at 7:00; "Routed" state for checkout-placed visits. | Low | Open |

## 4. UX, against the principles in `docs/UX_PATTERNS.md`

- **Plain words everywhere**: done on the pills and Home today. Still to check: the customer pass page's headline words and the emails' subject lines against `UX_WRITING.md`.
- **One place per action**: the Passes button is gone; a pass is a chip and a link. New pass will sit beside New visit (two actions, both verbs).
- **The checkout**: the "Your days" step offers days the settings do not allow and fake windows; the address step cannot find a real street. Both are the two highest-ranked customer problems today.
- **Messages at a decent hour**: see the 4am finding. Nobody should get a text at 4am.
- **Empty states**: Home, Visits and the map say what appears and when; the map's tiles need network and show blank in a sandbox (fine live).
- **Accessibility**: every story runs axe; the live pages were not run through axe today.
- **Mobile**: Home, Visits and the sheets have phone stories; the admin is still a laptop product until the day view exists.

## 5. What only Hannah can do

Twilio: wait for the campaign (then reply to a test text). Stripe: rename
the public business name, turn off Link and bank payments. Google: a
Places API key into Vercel as `GOOGLE_PLACES_KEY` (the checkout will work
without it through typed addresses once `address-live` lands). Ryan's ten
questions on route days per town and Saturdays, so build 2's offers are
his, not mine.
