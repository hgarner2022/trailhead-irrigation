# The check, redesigned (Nov 26 2026)

Hannah, of the chosen service card: "I just hate the check, it looks tacky." She also said "the animation and icons are good", so the service icons (`ServiceIcon.tsx`) and the card's opening are untouched.

## What was wrong

The chosen card carried an orange filled disc with a thick white tick that popped in and threw off a ring. Under it, the included list used green ticks. The same pairing (a candy-coloured mark that congratulates) appeared on the Season Pass offer once added, the "On file" chip, the picked address, the saved card, the paid and approved lines, the visit report, the pass card's done visits and the season line's done dots. Three colours (orange, green, bright amber) were saying two simple things.

## What others do

Read from memory of each system's published guidance and product; the pages were not fetched again today.

| Source | "You chose this" | "Included, done" |
|---|---|---|
| Apple HIG (Lists and tables; Toggles) | A single choice in a list is the row plus one plain checkmark in the tint colour, no disc behind it; radio buttons are a ring with a dot | Plain glyph, one weight, one colour |
| Material 3 (Radio button; Cards) | A ring that gains a dot; a selected card changes its container colour | Icons take the on-surface ink |
| Stripe (Payment Element, accordion with radios) | A ring and dot at the row's edge, and the row's border darkens | Pricing lists use small one-colour ticks in the text ink |
| Linear (pricing, settings) | Border and fill change; no badge | Thin monochrome ticks in muted ink |
| Cal.com (booking) | The chosen day or time is filled with the brand ink; nothing is added on top | Thin ticks in grey in plan lists |
| Airbnb (checkout choices) | A ring and a dot in near black on a bordered row | Plain ink glyphs |
| NN/g, "Checkboxes vs. Radio Buttons" | One choice from a list reads as a radio (ring and dot); a tick reads as "one of several" | |
| WCAG 2.2, 1.4.1 and 1.4.11 | State must not rest on colour alone; a meaningful mark needs 3:1 | |

Links: developer.apple.com/design/human-interface-guidelines (lists-and-tables, toggles), m3.material.io/components/radio-button, docs.stripe.com/payments/payment-element, linear.app/pricing, cal.com, nngroup.com/articles/checkboxes-vs-radio-buttons, w3.org/TR/WCAG22.

What they agree on: selection is shown by the surface (fill, border) and, where a control is drawn, by the control's own state (a ring gains its dot). Nobody adds a coloured badge to say well done. Ticks in lists are small, thin and the colour of the text.

## The decision

Two meanings, two marks, one ink.

1. **You chose this is never a tick.** A chosen option is already filled navy with white words everywhere on the customer's screens (`option-styles.ts`). The service card keeps its ring, because the ring is what says "this is a choice" before anything is chosen. Chosen, that same ring turns white with the header and its dot lands. No orange, no tick, no pulse. `aria-pressed` carries the state for a screen reader, and the fill, the dot and the open card each show it without colour.
2. **Included, done and saved are one tick: `Tick`.** A 1.5px line, quiet navy (`text-navy/60`, 3.7:1 on white) in a list, or the colour of the words it sits beside. Never in a disc, never green or orange. Where it answers a press (Season Pass added, On file) it strokes in once; under reduced motion it is simply there.

Considered and set aside: a thin white tick inside the ring (still a check on the thing she dislikes, and a tick in a single-choice list reads as a checkbox); the card with no mark at all once chosen (the ring vanishing reads as a layout jump, and unchosen cards would lose their match); keeping green for the list (a second accent beside the orange icons, and green already means Paid and Done in words).

## Where it changed

| Place | Before | After |
|---|---|---|
| Service card, chosen | Orange disc, white tick, ring pulse | White ring, white dot |
| Service card, included list | Green ticks | `Tick`, quiet navy |
| Season Pass offer, the three lines | Green ticks | `Tick` |
| Season Pass offer, added | Orange disc with a tick | `Tick` drawn once in the heading's navy |
| On file chip | Green tick | `Tick` drawn once |
| Address picked | Green tick, 24px | `Tick`, 20px |
| Card on file, card saved | Green tick | `Tick` |
| Quote approved, invoice paid lines | Bright green tick beside dark green words | `Tick` in the words' own ink |
| Visit page receipts | Green tick | `Tick` |
| What we did (visit report) | Green circled tick | `Tick` |
| Pass card, a done visit | Thick amber tick | `Tick`, white at 80% |
| Season line, a done visit | Green dot with a white tick | Solid navy dot |
| "Your card is saved", "Thank you" empty states | Circled tick in the stone circle | Plain tick in the stone circle |

Not changed, on purpose: the admin's icons (`StopRow`, `WeekGrid`, `RequestRows`), and `BillingBody`'s status headline, which is one of a family of four status icons the admin also uses. The green of the words Paid and Done is a status colour, not a mark, and stays.

## Pictures

`before/` and `after/` hold the same stories at 375 and 1280: the Service step collapsed, a service chosen, the Season Pass chosen (the block and inside the form), the Details step with the offer, the offer added, the address picked, the account's Season Pass page (active, phone, all done) and the visit report.
