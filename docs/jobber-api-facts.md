# Jobber API facts

Task 0.1 of the Season Pass wiring plan. Checked 2026-11-12.

API version used: 2026-09-25 (the newest entry in https://developer.getjobber.com/docs/changelog/). Sent in the `X-JOBBER-GRAPHQL-VERSION` header on every request (required for all apps). Endpoint: `POST https://api.getjobber.com/api/graphql` with `Authorization: Bearer <token>`.

## How this was checked, and what could not be

- Confirmed from Jobber's public docs (read in the app's browser pane, because the docs sit behind a bot check that plain fetches fail): webhooks, rate limits, versioning, custom fields, changelog. Also the webhook topic picker in the Developer Center app page, and the live account through the Jobber connector (read only).
- NOT confirmed: the GraphQL schema reference (input fields of `JobCreateAttributes`, the visit mutations, payment and cancel mutations). The docs have no public reference pages and GraphiQL ("Test in GraphiQL" on the app) sends you to Jobber's sign-in, which needs the password and a tester account (a person step). Questions 1, 2, 4, 6, 7 and 8 therefore keep the plan's defaults, marked below. Phase 6 must run the introspection queries in GraphiQL before an adapter relies on them. Introspection query to reuse:
  `{ __type(name: "JobCreateAttributes") { inputFields { name type { name kind ofType { name kind } } } } }`
  and the same for `Mutation` fields: `{ __type(name: "Mutation") { fields { name } } }`.

## 1. Does `jobCreate` place a visit with a day, a start time and an assigned user?

Not confirmed; assumed no. `scheduleWrite: "edit"`: create the job, then set the visit's time and users with a second mutation. Phase 6 must verify by introspecting `JobCreateAttributes` (look for a timeframe or visit schedule field and assigned user ids).

What is confirmed: `JobCreateAttributes.customFields` and `jobFormIds` exist (changelog entries 2025-04-16 and earlier), and an existing job reads back `startAt`, `endAt`, `visitSchedule` and `visitsInfo { scheduledCount unscheduledCount }` through the connector, so a job can be unscheduled.

Source: https://developer.getjobber.com/docs/changelog/

## 2. Moving and reassigning a scheduled visit

Not confirmed. Assumed mutation: `visitEdit` (recorded as `moveMutation`), taking the visit id and start, end and assigned user ids. Phase 6 must verify the exact name and input (the candidates to look for in `Mutation` are `visitEdit`, `visitReschedule` and a separate assigned-users mutation).

Confirmed: a visit reads back `id`, `title`, `startAt`, `endAt`, `duration`, `allDay`, `status`, `isComplete`, `completedAt`, `completedBy`, `instructions`, `clientConfirmed`, `arrivalWindow`, `assignedUsers { id name }` and `job { id jobberWebUri }`.

## 3. Webhook topics

Confirmed in the Developer Center's "Select a topic" list (the list scrolls; the part read off the screen was: APP_CONNECT, APP_DISCONNECT, CLIENT_CREATE, CLIENT_DESTROY, CLIENT_UPDATE, EXPENSE_*, INVOICE_CREATE, INVOICE_DESTROY, INVOICE_UPDATE, JOB_CREATE, JOB_DESTROY, MARKETING_ITEM_UPDATE, ON_MY_WAY_TRACKING_LINK_REQUEST, PAYMENT_CREATE, PAYMENT_DESTROY, PAYMENT_UPDATE, PAYOUT_*, PRODUCT_OR_SERVICE_*, PROPERTY_*, QUOTE_APPROVED, QUOTE_CREATE, QUOTE_DESTROY, QUOTE_SENT, QUOTE_UPDATE, REQUEST_*, TIMESHEET_*, USER_CREATE, USER_UPDATE, VISIT_CREATE). The rest of the J and V entries (JOB_CLOSED, JOB_UPDATE, VISIT_COMPLETE, VISIT_DESTROY, VISIT_UPDATE) are as Hannah read them off the same list earlier on 2026-11-12; the picker's scroll could not be driven from here.

The eight topics the app uses: `VISIT_COMPLETE`, `VISIT_UPDATE`, `JOB_UPDATE`, `CLIENT_UPDATE`, `INVOICE_CREATE`, `INVOICE_UPDATE`, `QUOTE_CREATE`, `QUOTE_UPDATE`. A `PAYMENT_CREATE` topic also exists (see 4).

Payload (thin, ids only): `{ "data": { "webHookEvent": { "topic", "appId", "accountId", "itemId", "occurredAt" } } }`; fetch the object by `itemId`. Delivery is at least once, and one action can fire the same topic twice about a second apart (adding a payment fires `INVOICE_UPDATE` twice), so handlers dedupe on `itemId` plus topic. Answer within 1 second. Signature: base64 HMAC-SHA256 of the raw body keyed with the OAuth client secret, in `X-Jobber-Hmac-SHA256`. A topic needs the read scope for its object.

Source: https://developer.getjobber.com/docs/using_jobbers_api/setting_up_webhooks/

## 4. Recording a payment on an invoice

Not confirmed; assumed nothing (`invoicePayment: "manual"`). The app charges through Stripe and the payment is recorded by hand in Jobber. Jobber does emit `PAYMENT_CREATE`, `PAYMENT_UPDATE` and `INVOICE_UPDATE` when a person records one. Phase 6 must search the `Mutation` field list for a payment record mutation; if one exists, flip to `"api"`.

## 5. Custom fields on jobs

Confirmed: apps can create their own field configurations (scope "Custom Field Configurations", read and write). Mutations: `customFieldConfigurationCreateText`, `...Numeric`, `...TrueFalse`, `...Dropdown`, `...Area`, `...Link` (the docs show `customFieldConfigurationCreateLink(input: { appliesTo: ALL_JOBS, name, transferable, readOnly, defaultValue })` returning `customFieldConfiguration { id name }` and `userErrors { message }`). `appliesTo` takes values such as `ALL_JOBS` and `ALL_CLIENTS`. Query existing ones first: `customFieldConfigurations(first: 50) { nodes { ... on CustomFieldConfigurationText { id name valueType appliesTo readOnly } ... } }` (the docs warn that creating a duplicate errors, and that a reconnect unarchives fields). Limits: at most 5 configurations per object per app; an app cannot delete them, only rename; they are visible to Jobber users with the app's name and logo; `readOnly: true` stops users editing them.

Setting a value: documented for clients as `customFields: [{ customFieldConfigurationId, valueNumeric | valueArea | ... }]` on `clientCreate` and `clientEdit` input. `JobCreateAttributes.customFields` exists per the changelog; the exact value field names for text on jobs are not confirmed (expect `valueText`). Phase 6 verifies.

Source: https://developer.getjobber.com/docs/using_jobbers_api/custom_fields/

## 6. Client notifications per job

Not confirmed; assumed no per-job flag (`notificationsPerJob: false`). The changelog shows enum values `VISIT_RESCHEDULING_NOTIFICATION` (2026-04-16) on `WorkObjectSendMessageType` and `EmailTypes`, which suggests Jobber has its own visit messages that an account setting controls. Phase 6 must look for a flag on `JobCreateAttributes` and the visit mutation, and Phase 12 must check the account's automated message settings so customers do not get Jobber's emails on top of the app's.

Source: https://developer.getjobber.com/docs/changelog/

## 7. Cancelling or archiving a job by mutation

Not confirmed; assumed none (`jobCancelByApi: false`). Cancellation reaches Jobber as a task for Hannah or through whatever Phase 6 finds in the `Mutation` list (candidates: `jobClose`, `jobArchive`, `jobDelete`, `visitDelete`). Webhooks `JOB_CLOSED` (per Hannah's read of the picker) and `JOB_DESTROY` report the other direction.

## 8. Visit order from Route Optimization

Not confirmed on the schema; the account data shows no such field. A visit read through the connector has no route, order or stop index field, and the job reads back no routing field either. Assumed `stopOrder: "app"`: the app orders each truck-day itself (Decision 8). Phase 6 should still search the `Visit` type for a `routeOrder`-like field.

## 9. Calendar blocks

Confirmed from the live account: a personal block does not need a special type. Hannah and Ryan make blocks as ordinary jobs on a dummy client, and they come back in `search_visits` like any visit: visits titled "Scott Unavailable" (job 620, client "Scott Unavailable", 8-hour visits, assigned to Scott Przygocki) and the recurring "Pick up Mason" (job 601, client "Pick up Mason", weekly Fridays, assigned to Ryan Garner). So `calendarBlockMarker: "dummyClient"`: capacity subtracts a visit whose job's client is on a short list of dummy client names kept per organization. A visit with no client was not seen. Not confirmed: whether Jobber's native calendar events (not jobs) are exposed on the API at all; the connector returned none.

## 10. Cost fields, rate limit, webhook subscription, `jobberWebUri`

- Cost extension fields (under `extensions.cost` on every response): `requestedQueryCost`, `actualQueryCost`, `throttleStatus { maximumAvailable, currentlyAvailable, restoreRate }`.
- Rate limit: leaky bucket per app and account, `maximumAvailable` 10000 points, `restoreRate` 500 points per second; a query whose requested cost exceeds what is available returns `errors[0].extensions.code = "THROTTLED"`. Also a request ceiling of 2500 requests per 5 minutes per app and account (HTTP 429). Every field costs 1; connections cost `first` (or 100 when omitted) times the fields requested, so always pass `first`.
- Webhooks are subscribed in the Developer Center per app (topic plus URL), not by mutation.
- `jobberWebUri` shape, on `job` and on `visit.job`: `https://secure.getjobber.com/work_orders/<numeric job id>`, for example `https://secure.getjobber.com/work_orders/163021453`. The numeric part is not the encoded GraphQL id. No visit-level URI was returned.

Sources: https://developer.getjobber.com/docs/using_jobbers_api/api_rate_limits/ , https://developer.getjobber.com/docs/using_jobbers_api/api_versioning/ , https://developer.getjobber.com/docs/using_jobbers_api/api_queries_and_mutations/

## Account facts (read from the live account, 2026-11-12)

### The two trucks (assigned users on recent visits)

| Truck | User | Jobber user id |
|---|---|---|
| 1 | Ryan Garner | `Z2lkOi8vSm9iYmVyL1VzZXIvMzgzOTIxNQ==` |
| 2 | Scott Przygocki | `Z2lkOi8vSm9iYmVyL1VzZXIvNDM0MjAzMg==` |

### Product and service ids (answer to question 10's table)

The connector lists 37 items, 26 of them services. The plan says "eleven bookable services" without naming them, so this table lists every active service a pass or a booking could use; Phase 6 keeps the eleven it needs.

| Service | Price | Minutes | Id |
|---|---|---|---|
| Sprinkler Turn-on & System Check (1-8 zones) | $145 | 60 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDU2ODgxNjQ=` |
| Sprinkler Turn-on & System Check (9-12 Zones) | $145 | 90 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDU3MTY0NzQ=` |
| Sprinkler Turn-on & System Check (13 or more zones) | $235 | 120 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDU3MTY1MTc=` |
| Sprinkler Turn-on & System Check Additional Zones | $10 | 45 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDU2ODgxNjI=` |
| System Inspection & Tune-up | $135 | 60 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDU2ODgxNjM=` |
| System Inspection & Tune-up additional Zones | $10 | 15 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDU2ODgxNTg=` |
| Sprinkler Winterization (1-6 zones) | $95 | 30 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDU2ODgxNjU=` |
| Sprinkler Winterization (7-9 zones) | $105 | 45 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNTI4MzEyNzQ=` |
| Sprinkler Winterization (10-12 zones) | $135 | 60 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNTI4MzI4NzQ=` |
| Sprinkler Winterization (13+ Zones) | $165 | 90 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNTI4MzM0NzY=` |
| Sprinkler Repair Assessment | $145 | 60 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDU2ODc1ODU=` |
| Sprinkler repair labor | $130/hr | none | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDYyMjI3NjE=` |
| Lawn Aeration | $125 | 45 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNTI5NTI1MzU=` |
| Rachio 3 Smart clock install | $350 | 90 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDY4MjQwOTU=` |
| Water efficiency, new install, or sprinkler addition assessments | $75 | 30 | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDk1Njc0NDQ=` |
| Sprinkler Design and Installation | $0 | none | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDU2ODgxNTc=` |
| Complete Plan | $320 | none | `Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvNDgxMDY2MzU=` |

Differences from the public pricing worth a look before Phase 6: Jobber's turn-on 1-8 description says "+$18 per additional zone" while the additional-zones items are $10; the Tune-up item is priced $135 with a description saying $145; the 9-12 winterization item starts at $135 for 10 zones.
