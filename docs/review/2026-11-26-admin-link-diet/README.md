# Admin link diet, first half (Nov 26 2026)

Hannah: "Too many links. It needs to be cleaned up. Consistency throughout the application and clarity."
This is the first half of the fix after the three audits of Nov 25 (`docs/plans/2026-11-25-admin-audit-*.md`): the link diet, ONE `CustomerCard`, and one record-page anatomy, on the prototype pages. Titles, navigation order, breadcrumbs, search by number and the word "visit" are the next round and are not in here.

## How it was counted

`count.mjs` renders a story in a headless Chromium (Storybook on port 6013), and counts every visible link and button outside the shell (rail, account menu, tab bar, the prototype strip): "Click" is all of them, "Orange" is the ones drawn in the link colour, "Chips" is `RecordChip`s, "To customer" is how many go to a customer. It is the audit's method, and its "before" numbers match the audit's (45, 39, 36, 21). `before/` and `after/` hold the screenshot of every row below. `walk.mjs` clicks through the walkthrough and prints where each link lands.

## Before and after, 1280 wide

| Screen (story) | Click before | Click after | Orange before | Orange after | Chips before | Chips after | To customer before | after |
|---|---|---|---|---|---|---|---|---|
| Invoices list, 9 rows (`admin-invoices--list`) | 60 | 33 | **45** | **13** | 27 | 0 | 9 | 0 |
| Jobs grid, 12 rows (`admin-jobs-grid--jobs-grid`) | 51 | 26 | **36** | **12** | 24 | 0 | 12 | 0 |
| Quotes list, 7 rows (`admin-quotes--list`) | 42 | 30 | **21** | **9** | 14 | 0 | 7 | 0 |
| Requests list, 6 rows (`admin-requests--list`) | 17 | 16 | 7 | 6 | 1 | 0 | 1 | 0 |
| Customers list, 19 rows (walkthrough) | 68 | 49 | 40 | 21 | 19 | 0 | 19 | 0 (a row's name is a button) |
| **Customer page, pass holder, unpaid** | **55** | **37** | **39** | **19** | 22 | 0 | 2 | 1 (the crumb) |
| Job page, one visit, scheduled | 38 | 30 | 16 | 9 | 9 | 1 | 3 | 2 (the card, and "See all 7") |
| Job page from a quote | 15 | 13 | 9 | 8 | 1 | 2 | 1 | 1 |
| Job page, Season Pass, one done | 33 | 29 | 9 | 5 | 2 | 1 | 2 | 1 |
| Quote page, sent | 13 | 11 | 6 | 4 | 2 | 1 | 3 | 1 |
| Invoice page, sent | 15 | 13 | 7 | 4 | 4 | 2 | 3 | 1 |
| Request page, matched | 9 | 8 | 4 | 4 | 1 | 1 | 2 | 1 |
| Customer page, same, 375 wide | 44 | 41 | 17 | 15 | 3 | 0 | 2 | 1 |

The lists lose 57 to 71 percent of their orange (Invoices 71, Jobs 67, Quotes 57). The customer page loses 51 percent (39 to 19; the audit's estimate was about 14): what is left is the crumb, five job names, New quote, Update card, Open in Stripe, two invoice numbers, Remind, two View receipt, two Edit, the phone, the email and Consent history. The customer page's click count went from 55 to 37 (the audit counted 57 with two shell items).

## What the walkthrough does now (`walk.mjs`)

```
Jobs row, click on the customer text -> job:marcus-repair
Job page, Customer card -> customer:marcus
Customer page, Jobs row -> job:marcus-repair
Invoices row, click on the job text -> invoice:inv-hal
Invoice page, Job card -> job:hal-turn-on
Quotes row, click on the customer text -> quote:Q-2026-0007
Requests row -> request:rq-rosa
Customers row, click on the street text -> customer:andrea
View receipt -> receipt:card|
ring on each way to pay after a click: [false,false,false,false]
ring on each way to pay after an arrow key: [false,false,true,false]
```

## Screenshots

`after/` has each changed page at 1280 and at 375 (`*-phone-375.jpg`), `collect-after-click-1280.jpg` and `collect-after-key-1280.jpg` for the focus ring, and `walk-customer-from-job-1280.jpg`.
