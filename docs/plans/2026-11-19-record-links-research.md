# Linking records: research and rules (Nov 19 2026)

Hannah, on the job page's Customer card: "Whenever we're linking to different data objects, we need to have a great pattern for linking to one another." Research short, prototype in Storybook only (PR "One pattern for linking records: RecordChip with a preview").

## 1. Evidence and its limits

| Tag | Meaning |
|---|---|
| V | Read this session at the source |
| K | Recalled from using the product, not verified; treat as likely, never as a quote |

Most of these apps are signed-in and not public, so much of this is K. Someone should screenshot Attio, Linear and Mailchimp before we lean on the K rows.

| App | What an inline link to another record looks like | Hover | Click | Back |
|---|---|---|---|---|
| Attio | K: the record's name with the object's icon or avatar. V: its changelog says a comment button was added "to the record hover card" ([changelog](https://attio.com/changelog)), so a hover card exists and carries actions. Hannah's article: the same object rendered in a hover preview, a Cmd+K summary and a full page from one set of data. | A card with the key properties and quick actions | K: opens the record page (a side peek from a list) | K: browser Back |
| HubSpot | V: on a record page, hover an associated record and its menu has Preview ([HubSpot](https://knowledge.hubspot.com/records/preview-a-record)). | V: the associated card shows a three-dot menu; Preview is a menu item, not the hover itself | V: Preview opens a right-hand panel with properties, activities and associations, and a "View record" action to the full page | V: close the panel with the X; the page under it never moved |
| Notion | V: release 2.34 added hover to preview page content ([release](https://Notion.com/releases/2023-11-07)); K: a mention is the page icon and title | V: a preview of the page | K: opens the page, or a side peek by setting | K: browser Back, and the peek's own close |
| Linear | K: an issue mention is a chip with the status icon, identifier and title | K: a card with status, assignee and title | K: opens the issue | K: browser Back and `Esc` |
| Mailchimp | K: a "Back to Campaigns" link above the title; related records as plain links in a details card | K: none | K: full page | K: the link above the title, plus the browser |

Our own navigation audit (`2026-11-19-navigation-audit.md`, sections 5 and 6) already settled the back route: a panel opened from a record shows "‹ Andrea Reyes" above its title, Close returns to the page.

Accessibility, read:
- [WCAG 1.4.13 Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus) (V): anything that appears on hover must also appear on keyboard focus, be dismissible without moving the pointer (`Esc`), be hoverable (the pointer can move onto it) and stay until dismissed.
- [NN/g, Guidelines for Visualizing Links](https://www.nngroup.com/articles/guidelines-for-visualizing-links/) (V): colour plus underline gives the strongest sense of a link; the 2026 editor's note says colour, placement and context are usually enough, hover and focus states are now expected, and underlines stay for low-vision readers. WCAG 1.4.1: colour cannot be the only cue.
- Hover does not exist on a phone, so a preview can never be the only way to reach a fact; the page the link opens must hold everything the preview shows. Long-press may show the card, a tap always opens the record. Acquia's reading of 1.4.13 prefers click or Enter over hover where the content matters ([Acquia](https://docs.acquia.com/acquia-optimize/content-hover-or-focus)).

Association cards (the "related" aside): V for HubSpot (associations are cards on the record page, each previewable); K for Mailchimp and Attio. All agree the related record is a row with an identity (avatar or icon, name), one or two facts, and the name is the link. Our job page already has this shape (Customer card, Property, Billing); it lacks one consistent link.

## 2. The rules for Trailhead

1. **A record's name is always a `RecordChip`.** Customer, property, job, visit, invoice, payment and person, wherever the name appears: asides, summary bands, visit and invoice rows, Notes and history, Cmd+K hits, Home rows. Never a plain name that goes nowhere. If a record has no page the chip is shown quiet (`no link`: same avatar or icon, navy text, no underline), so a missing link is visible, not accidental.
2. **The chip is the icon or initials avatar plus the name in orange (`primary-dark`, AA on white), with a thin underline that goes solid on hover and focus.** Icon for objects (briefcase job, calendar visit, receipt invoice, card payment, pin property), initials in a tinted circle for people (customer, person). Colour is never the only cue.
3. **The kind is readable to a screen reader**: the link's text is "Customer: Andrea Reyes" (the kind as visually hidden text before the name).
4. **Hover, focus or long-press shows a preview card** (`RecordPreview`): the kind, the name, one status pill, at most four facts, and **Open**. Hover waits 400 ms, the card can be hovered, `Esc` dismisses it, and keyboard focus on the chip shows it too (1.4.13). On a phone a 500 ms press shows it; a tap opens the record. Nothing in the card is missing from the record's page.
5. **Click opens the record in place** (the one panel through `RecordHost`, with "‹ Andrea Reyes" above its title); a new tab or a modified click keeps the plain link; with no host it is a plain link to the record's own page. **Open** in the card does the same as the chip.
6. **One data object, three renderings from one set of data** (Attio's rule): the chip, the preview card and the page read the same `RecordPreviewData` builders (`record-preview-model.ts`), so a fact cannot differ between them. Cmd+K hits use the same chip and data.
7. **Sizes**: `band` (summary band value, display face) and `row` (a row, an aside card, a fact value; 44px tall to tap). A chip never sits inside an element that is itself the click target; there the row is the link and carries the avatar.
8. **A scheduled day is a link, not a word** (Hannah). In the job page's When tile "Tue, Nov 24 at 9:00 am" is a `RecordChip` of kind `day`: it opens the Schedule's Day view on that day (`/admin/schedule?day=2026-11-24`, with "‹ Andrea Dalton" as the way back), and its card shows the day's stop count and the person ("3 stops", "Ryan Garner", Open Schedule). A visit with no day reads "No day yet" as plain text: there is no day record to link, and the Schedule button is that state's action. "Any time" is only a stand-in until the slots step gives every visit a time; the default timed state in the prototype reads the exact time ("at 9:00 am"), and a window ("Between 8 and 10 am") or a done time ("Done at 9:40 am") stays the muted line under the chip.
9. A phone number and an address stay `tel:` and text lines under the chip; they are not records.

## 3. What was prototyped

Stories only: `RecordChip`, `RecordPreview` and the places the rule applies (job page Customer aside, summary band Who, Season Pass visit rows, Billing invoice rows, the invoice panel's Customer and Job facts, one Home row, one Cmd+K hit). Not wired: the screens will pass `RecordHost`'s `open` as the chip's `onOpen`; a story has no host, so chips are plain links.
