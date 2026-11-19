# Status badge colours: research and one tone table (Nov 19 2026)

Research only, nothing built. Hannah asked: "late should be red, right? Go research the color of things."
Short answer: yes. Every system below gives the same answer, and the app's current pill mapping already breaks one rule they all share (see "What is wrong today").

## What every system agrees on

1. A badge colour is a tone chosen by what the status means (good, needs attention, failed, in flight, nothing to do), never by brand colour.
2. The set of tones is small: five or six, one per meaning.
3. A status uses the same tone on every screen ("use the same tone for the same status throughout your app", Polaris).
4. Colour never carries the meaning alone: the word is always there, often with a dot or icon (Atlassian: "Don't use color alone to signify an important attribute"; WCAG 1.4.1).
5. Red is held back for things that failed or are late, so it stays loud. Grey is for states with nothing to do.

## Comparison

| System | Tones | How meaning maps | Notes |
|---|---|---|---|
| [Shopify Polaris Badge](https://shopify.dev/docs/api/app-home/polaris-web-components/feedback-and-status-indicators/badge) | info, success, caution, warning, critical, neutral (auto) | success = positive outcome; caution = advisory; warning = potential issue; critical = urgent problem; info = neutral status; neutral = no intent | Best practice text: critical for errors needing action, warning for problems needing attention, same tone for the same status everywhere. An optional icon "reinforces the badge's meaning". Older Polaris also had attention (yellow), new, and progress (partially/complete fill icons). |
| [Atlassian Lozenge](https://atlassian.design/components/lozenge/usage) | default (grey), inprogress (blue), moved (yellow), new (purple), removed (red), success (green) | Semantic colours "for workflow status, risk, or other well-defined conditions"; accent colours only for user-picked labels | "Don't use an accent color for a label that has semantic meaning." Sentence case. Say "Off track" or "Blocked" in words, with an icon where relevant. |
| [GitHub Primer StateLabel](https://primer.style/components/state-label) | draft grey, open green, closed purple (issue) or red (PR), merged purple, unavailable grey | State names, not success/danger; "done" is its own purple token, so finished-and-accepted and failed are different colours | Shows a system may use a sixth hue (purple) for "completed, no longer open" so green stays for "live and good". We do not need it. |
| Material 3 | error / error container; no success or warning roles | Error container is the fill for error states, on-error-container carries the text; success and warning are left to the product | [Colour roles](https://developer.android.com/reference/kotlin/androidx/compose/material3/ColorScheme). Confirms the pattern: a tint fill plus a dark ink on it, and error is the one fixed red. Warning and success are product extensions. |
| Mailchimp campaigns | Sent, Draft, Scheduled, Paused, Sending | I could not find a published colour spec. The product shows a dot, a tint and the word. A third-party email kit that copies the pattern uses [muted draft, blue scheduled, amber sending, green sent, red paused](https://thefrontkit.com/docs/email-marketing-kit/campaigns) | Treat as pattern evidence, not a source: grey for not started, blue for queued, green for done, red for stopped. |
| Linear | Backlog, Todo, In Progress, Done, Canceled | Status is an icon shape plus colour; categories (backlog, unstarted, started, completed, canceled) | [Workflows](https://linear.app/docs/configuring-workflows). Docs name the categories but not default hex values. The shape (empty circle, half circle, check, x) carries the state so colour is a second channel. |

## Contrast and "colour is not alone"

- WCAG 2.2 [1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): information must not rely on colour alone; text or shape must also say it. Our pill is always the word plus a dot, so this passes by construction. The dot is a bonus cue for sighted scanning, not the carrier.
- WCAG 1.4.3 asks 4.5:1 for 12px text. A pill is text on a 10 to 14 percent tint of its own hue, so the ink must be a darker step than the dot. Measured below (white, cream and stone surfaces; I computed these with the standard relative luminance formula).
- A dot is a non-text mark and needs 3:1 only if it carries meaning alone, which it never does here. Even so, the dot is drawn in the ink colour (`bg-current`), so it inherits the text contrast.

## What is wrong today

On `job-object-mailchimp` the pill tones are: green (Done, Charged, Paid, Active), "BOOKED" = brand orange tint (Scheduled, Routed, Invoice sent), red (Charge failed, Failed, Past due), and grey for everything else including Unscheduled, Unpaid, Pending and Waiting.

1. **Orange is doing two jobs.** `--primary` orange means "action" everywhere else (buttons, links, focus). On a pill it reads as "warning" to anyone who has used Stripe, Shopify or Jira. A booked visit, the calm good state, looks like it needs attention.
2. **The warning token is the same hue as the brand.** `--color-warning` is `#B45309`, which is `--primary-dark`. Measured, the 10% tints of warning and brand orange are `#F8EEE6` and `#FBF1E6`: indistinguishable. So the app has no real amber.
3. **Unpaid and Unscheduled are grey.** They are the two states that need someone to act, yet they look like Canceled and Skipped, which need nothing. A scanning eye cannot find the work.
4. **Past due is red (correct)**, but Late (a Scheduled visit whose day has passed) is only a small grey "day passed" note.

## Proposed tone table (the one mapping)

Six tones. Hue is chosen so that no two tones are neighbours on the colour wheel, except success and info, which differ in lightness and are never the same word.

| Tone | Meaning | Statuses (admin) | Customer account words |
|---|---|---|---|
| **critical** (red) | Failed or late, someone must act now | Late, Past due, Charge failed, Failed, Not delivered | Past due, Payment failed |
| **success** (green) | Finished well | Done, Charged, Paid (with how), Active, Delivered | Done, Paid |
| **info** (navy) | On the books, nothing to do, waiting for its day | Scheduled, Booked, Invoice sent | Booked, Invoice sent |
| **warning** (gold) | Needs a person, not yet failing | Unscheduled, Needs a day, Waiting on customer, Unpaid, Not done | Needs a new day, Unpaid, Pick a day |
| **progress** (navy light) | In flight, will resolve by itself | Open, Routed, Pending, On my way | Pending |
| **neutral** (grey) | Nothing to do, over | Canceled, Skipped, Expired, Not closed (as a badge), no state yet | Canceled, Expired |

Money and work are separate pills (as today), so a visit can read "Done" (success) beside "$115 unpaid" (warning). That is correct: it is done, and money is outstanding.

### Tokens and contrast

Pill = tint background at 10% of the dot colour (14% for warning), a 1px border at 30%, the dot in the ink colour, the word in the ink. Ratios are text-on-tint, from my calculation, on white / cream / stone surfaces.

| Tone | Tint (token) | Ink and dot | Text on tint, white / cream / stone |
|---|---|---|---|
| critical | `bg-destructive/10` | `#B91C1C` `destructive` | 5.45 / 5.25 / 5.02 |
| success | `bg-positive/10` | `#166534` `positive-deep` | 6.23 / 5.99 / 5.74 |
| info | `bg-navy/10` (12% when a grey neighbour is on screen) | `#2B3544` `navy` | 10.4 / 9.9 / 9.5 |
| progress | `bg-navy-light/10` | `#3D4F63` `navy-light` | 7.2 / 6.9 / 6.6 |
| warning | new `--color-warning-tint` = gold at 14% | new `--color-warning-ink` `#854D0E` (dot `#A16207` only if drawn separately) | 5.70 / 5.49 / 5.24 (ink `#713F12` reaches 7.2 / 6.9 / 6.6 if more margin is wanted) |
| neutral | `bg-stone` | `#44403C` charcoal-stone, or `text-muted-foreground` `#756E69` | 9.4 on stone for `#44403C`; `#756E69` is 4.59 on stone (passes, tightest of all) |

Everything clears 4.5:1 on all three app surfaces. Today's brand-orange pill ink (`#92400E`, 6.4 / 6.1 / 5.9) would also pass; the problem is meaning, not contrast.

### Why the warning is gold, not our brand orange

- Orange `#D97706` means "do this" on buttons, links and focus rings. If a pill is the same orange, the reader cannot tell "this is a status" from "this is clickable".
- `#B45309` (today's `--color-warning`) is only a shade darker than the brand's own `primary-dark`. At pill size the tints are identical, so warning would just read as "brand colour".
- Gold (hue about 38 degrees, `#A16207` family) sits between orange and yellow, is the conventional "attention" hue in Polaris (caution), Atlassian (moved/yellow) and Linear's "in progress", and still passes 4.5:1 once the ink is dark enough. It is a different hue from red, and the word always disambiguates.
- Orange stays for actions only: buttons, links, the active nav item, the chart's first series. It may appear on a pill never.

### Why Scheduled and Booked are navy, not green or orange

Scheduled is "all is well, nothing to do, wait for the day". That is calm information, so navy (our info tone) fits and leaves green for outcomes: Done and Paid. This also stops a screen of Scheduled visits from reading as a screen of good news. One caution: a 10% navy tint is close to grey. The navy ink is darker than the grey pill's ink and the pill has a navy border, but this is the least visible separation in the table. See question 3.

## Late

"Late" needs its own definition because today there is no such state:

- A Scheduled visit whose day has passed and is not marked done is Late (red). Today it shows Scheduled plus a grey "day passed" note.
- An invoice past its due day is Past due (red), already so.
- A card charge that failed is Charge failed (red), already so.
- A customer's Booked visit never reads Late. The customer account keeps "Booked" until the visit is done or Ryan moves it; the late state is for the office (Home's Past its window group is its twin).

## Questions for Hannah (with my default)

1. **Is Unscheduled warning (gold) or neutral (grey)?** Default: warning. An unscheduled job is work only the office can move; a grey pill hides it among Canceled and Skipped. Unpaid is the same: gold.
2. **May the brand orange ever be a status tone?** Default: no. Orange stays for actions (buttons, links, active nav). The warning tone is a distinct gold. This changes today's Scheduled pill from orange to navy.
3. **Is a dot enough on a phone, or do we add an icon?** Default: the word plus the dot is enough, since the word is always shown and a pill is never colour-only (WCAG 1.4.1 passes). Add a small icon only to critical (a warning triangle) so red is never the only signal on a phone in sunlight. Also: should info be a true blue instead of navy, since navy at 10% is the closest tone to grey? Default: keep navy; it is the brand and the ink is about 10:1 on its tint.

## How to apply (when built)

- One mapping, one file: `src/lib/admin/status-tones.ts` exports `type Tone = "critical" | "success" | "info" | "progress" | "warning" | "neutral"`, `TONE_FOR: Record<PillStatus, Tone>` (the table above, every status word once, a test that every `PillStatus` has a tone) and `TONE_CLASSES: Record<Tone, string>`.
- `StatusPill` reads `TONES[status]` from that file and drops the five local constants (`GOOD`, `BOOKED`, `WAITING`, `BAD`, `OVER`). The customer account pills pass the same `status` with their own `label` (the existing `label` prop), so a customer's Booked is the same navy as the admin's Scheduled.
- Tokens in `globals.css` and `docs/DESIGN.md`: add `--color-warning-ink` (`#854D0E`) and `--color-warning-tint` (gold at 14%), and re-point `--color-warning` away from `#B45309` so a chart delta or a banner also stops looking like the brand. Add a `late` work state to `src/lib/admin/jobs.ts` (derived from `dayPassed`) mapped to critical.
- Gate: the design gate may forbid any pill class outside `TONE_CLASSES`, so a screen cannot colour a pill by hand.
- Add a Storybook story that draws every tone on white, cream and stone, with axe, as the approval surface.
