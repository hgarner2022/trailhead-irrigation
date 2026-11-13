# Live readiness audit, 13 November 2026

Read-only audit of the wired Season Pass app on branch `checkout-basics-2`. Nothing was run against Stripe, Resend, Neon or Vercel; every verdict comes from reading the code against the installed packages (stripe 23.1.0, API 2026-10-28.endive; @stripe/react-stripe-js 7.0.1; next 16.1.6; next-auth 5.0.0-beta.32).

Why this exists: Phases 3 to 11 were built and tested against a test database and stubbed services. A stub accepts whatever the code sends, so the first live run found what the stubs could not. This list is everything else of that kind that I can see from the code.

How to read the verdicts: OK means I read it and expect it to work. RISK means I expect a failure and name it. UNKNOWN means it depends on something only a live call or a dashboard setting can settle, and I say what.

---

## The ranked RISKs (most likely and most damaging first)

| # | Risk | Where | What you will see | One-line fix | Phase |
|---|------|-------|-------------------|--------------|-------|
| 1 | The card-update session has no `currency` (same rejection as today's setup session) | `src/lib/stripe/card-update.ts` line 11, `stripe.checkout.sessions.create` | "Update card" on the pass page throws. A failed charge also throws while it builds the update link: the charge row is already marked failed, the queue retries, the retry sees "failed, waiting for a new card" and ends quietly. No link, no event, no email. The `payment_method.detached` handler breaks the same way. | Add `payment_method_types: ["card"]` and `currency: "usd"` to the session (card only also fixes risk 5). | 7 |
| 2 | The checkout's address box only knows 14 invented addresses | `checkout-address.tsx` line 36 defaults to `fixturePlaces`; `page.tsx` never passes a real provider; `AddressSearch` has no "type it in yourself" fallback | A real customer types their street and gets no suggestions, so Continue never turns on. Only "123 Trailhead Way" style addresses work. | Wire the Google Places route, or add a manual entry (street, town, zip) that goes through the existing `serviceability` check. | 8 |
| 3 | Nothing customer-facing ever sends | `messages.ts` only writes rows to `message_log` with status `queued`; no queue handler exists for `message`, and nothing reads `queued` rows | No purchase confirmation, no receipt, no "card declined" email, no "your card was removed" email, no cancellation email, no day-before text, and the crew summary (queued as a `message` item) never reaches Ryan. Only the sign-in link and the contact form send today. | Do Phase 12 before the checkout takes a real card. Until then, put a line on the Done step and the pass page that says "we will call or text about your visit". | 12 |
| 4 | Charges and webhook work wait for the one daily cron | `visits/handlers.ts` line 129 enqueues `pass-charge` on completion, but only the checkout action and the Stripe webhook call `drain` | A visit marked complete is charged at 11:00 UTC the next morning, not when Ryan closes it. A webhook whose `after()` drain dies waits up to 24 hours. | Call `after(() => drain(...))` in the visit-complete action; make the cron route list what it drained. | 11 |
| 5 | Setup sessions allow any payment method, but the code requires a card | `checkout.ts` `createSetupSession` sets no `payment_method_types`; `paymentMethodFromSession` throws "The session saved no card" when `method.card` is missing | A customer who saves Link, a bank account or a wallet finishes the form, and then activation fails after they think they are done. | `payment_method_types: ["card"]` on the session. | 8 |
| 6 | Changing the contact details inside ten minutes breaks the card form | `checkout.ts` idempotency key `setup-${pass.id}-${bucket}`; the params include `customer_email` and `metadata.name` | Stripe answers 400 "Keys for idempotent requests can only be used with the same parameters". The customer sees "We couldn't reach the card form". Hits anyone who goes back, fixes a typo in their email and presses Continue. | Add a short hash of email and name to the key. | 8 |
| 7 | Any exception on a page is a bare production 500 | There is no `error.tsx` or `global-error.tsx` anywhere; only `not-found.tsx` (site, checkout). Admin has `loading.tsx`; the account pages have none | A database blip or a Stripe error on `/account/pass`, `/admin/*` or the checkout page shows Next's "Application error" with a digest. Server actions that "throw to the page's error boundary" (`changePreference`, `addInspection`, `startCardUpdate`) have no boundary to throw to. | Add `error.tsx` to the admin shell, the account area and the checkout, and `global-error.tsx`; each says what to do and shows the phone number. | 9, 11 |
| 8 | No one is told when something fails | No Sentry or similar; seven `console.error` calls in all; a queue item that fails five times becomes `failed` and nothing alerts; a declined card sets `cardFailedAt` and no `admin_alert` | A broken charge, a dead cron or a failed webhook is found only when someone opens Vercel logs or the admin Home. | Add Sentry (free tier) with the pass id and Stripe event id as tags; email the owner when a queue item goes `failed` or a charge fails. | 12 |
| 9 | A queue item that crashes mid-run is stuck forever | `queue/index.ts` `claimNext` takes only `status = 'pending'`; a function killed after claiming leaves `claimed` | A webhook run killed by a timeout never retries, so a paid-for pass can stay `pending`. The page's own `activate` call usually covers it, but only while the customer's tab is open. | In `claimNext`, also take `claimed` rows whose `claimed_at` is older than ten minutes. | 7 |
| 10 | The daily cleanup can delete a pass whose card was saved | `expirePendingPasses` runs only inside the daily cron and removes every pending pass older than the cutoff | If activation failed (webhook down, tab closed) the next morning's sweep deletes the pending pass and its visits. The card is saved at Stripe, nothing was charged, but the purchase is gone and a late webhook finds "Pass not found". | Skip a pass whose Stripe session is complete, or let the webhook activate before the sweep (drain first, sweep second). | 8 |

Risks 11 to 15 are smaller and listed after the table.

11. `payment_intent.*` events arrive for charges made while no `charge.stripe_payment_intent_id` is stored yet; the handler then returns without updating. Harmless today because `chargeVisit` writes the result itself. (`webhook.ts`, Phase 7.)
12. Everything after a Stripe call is a separate statement. `neon-http` has no interactive transactions, and the code correctly never calls `db.transaction(` (checked: none in `src/`, `scripts/`). The cost is that a crash between two statements, for example between the charge row update and the visit update in `chargeVisit`, leaves a half-written state that only the idempotent retry repairs. Keep every multi-step write idempotent. (Phase 7.)
13. Migration 0005 drops `proposed_at`, `approved_at`, `approved_by`, `mode` from `schedule_run`. Fine on an empty table. On a table with rows the data is lost, and the build migrates before the new code is live, so the old live code reading those columns would fail until the deploy finishes. (Phase 10.)
14. A removed admin or a typo in `SEED_ADMINS` locks everyone out: the seed only adds, the build is the only place it runs, and `/admin/sign-in` says "not on the list" for a stranger. Keep a second owner email in the list. (Phase 4.)
15. `page.tsx.bak` and `page.test.tsx.bak` sit in `src/app/(admin)/admin/(shell)/`. Not routes, so harmless, but delete them.

---

## Verdict table

### 1. Stripe

| Item | Verdict |
|------|---------|
| `getStripe()` builds `new Stripe(key)` with no `apiVersion`, so it uses the package's own 2026-10-28.endive | OK. Test and live keys must be the same mode as the publishable key and the webhook secret (see checklist). |
| `createSetupSession` (`checkout.ts`): `mode`, `currency`, `ui_mode: "embedded_page"`, `redirect_on_completion: "never"`, `expires_at`, `customer` or `customer_email`, `metadata`, `setup_intent_data` | OK for field names and values against the installed types (`UiMode` includes `embedded_page`; `currency` is "required in setup mode when `allowed_payment_method_types` is not set"). See RISK 5 and 6. |
| Customer creation in setup mode with only `customer_email` | UNKNOWN. The types do not say a customer is created; `paymentMethodFromSession` throws if `session.customer` is empty. A test-mode purchase settles it. Cheap fix: add `customer_creation: "always"` (the type allows it in setup mode). |
| `paymentMethodFromSession`: retrieve with `expand: ["setup_intent.payment_method"]`, reads `status`, `setup_intent`, `customer`, `metadata` | OK. |
| `createCardUpdateSession`: `ui_mode: "hosted_page"`, `success_url`, `customer` | RISK 1. Missing `currency`. |
| `chargeOffSession`: `amount`, `currency`, `customer`, `payment_method`, `off_session`, `confirm`, `expand: ["latest_charge"]`, idempotency key per visit and attempt | OK. A card that needs authentication arrives as a `StripeCardError` and is handled as a decline. |
| `isCardError` by `error.type === "StripeCardError"` and `error.payment_intent.id` | OK. |
| `stripe.customers.update(..., invoice_settings.default_payment_method)`, `paymentMethods.detach` | OK. |
| Embedded client: `EmbeddedCheckoutProvider` with `options={{ clientSecret, onComplete }}`, `loadStripe` from `/pure` | OK for v7 (a fixed `clientSecret` string is accepted; `onComplete` is kept in a ref so the options object stays stable). `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is baked in at build time: setting or changing it needs a redeploy. |
| Webhook route: raw body via `request.text()`, `constructEvent(body, signature, secret)`, 503 while the secret is unset, 200 for events we ignore, `after()` drain | OK. `constructEvent` is synchronous in v23 and fine on the Node runtime. `after` is a Next 16 API and works on Vercel's Node runtime. |
| Event names handled: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_method.detached` | OK as names. UNKNOWN whether all four are ticked on the endpoint in the Stripe dashboard, and which API version the endpoint was created with. Checklist item. |
| Activation runs from both the page and the webhook | OK, idempotent (`already-active`). Two truly simultaneous runs can both emit `pass.bought`; low. |

### 2. Email

| Item | Verdict |
|------|---------|
| `/admin/sign-in` sends through Resend with `Trailhead <contact@trailheadirrigation.com>` | OK in code (`resend.ts`, `auth.ts`). UNKNOWN only in that the domain must be verified in Resend; the contact form already sends from the same address, so if it delivers, this will. |
| Magic-link URL matches the live domain | OK. `trustHost: true` builds the link from the request host, so it follows whatever domain the owner typed. `AUTH_URL` is optional and not needed. |
| Link lifetime and prefetch | OK (ten minutes, single use). A corporate mail scanner that opens links can burn the token; owner uses Gmail, so low. |
| A failed send in the sign-in action | RISK (small): `requestSignIn` swallows the error and shows "Failed" with nothing in the logs. Log it. |
| Customer emails | RISK 3. Only sign-in and the contact form send. Everything else is a `queued` row. |
| Any customer message before Phase 12 | None will be sent. Receipts exist only as Stripe's own receipt URL stored on the charge. |

### 3. Database and migrations

| Item | Verdict |
|------|---------|
| Migrations 0005 and 0006 on `schedule_run` | OK on an empty table (the added columns have defaults); data loss on a table with rows, see risk 13. |
| Enum additions (`queue_kind` in 0003, `principal_kind` in 0004) | OK. `ALTER TYPE ... ADD VALUE` cannot use the new value in the same transaction, and neither migration does. Do not add a migration that adds and then uses an enum value together. |
| `neon-http` transactions | OK. No `db.transaction(` anywhere. See risk 12. |
| `for update skip locked` in `claimNext` | OK. Neon's HTTP driver runs each statement as its own transaction, so the lock lasts only for that one `UPDATE ... RETURNING`, which is exactly what is wanted. `result.rows` is the right shape for neon-http. |
| `now()` and Date parameters | OK. Defaults use `now()` in the database; JS dates go through the driver as ISO strings. |
| Indexes for admin queries | OK at this size. `findPerson` uses `lower(email) = ...` against an index on `(organization_id, email)`, so it scans; fine for thousands of rows, add a lower-case index later. |
| `db-migrate-on-build.mjs` runs on every build, including previews | UNKNOWN. Confirm `DATABASE_URL` is set for Production only, or every preview build migrates the live database. |
| Migration failure | OK by design: a failed migration fails the build, so the old deploy stays live. |

### 4. Env and config

Names read in code, against what the owner says is set in Vercel production:

| Name | Read where | Verdict |
|------|-----------|---------|
| AUTH_SECRET, API_KEY_PEPPER, RESEND_API_KEY, DATABASE_URL, STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, APP_URL, CRON_SECRET, GEOCODE_CONTACT, SEASON_PASS_CHECKOUT, SEED_ADMINS | various | OK, all set. |
| JOBBER_CLIENT_ID, JOBBER_CLIENT_SECRET | not read anywhere | Harmless. Nothing in the code uses them yet (no Jobber OAuth is wired). |
| AUTH_URL | optional (`readAuthEnv`) | OK to leave unset. |
| APP_BOOKING, ADMIN_DATA_SOURCE, SEED_FIXTURE_PASSES | flags and seed | OK unset. Admin pages call `getAdminData("live")` directly, so the fixture default never applies in the admin. Never set `SEED_FIXTURE_PASSES` in production. |
| BREVO_API_KEY | scripts only | OK. |
| A Google Places key | does not exist yet | See section 7. |
| APP_URL value | success URLs, emails, card-update links | UNKNOWN. The code comment says `https://www.trailheadirrigation.com`, the project notes say Vercel redirects www to the apex. Set `APP_URL` to whichever host is canonical, no trailing slash. |
| `vercel.json` cron | `0 11 * * *` on `/api/cron/daily` | OK. One daily job is within Hobby limits; Hobby can fire anywhere inside that hour. Vercel sends the bearer secret only when `CRON_SECRET` is set (it is). The `drain`, `feed`, `schedule` routes still exist and work by hand with the secret. |
| `force-dynamic` | webhook, all four cron routes, checkout page, pass page | OK. |
| No `maxDuration` set on any route | | RISK (small). The daily cron does feed fetches, the schedule pass and up to 50 queue items, and 50 geocodes alone take 50 seconds by Nominatim's one-a-second rule. Add `export const maxDuration = 300` to the cron and webhook routes. |
| `src/proxy.ts` matcher `["/admin/:path*", "/account/:path*"]` | | OK. The webhook, cron, API and checkout are not behind it. It needs only `AUTH_SECRET`. The cookie name switches on `https`, which matches Vercel. |

### 5. External calls at runtime

| Item | Verdict |
|------|---------|
| Nominatim | OK. Descriptive `user-agent` with the contact, one request a second per process, 10 second timeout, a non-200 throws so the queue retries, "no match" is cached as a hollow pin. The throttle is per process, so two warm instances could break the one-a-second rule; with one daily cron that is unlikely. Retry delays of 2 to 32 minutes mean nothing in practice, since the next drain is tomorrow. |
| iCal feed fetch | OK. 15 second timeout, `no-store`, a 404 throws and the item retries then ends `failed`, which nothing reports (risk 8). A truck with a wrong URL fails quietly. |
| DNS `resolveMx` | OK. `node:dns/promises` works on Vercel's Node runtime. Two second race, only `ENOTFOUND` and `ENODATA` count as "no mail server", so a slow or failing resolver lets the customer through. |
| `after()` | OK on the Node runtime; it runs after the response inside the function's time limit. It is best effort, which is why risk 9 matters. |

### 6. Auth and pages

| Item | Verdict |
|------|---------|
| Session cookie on the custom domain | OK. JWT, `trustHost: true`, `secureCookie` chosen by protocol in the proxy and Auth.js alike. |
| `requireAdmin` against seeded admins | OK. `findPerson` checks `admin_user` first; `SEED_ADMINS` fills it on each build. Role is copied into the token at sign-in, so a role change needs a fresh sign-in. |
| Customer sign-in | OK. `/account/sign-in` goes through the same `findPerson`, which finds a customer by `lower(email)`, so the person who bought can sign in with the purchase email. A customer who started and abandoned checkout can also sign in and sees the empty state. |
| Pass page with no pass | OK. Shows "No Season Pass on this email yet" with a link; a pending pass does not count. |
| Admin signing in at the customer page | OK, handled (`principal.type === "customer"` check). |
| Error boundaries | RISK 7. |
| `loading.tsx` | RISK (small). Only the admin shell has one. `/account/pass` and the checkout have none, so a slow read is a blank page. |
| Error redirect for admin | RISK (small). `pages.error` and `pages.signIn` point at `/account/sign-in`, so an Auth.js-level admin error lands on the customer page. |

### 7. Places

| Item | Verdict |
|------|---------|
| Provider | RISK 2. Fixture only. |
| What Google Places needs | A server route (the plan names `/api/v1/places/suggest`) that holds `GOOGLE_PLACES_API_KEY` (not `NEXT_PUBLIC_`), restricts the key to the Places API and to your server, accepts `q` and a session token, returns `PlaceSuggestion[]`, and is rate-limited like the checkout. Add the env name to `env.ts` and `.env.example`. Pass the provider into `AddressStep` from `CheckoutFlow`. |
| A real address typed today | The server checks the picked address with `serviceability`: town name in Colorado first, then the ten zips in `SERVICE_ZIPS`. That logic is OK. The zip list is marked "Ryan confirms before go-live" and is not yet confirmed. Louisville has only 80027 and Firestone only 80520; an Erie address on an 80504 or 80530 zip would be refused if the town string differs. |

### 8. Money math

| Item | Verdict |
|------|---------|
| `season-pass.ts` against `public/pricing.md` | OK. 6 zones $240, 8 zones $260, 10 zones $300, 12 zones $340, +$20 per zone, add-on $145 plus $10 over 8 zones, all agree. (`/pricing` page copy was not re-read line by line.) |
| Cents against dollars | OK. Visit amounts are whole-dollar integers in the schema; `toCents` is applied once, in `chargeOffSession`. No fractional dollars can arise because every price is an integer. |
| Charge amount types | OK. `charge.amount` and `visit.amount` are integers. |

### 9. Operational blind spots

| Item | Verdict |
|------|---------|
| Error reporting | RISK 8. None. |
| Logs carry ids | Partly. The checkout logs step and pass id. Webhook and queue errors store `last_error` (500 characters) on the row but do not log the Stripe event id or pass id. |
| Alert on failed charge | RISK 8. Only `cardFailedAt` and the admin pages; no push. |
| Alert on failed cron | RISK 8. A 500 from the cron route is visible in Vercel's cron log only. |
| Uptime check on the cron route and the webhook | None. The routes answer 401 and 400 to anonymous calls, which can be monitored for "is it up" without the secret. |
| Smoke test against production | None. `.github/workflows` does not exist; nothing runs after a deploy. The checklist below is the manual version. |

---

## Checklist: run this after every phase that goes live

Do it in Stripe test mode first, then once in live mode with a card you own and refund.

**Before you click**

1. In Vercel, Production: confirm the names in section 4 are present and the Stripe key, publishable key and webhook secret are all test or all live. A changed `NEXT_PUBLIC_` value needs a redeploy.
2. In the Stripe dashboard, the webhook endpoint points at `https://<canonical host>/api/webhooks/stripe` and listens to `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_method.detached`.
3. Watch the deploy's build log for `db-migrate-on-build: applying migrations` followed by no error.

**What to curl** (nothing here needs a secret except the last)

4. `curl -s -o /dev/null -w "%{http_code}\n" https://<host>/api/cron/daily` should print 401.
5. `curl -s -X POST https://<host>/api/webhooks/stripe` should print a 400 "No Stripe-Signature header" (503 means the webhook secret is missing).
6. `stripe trigger checkout.session.completed` from the Stripe CLI, or "Send test webhook" in the dashboard, then look for a 200.
7. With the secret: `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/drain` returns counts of `done` and `failed`. Any `failed` above zero is a bug to read.

**What to click**

8. Checkout end to end with a real-looking address that is not on the fixture list, a typo in the email corrected inside ten minutes, then the card. Reload on the card step and confirm you land back on it, with your answers.
9. After the card: the Done step shows the pass; the admin Passes page shows the same pass, with the card brand and last four.
10. Sign out, then sign in at `/account/sign-in` with the purchase email: the link arrives, opens once, and `/account/pass` shows the pass.
11. On the pass page press "Update card": it must open Stripe's hosted page, and after saving return to the card-updated page (this is the screen that fails today).
12. In admin, complete a visit; then confirm the charge row appears (today it only appears after the daily cron, see risk 4) and the receipt shows in Stripe.
13. Decline test: use a card that fails off-session (Stripe test card 4000 0000 0000 0341), complete a visit, and confirm the pass shows the failed-card state and the update link exists.

**What to read in Vercel logs**

14. Filter the function logs for `failed at the` (checkout), `Nominatim answered`, `calendar feed answered`, `Resend failed`, and any `Error` on `/api/webhooks/stripe`. Zero lines of each after the run is a pass.
15. In the database, `select kind, status, last_error, count(*) from queue_item group by 1,2,3` should show no `claimed` rows older than ten minutes and no `failed` rows. `select count(*) from message_log where status = 'queued'` tells you how many customer messages are waiting for Phase 12.
