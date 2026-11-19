# UX audit fixes: the customer's side (Nov 18 2026)

What was done about each row of section 1 of `docs/plans/2026-11-18-ux-audit-customer.md`. Nothing was sent: every test writes message rows only. Status is fixed, skipped (and why) or left (and why).

| # | Status | What changed |
|---|---|---|
| 1 | fixed | The day-before text says "Need to change it? Text Ryan at (970) 692-7270. See your visit: <link>"; the day-before email says the same with the phone as a `tel:` link and a Text Ryan button (`sms:`) in place of the account button. The two-weeks-out text keeps its ask and adds "Last day to change online: Mon, May 3." from `cutoffAt` (`lastChangeDay` in `src/sms/texts.ts`). |
| 2 | fixed | `src/app/(checkout)/pay/not-found.tsx` with `PayNotFound`: "This invoice link is old or wrong. Sign in to see your invoices, or text Ryan.", Sign in to `/account`, Text Ryan and Call Ryan. Stories at 375 and 1280, a test. |
| 3 | fixed | `src/app/(account)/account/not-found.tsx` with `AccountNotFound`, inside the account layout so the header stays: "We can't open that visit. Go to your visits, or text Ryan." Stories at 375 and 1280, a test. |
| 4 | fixed | The shipped `date-moved` and `date-confirm` text bodies end in a statement; the link line is the one ask. A test counts question marks (links left out) across every visit text, signed or not, and for a move that asks for the YES. |
| 5 | fixed | `Input` and `Textarea` use `text-base md:text-sm` (16px on a phone, 14px from `md`). The admin shares both and gets 16px on a phone too; none of its callers passes its own text size. Test reads the classes. |
| 6 | skipped | The card kept after paying is Hannah's decision (it is also a consent question). |
| 7 | fixed | The date-set, moved, two-weeks-out and booking emails link to the signed one-visit page as "Change this visit" with "Last day to change online: Mon, May 3."; an older row with no signed link keeps the account button. The day-before email shows Text Ryan instead. |
| 8 | fixed | A canceled or skipped row reads "Canceled Nov 18" (with the year in another year) and sorts after done and booked rows of the same day, in both Past and Home's Recent. |
| 9 | fixed | A canceled visit's page ends with "Changed your mind? Text Ryan to add it back." and a Book Online button. |
| 10 | fixed | `AccountLink`, a small client island in the header, shows "Your account" (to `/account`) to a signed-in customer and "Sign in" to everyone else. The header is a client component and reading the session on the server would make every marketing page dynamic for guests, so the island asks the new `GET /api/account/me` (returns `{ signedIn }` and nothing else, `Cache-Control: private, no-store`). A guest, a crawler and the first paint get "Sign in" from the static HTML; a signed-in visitor sees the swap after the call. An admin whose email is also a customer's counts as signed in. |
| 11 | left | Waits for the slots step (the day-plus-exact-time decision). |
| 12 | left | Waits for the slots step; the window fixtures change with it. |
| 13 | fixed | The pay page's paid state (and the page Stripe returns to) offers "View the receipt" (the card receipt once Stripe has one, else the customer's visits) and "Open your Trailhead account"; the voided state says "Text Ryan if you have a question, at (970) 692-7270." with both as links. |
| 14 | fixed | The receipt page carries the receipt number the email carries (`receiptNumber`, moved to `src/emails/format.ts`) and, for a check, a "Check number" row. |
| 15 | fixed | The account header (logo, places, signed-out Sign in), the account menu, Receipt links, See all visits, the visit page's back link, "text us", "Use a different email" and the Details checkbox row are all 44px. A test reads their classes. |
| 16 | fixed | The marketing footer's links (and its phone, email, Privacy and Terms links) are 44px below `md`, compact from `md`. Markup unchanged. |
| 17 | fixed | The sent page echoes the masked address (`a***@example.com`), says it comes from Trailhead and to check spam, and offers "Send it again" (a server action that asks for a fresh link). A signed-in visitor on `/account/sign-in` goes to `/account` (or the `/account` page `next` names). |
| 18 | fixed | Details' buttons are "Save your details" and "Save yard notes"; one example line sits under Controller and under Backflow location; the checkbox reads "Tell Ryan someone needs to be home". |
| 19 | skipped | Checkout polish was not in this brief. |
| 20 | fixed | The day-before email leads "Ryan is coming tomorrow, Wednesday, May 5, for your spring turn-on." (We're coming tomorrow when no one has the visit); "A reminder that" is gone. |
| 21 | skipped | Optional (an arrival estimate the app does not have). |
| 22 | skipped | None needed now. |
| 23 | skipped | Leave it, per the audit. |

## Notes

- The Settings › Messages preview and the admin snapshot fixture (`src/lib/admin/fixtures/snapshot.json`) still hold the old shipped bodies; the admin is another build's. A saved row an office already has keeps working, and an office template ending in "Another day?" still loses it when the move asks for the YES.
- `docs/DATA_MODEL.md` did not change: no field was added or changed.
