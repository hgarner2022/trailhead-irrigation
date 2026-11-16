# The data model: locked design, 16 Nov 2026

Approved by Hannah on 16 Nov 2026 after a section-by-section review
("Much, much better"). This is the foundation every screen, message,
API call and report is built on. `DATA_MODEL.md` keeps the per-field
contract (where each field lives, who writes it, every surface that
shows it); this document is the shape and the rules.

Method: the field-service chain every tool shares (Jobber, Housecall Pro,
Salesforce Field Service, FieldCamp: customer, service location, job,
visit, invoice, payment, with a price book and people assigned to
visits), checked against Jobber's own objects through its API, then cut
to what Trailhead names in a sentence. Jobber's Request object and its
clock-driven job statuses ("late", "requires invoicing") are left out on
purpose.

## The sentence

A **customer** has **properties**. We sell them a **job** at one
property, made of **line items** priced from our **services**. The job
is done in **visits**, each by a **person** on a day. Money arrives as
**payments**. When someone needs paper, an **invoice** is written from
the job and settled by payments. Everything that happens is an **event**
with a name on it, and **messages** go out and come in along the way.

## The records

| Record | What it holds | Belongs to |
|---|---|---|
| Customer | name, email, phone, lead source, Stripe customer id, the card on file (brand, last 4, expiry, Stripe payment method), tags, notes | organization |
| Property | address, town, zip, point, zones, controller, backflow location, gate code, must be home, access note, on-site contact name and phone, notes | customer |
| Service | name, what is included (plain text), price, included zones, price per extra zone, minutes, bookable, quote only, taxable, active | organization (the catalogue Hannah edits) |
| Job | property, customer, sold on, source (website, office, site, renewal), season and pass number when it is a Season Pass, renews job id, notes, cancelled at | customer, property |
| Line item | job, service, name, description, quantity, unit price, taxable, the visit it is billed on (optional) | job |
| Visit | job, property, person, scheduled on, window (morning, afternoon, any), start time, minutes, route order, completed on, not-done reason, cancelled at, notes | job |
| Person | name, phone, email, role (owner, admin, tech), truck, working days, capacity by kind, season start and end, sign-in | organization |
| Payment | job, visit (optional), amount (negative for a refund, linked to the payment it reverses), method (card on file, card now, check, Venmo, cash), reference, paid on, status (succeeded, failed), Stripe ids, receipt url | job |
| Invoice | job, lines (a frozen copy of the line items at sending), amount, tax, sent on, due on, paid on, pay link | job |
| Consent | customer, terms version, accepted at, marketing opt-in and channels, source | customer |
| Message | customer, job or visit, direction, channel, kind, body, data, status, provider id | customer |
| Event | about (customer, property, job, visit, payment, invoice), its id, kind, detail, who, when | the record it is about |
| Organization | settings: season windows, lead weeks, route days per town, message templates, integrations | |

Nothing is ever deleted. A job, a visit or a line item is cancelled; a
person is inactive; a service is inactive.

## Relationships

Customer 1–n Property. Customer 1–n Job. Property 1–n Job. Job 1–n
Line item. Service 1–n Line item. Job 1–n Visit. Person 1–n Visit. Job
1–n Payment; a payment may name one Visit. Job 0–n Invoice; Invoice 0–n
Payment. Customer 1–n Consent, 1–n Message. Every record 0–n Event.

## Lifecycles: read from facts, never typed

No record stores a status word except Payment and Invoice, whose state
Stripe and the calendar decide.

| Record | Stored facts | Words on screen |
|---|---|---|
| Visit | scheduled_on, completed_on, cancelled_at, not_done_reason | Unscheduled (no day; with a reason when it was Not done), Scheduled (a day), Done (completed_on), Cancelled |
| Job | its visits, cancelled_at | Open, Done (every visit Done or Cancelled, at least one Done), Cancelled |
| Payment | status | Succeeded, Failed; a refund is a negative row |
| Invoice | sent_on, due_on, paid_on | Sent, Paid, Overdue (today past due_on and not paid) |

Money words, derived: a job is **Paid** when its succeeded payments
equal its total (line items of visits not cancelled); otherwise **Owed**
with the number. A pass reads per visit: "2 of 3 paid, $115 owed". A
visit's money is shown only once it is Done: Paid (method), Failed,
Bill sent, or Owed.

The two controls that make sure things get done and paid: a visit whose
day has passed with no Done sits on Home until it is Done or moved; a
job that is Done and Owed sits on Home until a payment row exists.

## The Season Pass on this model

A job with `season` and `pass_number`, line items "Spring turn-on, 8
zones", "Fall blowout, 8 zones" and, when added, "July inspection", one
visit per line item, each line billed after its visit. The card is on
the customer. Adding the inspection adds a line and a visit; skipping a
visit cancels both. Renewal makes next season's job with the same lines,
`renews_job_id` pointing back. There is no separate pass table.

## Collecting payment

At Done the question is "How was it paid?": card on file (charged now),
check, Venmo, cash, or **Send a bill**. Send a bill writes the invoice
(lines frozen, due in the organization's term), sends one message with a
Stripe-hosted pay page tied to that invoice (text first, email with no
mobile), and the page may keep the card on file. Stripe's webhook makes
the payment row, marks the invoice Paid and sends the receipt. An
invoice past its date reads Overdue and sits on Home with Remind. Send a
bill is also available on any Done and Owed job later.

## Customisable without a code change

The service catalogue (name, what is included, price rule, minutes,
taxable, active) in Settings; tags on customers and jobs; the fixed
property fields above. Statuses are not customisable, on purpose.

## What goes

`season_pass` (into job and customer), `truck` (a field on person),
`area` (route days become a setting), `booking` and `quote_request`
(replaced by job), `pass_change` (replaced by event), `admin_user` (into
person). The Jobber mirror tables stay until the exit and are marked
temporary. `charge` is renamed to payment in words; the table may keep
its name.

## Open question for Ryan

Sales tax: does Trailhead collect Colorado sales tax on materials (his
Jobber catalogue marks some services taxable)? `taxable` on service and
line item and a tax line on the invoice are in the model either way;
the answer decides whether the checkout and the bill show tax.

## The order to build it

1. Person replaces truck and admin_user; visits assigned to a person.
2. Service gains description, taxable, active; line items on the job;
   the pass sale and the checkout write them; one New job sheet.
3. Property takes zones, access and the on-site contact; the card moves
   to the customer; `season_pass` folds into job.
4. Payment gains visit and refund rows; Invoice with the pay page,
   reminder and Home row.
5. Event replaces pass_change for every record; notes are events.
6. The legacy tables go; the Jobber mirror goes at the exit.

Every step updates `DATA_MODEL.md` and keeps an API alias for a season.
