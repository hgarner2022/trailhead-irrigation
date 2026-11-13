# Hannah's list

What only you (or Ryan) can do before the wiring phases that need it. Written
2026-11-12 night; tick things off here. Each item says what it is, why it is
needed, roughly how long it takes, and which phase waits on it.

## Accounts to create (each is a sign-up, not code)

1. **DONE 2026-11-12 (saved as a draft app named Trailhead Lawn & Irrigation; Hannah added JOBBER_CLIENT_ID and JOBBER_CLIENT_SECRET to Vercel for all environments the same night). Jobber developer app.** At developer.getjobber.com, sign in with the
   Trailhead Jobber login and create an app. It gives a client id and secret
   that let our app read and write Jobber (create jobs, see completions).
   About 20 minutes. Needed by Phase 0, the very first wiring phase, which
   checks what Jobber's API can and cannot do before anything else is built.
2. **DONE 2026-11-12. Neon database, through Vercel.** In the Vercel dashboard for the site,
   Storage, add Neon Postgres. It is the database every pass, visit, message
   and setting lives in. About 10 minutes, free tier. Needed by Phase 3.
3. **DONE 2026-11-12: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (Config) and STRIPE_SECRET_KEY (Secret) are in Vercel; the webhook secret comes with Phase 7. Stripe test keys.** In the Stripe dashboard, Developers, API keys, copy
   the test publishable and secret keys. Test mode lets us build and try the
   card step with fake cards; live keys come at launch. About 10 minutes.
   Needed by Phase 7.
4. **STARTED 2026-11-12: the account exists (onboarding answered: business, owner, notifications) but is a 30-day trial with no number. Twilio's Buy A Number page says the feature is not available on a trial and that a primary compliance profile (business name, address, tax id) is needed first. So: upgrade with a card, create the compliance profile, then buy one local number, set its incoming-message webhook to https://www.trailheadirrigation.com/api/twilio/inbound, file the A2P 10DLC registration, and put TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM into Vercel. Twilio account and carrier registration.** Sign up at twilio.com, buy
   one local number (about $1 a month), then complete the "A2P 10DLC"
   registration in the Twilio console: Trailhead's business details and a
   description of the texts we send (reminders, on-my-way, receipts; a
   separate marketing campaign only if you want it). A few dollars, and
   carrier approval takes days to two weeks, so start it early. Without it
   the texts are blocked. Needed by Phase 12.

## Words to write

5. **LIVE 2026-11-12 as section 17 of /terms (PR #4); edit any time. Season Pass terms.** The terms a customer accepts on the card step:
   what the pass is, when the card is charged, cancellation, the add-on,
   what happens if a visit cannot be done. One page. I can draft it from the
   PRD for you to edit. Needed before the first live charge (Phase 7 close).
6. **The "reserved in July" wording on /season-pass.** The page still says
   the blowout date is reserved in July in two places (the hero line and
   the calculator card). Say what you want it to say now that customers
   give a preference instead. Five minutes, any time.

## Answers (reply here or in chat)

7. **ANSWERED 2026-11-12 from Colorado guidance: no tax on service visits (the pass), tax on parts lines in repairs at the local rate; confirm the parts treatment with the accountant. Sales tax.** Every Jobber invoice in the audit carried zero tax.
   Confirm that is right for irrigation service in Colorado, or tell me
   what should be charged. Needed before the first live charge.
8. **ANSWERED 2026-11-12: pass customers get Trailhead's reminders; Jobber's per-client reminder toggle is switched off for them (by API if Phase 0 finds it, else by hand). Jobber's own notifications.** Phase 0 checks whether Jobber's reminder
   emails can be turned off per job. If they cannot, pass customers would
   get Jobber's reminder and ours until you turn Jobber's off for the
   account. Decide which you prefer when that answer comes back.
9. **Ryan confirms the zip list.** `SERVICE_ZIPS` in `src/lib/places/index.ts`
   is the list of zip codes the checkout accepts as the six towns. Ryan
   should look it over once; two minutes.

## Ryan's scheduling answers (needed by Phase 10, the scheduler)

DEFAULTS SET 2026-11-12 from the Jobber data (see the wiring plan's Answers section); Ryan corrects any of them in Settings once it exists. Hannah, the same night: Truck 2 runs the full season, April to mid-November; the app never closes or changes anything already in Jobber.

10. Which towns share a truck-day, and does the same truck keep the same
    towns all season. My guess: Erie + Firestone, Longmont, Louisville +
    Lafayette, Broomfield.
11. Visits per truck per day for a turn-on, an inspection, a blowout and a
    repair.
12. Working days per truck, and whether Saturdays exist in October.
13. Whether "earlier" means the first day we are in that area, or any
    earlier week.
14. The trucks: names, which Jobber user each is, and whether the second
    person is spring and fall or blowout season only.
15. Where the route order comes from on a busy day today, and whether the
    second truck gets its own route.
16. What to do with the 55 open jobs with no visit and the 101 past visits
    never marked complete in Jobber: cancel, close as done, or leave.
17. The 16 open quotes (about $33k, oldest May) and the 14 past-due
    invoices: chase, archive, or leave.

## Approvals in Storybook

18. **DONE 2026-11-12 (Hannah: "Storybook approval, sure").** Open Storybook (`npm run storybook`, or the browser pane) and look at
    each screen; tell me "approved" or what to change. The table in
    `docs/DESIGN.md` under Approvals lists them: Schedule, Settings,
    Customers, Checkout, Pass page. Home, Passes and Revenue were approved
    earlier.

## Already settled tonight (no action)

- Prices: the website's numbers are right; Jobber's were testing.
- Texting: on, two-way, with STOP handled by the app and C or R on the
  reminder.
- The pass is two visits; the July inspection is an add-on.
- The address is one box with type-ahead; towns outside the six are refused.
