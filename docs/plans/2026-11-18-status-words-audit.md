# Status words: ours beside Jobber, Housecall Pro, ServiceTitan and QuickBooks

Nov 18 2026. An audit, not code. Hannah: "You're not using common patterns and statuses." States stay read from facts; only the words change. Each row cites a source key; URLs are at the bottom. Vendor words are quoted as they print them. Checked live: Jobber, ServiceTitan, QuickBooks, Stripe, Housecall Pro (HCP) invoices and plans. Not confirmed on a fetched page: HCP job and appointment statuses (`H3`, `H4`), HCP estimates (`H5`).

## 1. Visit status

| Ours today | Jobber | HCP | ServiceTitan | Recommended | Why |
|---|---|---|---|---|---|
| Unscheduled | Unscheduled (`J1`) | Unscheduled (`H1`) | none (appointment is Scheduled or Hold) | **Unscheduled** | Jobber and HCP print it |
| Scheduled | Upcoming, Today (`J1`) | Scheduled (`H3`) | Scheduled (`S1`) | **Scheduled** | Day on the visit; Today and Upcoming are filters, not states |
| (Home) Past its window | Late: end time passed, not complete (`J2`) | none | none | **Past its window** | Same fact as Jobber's Late; Hannah's own words win (Nov 17) |
| Done | Completed (`J2`) | Completed (`H3`) | Done, job Completed (`S1`) | **Done** | ServiceTitan's appointment word; plain |
| Not done · reason | none. "Incomplete" is a filter, never a status (`J3`) | none | Hold, Unused (not equivalent) (`S1`) | **Drop the state; Unscheduled with the reason as a note** (question 2) | No vendor has it; a visit back with no day is Unscheduled by the facts |
| Cancelled | Archived (job) | Canceled (`H1`) | Canceled (`S1`) | **Canceled** | US spelling, as HCP and ServiceTitan |

## 2. Job and quote status

| Ours today | Jobber | HCP | ServiceTitan | Recommended | Why |
|---|---|---|---|---|---|
| Needs a quote | Draft quote (`J4`) | none | Open estimate (`S2`) | **Needs a quote** | Names the next move; no vendor word fits a job with no price |
| Quoted | Awaiting response, Changes Requested (`J4`) | Sent (`H5`) | Open (`S2`) | **Quote sent** | Jobber and HCP say a sent quote waits; "Quoted" is not used by anyone |
| (accepted) | Approved, then Converted (`J4`) | Customer Approved (`H5`) | Sold (`S2`) | **Open** with an "accepted" event | Acceptance is a fact (`quote_accepted_on`); the job just becomes Open, as Jobber's quote becomes a job |
| (not accepted) | Archived (`J4`) | Customer Declined (`H5`) | Dismissed (`S2`) | **Canceled** | One end state, reason in the history |
| Open | Active, Upcoming, Today, Late, Action Required (`J1`) | Scheduled, In progress (`H3`) | Scheduled, In progress, Hold (`S1`) | **Open** | Our rollup of visits; Jobber's Active is the same idea, and Active is kept for passes |
| Done | Archived, Requires Invoicing (`J1`) | Completed (`H3`) | Completed (`S1`) | **Done** | Matches the visit word |
| Cancelled | none | Canceled (`H1`) | Canceled (`S1`) | **Canceled** | As above |

## 3. Payment and invoice status

| Moment | Ours today | Jobber | HCP | QuickBooks | Stripe | Recommended | Why |
|---|---|---|---|---|---|---|---|
| Owed, nothing sent | Owed | Requires Invoicing (job) (`J1`) | Unsent, Open (`H6`) | Not sent | none | **Unpaid** ("$115 unpaid") | HCP dashboard filter is "unpaid" (`H8`); Hannah's word |
| Sent, not due | Sent | Awaiting Payment (`J5`) | Due (`H6`) | Open (`Q1`) | none | **Invoice sent** | Plain, says what happened; "Awaiting payment" is the Jobber state, not a word we need twice |
| After due date | Overdue | Past Due (`J5`) | Past Due (`H6`) | Overdue (`Q1`) | none | **Past due** (question 3) | Two field-service vendors print it; QuickBooks is the accountant's word |
| Paid in full | Paid | Paid (`J5`) | Paid (`H7`) | Paid (`Q1`) | succeeded (`T1`) | **Paid** ("Paid, Venmo") | All five |
| Part paid | "2 of 3 paid, $115 owed" | no label, balance (`J5`) | stays Open (`H7`) | open with balance (`Q1`) | none | **Show the balance: "$115 unpaid"** | No vendor has a "partially paid" status; every one shows the balance |
| Payment fails | Failed | none | "payment failed" (`H9`) | none | failed event, no "declined" status (`T1`) | **Failed** in the office; "didn't go through" to the customer | Stripe's own dashboard word; keeps `UX_WRITING.md` for customers |
| Cancelled bill | (cancelled) | Voided (`J5`) | Canceled, Voided (`H7`) | Voided | canceled | **Voided** | Three of three; the action can stay "Cancel" |
| Written off | none | Bad Debt (`J5`) | none | none | none | **Not needed yet** | One vendor; add when Ryan writes one off |

Bill or Invoice: all four vendors say Invoice, on the record and to the customer (question 1). Unpaid beats Owed and Awaiting payment: Owed appears nowhere in the vendors. Deposited is QuickBooks bookkeeping; Stripe payouts replace it.

## 4. Money word on a job and on a visit

Consistent with section 3. A visit shows money only once it is Done.

| Fact | Word | Example |
|---|---|---|
| paid in full | Paid, how | Paid, Venmo · Paid, card |
| done, balance, no invoice | unpaid with the amount | $115 unpaid |
| invoice open before due | Invoice sent, due date | $145 · Invoice sent, due Dec 1 |
| invoice open after due | Past due since date | $145 · Past due since Dec 1 |
| newest payment failed | Failed | Failed |
| job part paid | count and balance | 2 of 3 paid, $115 unpaid |

## 5. Home and attention rows

| Ours today | Jobber | HCP | Recommended |
|---|---|---|---|
| Past its window (group) | Late (appointment) (`J2`) | none | **Past its window** |
| Done, owed | Require invoicing jobs (`J2`) | Unsent (`H6`) | **Done, unpaid** |
| Bill overdue | Past due invoices (`J2`) | Overdue Invoices report (`H8`) | **Invoice past due** (with Remind) |
| Card failed | none | card payment failed (`H9`) | **Card failed** |
| Charge not pressed | none | none | **Card not charged** (plain; the old phrase is ours alone) |
| Needs action, no day | Action required jobs: open job, no upcoming visit (`J2`) | none | **Needs a day** |

## 6. Pass status

| Ours today | Jobber (recurring job) | HCP (service plan) | ServiceTitan (membership) | Recommended | Fact |
|---|---|---|---|---|---|
| Pending | none | Draft, Sent (`H10`) | none | **Pending** | job pending until the card is saved |
| Active | Active (`J1`) | Active (`H10`) | Active (`S3`) | **Active** | all three |
| Cancelled | Archived | Canceled (`H10`) | Canceled (`S3`) | **Canceled** | HCP, ServiceTitan |
| Lapsed | Ending Within 30 Days, Archived | Expired, Expiring soon, Pending renewal (`H10`) | Expired (`S3`) | **Expired** | HCP and ServiceTitan; "Lapsed" is used by none |

## 7. The recommended vocabulary

| Record | Words in order | Read from |
|---|---|---|
| Visit | Unscheduled, Scheduled, Done, Canceled | `scheduled_on`, `completed_on`, `cancelled_at`; "not done" reason as a note |
| Job | Needs a quote, Quote sent, Open, Done, Canceled | priced lines, `quote_sent_on`, visits, `cancelled_at` |
| Payment | Paid, Failed (refund is a negative row) | payment `status` |
| Invoice | Sent, Past due, Paid, Voided | `sent_on`, `due_on`, `paid_on`, cancel |
| Money | Paid, $N unpaid, Invoice sent, Past due, Failed | payment rows against lines |
| Pass | Pending, Active, Expired, Canceled | job, season year, `cancelled_at` |

Changes from today:

| Change | Reason | Vendor |
|---|---|---|
| Owed to **Unpaid** | Plain, Hannah's word; Owed is in none | HCP unpaid filter |
| Overdue to **Past due**, Bill to **Invoice** if she agrees | The status the field vendors print | Jobber, HCP |
| Quoted to **Quote sent** | Says what happened | Jobber, HCP |
| Lapsed to **Expired**, Cancelled to **Canceled** | Common words, US spelling | HCP, ServiceTitan |

## 8. Open questions for Hannah

1. Invoice or bill, on screens and in the customer text?
2. Not done: keep or drop (a visit that came back reads Unscheduled with the reason)?
3. Past due or overdue?

## Sources

- `J1` https://help.getjobber.com/en/articles/jobs-list-page-and-key-metrics/
- `J2` https://help.getjobber.com/en/articles/home-in-the-jobber-app/
- `J3` https://help.getjobber.com/en/articles/job-basics/
- `J4` https://help.getjobber.com/en/articles/quote-list-page-and-key-metrics/
- `J5` https://help.getjobber.com/en/articles/invoices-list-page-and-key-metrics/
- `H1` https://help.housecallpro.com/en/articles/2865052-unschedule-vs-cancel-vs-delete
- `H3` https://docs.composio.dev/toolkits/housecall_pro.md (third party: scheduled, in progress, completed)
- `H4` https://help.housecallpro.com/en/articles/6930497-appointments-overview (appointments carry no status; search result only)
- `H5` https://help.housecallpro.com/en/articles/918072-track-approved-estimates (search result only)
- `H6` https://help.housecallpro.com/en/articles/9011828-open-invoices
- `H7` https://help.housecallpro.com/en/articles/8959660-invoice-list-view
- `H8` https://help.housecallpro.com/en/articles/362338-dashboard-filter-by-unpaid-invoice and https://help.housecallpro.com/company-dashboard/overdue-invoices-dashboard-report (search result only)
- `H9` https://help.housecallpro.com/en/articles/5485025 (card payment failed; search result only)
- `H10` https://help.housecallpro.com/en/articles/2932107-service-plans-dashboard-overview (search result only)
- `S1` https://help.servicetitan.com/residential-s-r/docs/statuses-and-actions-on-jobs-and-appointments
- `S2` https://help.servicetitan.com/v1/docs/estimates-report-template
- `S3` https://help.servicetitan.com/docs/membership-faq
- `Q1` https://quickbooks.intuit.com/learn-support/en-us/help-article/mobile-apps/track-status-invoices-quickbooks-online-mobile-app/L94Lx4kcz_US_en_US
- `T1` https://docs.stripe.com/payments/payment-intents/verifying-status
