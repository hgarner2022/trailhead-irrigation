# Admin page layout: what Mailchimp does, the rules behind it, and what we take

Nov 19 2026. Hannah on the job page prototype (PR #103): "all the same texture... you can't see things... everything's just blurred together. Look at Mailchimp, how they lay out the badges and the information structure." This is the research, the rules (section 4) and the three questions for her (section 5). The prototype is revised on these rules in the same PR.

## 1. Sources and what was and was not verified

Read this session: Mailchimp help ["About Contact Profile Pages"](https://mailchimp.com/help/about-contact-profile-pages/), ["About Email Reports"](https://mailchimp.com/help/about-email-campaign-reports/), the contact-tags and mobile-contacts help (via search), NN/g ["Visual hierarchy"](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) and ["Proximity"](https://www.nngroup.com/articles/gestalt-proximity/), Material 3 [cards specs](https://m3.material.io/components/cards/specs), and Refactoring UI via secondary summaries ([1](https://sglavoie-github-io.pages.dev/posts/2023/09/09/book-summary-refactoring-ui/), [2](https://dev.to/updivision/book-review-refactoring-ui-by-adam-wathan-steve-schoger-2f7m)).
Not reachable: Mailchimp's pattern library (ux.mailchimp.com returned 503 twice), Apple's HIG page (returned only a summary), Material's card guidelines (headings only). Where this doc describes a Mailchimp screen beyond the help text, it is from the app as the help articles and captions show it, and it is marked (app). No Mailchimp pixel was measured; we take the structure, not the numbers.

## 2. How Mailchimp lays out a record page

**Contact profile** (help article, verified). A header carries the name, how they joined, and a marketing-status label (Subscribed, with the opted-in date), and beside it the actions: an email icon, a **Send Message** button and a three-dot menu holding unsubscribe, export, VIP and remove (the destructive ones hide in the menu). Under the header, separate blocks: Contact information (with its own Edit), Tags (chips, a plus to add, an X to remove), Groups (with Edit Groups). Then tabs: Overview (an activity feed, filterable by type and date), Details and insights (engagement numbers), Notes (notes also appear in the feed, visible only to you), Settings. Mobile lists the same parts in one stack: marketing status, engagement, details, activity, notes, tags, actions.
(app) The page is a light grey canvas; the header and each block sit on white cards with a title bar and padding; the profile is a narrow left column of identity, details and tags beside a wide right column of activity.

**Campaign report** (help article, verified). It opens on Overview, a vertical run of fields and sections: subject, audience, send completion; the headline numbers (open rate, click rate, opened, clicked, bounced, unsubscribed, deliveries); a 24-hour performance graph; most-clicked links; top locations; subscribers with most opens. Detail is pushed into tabs (Click performance, Social, E-commerce, Inbox) and an Activity menu, never onto the overview.
(app) The top of the report is a **summary band**: a few big numbers, each with a small label under or over it, separated by hairlines, read at a glance before any list. The status ("Sent") is a small tinted badge beside the title; the primary action sits top right.

**Audience dashboard** (app). Cards on grey: a headline count with its movement, a growth chart, a list of top sources; each card has a title in a bar of its own and one link at its right.

**Badges** (app, consistent with the help text). A status is one small pill with a tinted background, a darker ink and a leading dot (Subscribed, Sent, Draft, Unsubscribed, Bounced). A record shows one status pill at its header and one per row in a list, so the eye finds the status in a fixed place. Labels such as tags are different objects: neutral grey chips, removable, shown in a wrap-row, never a status colour. Status says where a thing is; a tag says what someone filed it under.

**Empty states and activity** (app). An empty card keeps its title and says in one line what will appear and the one thing to press. The activity feed is a vertical list, newest first, each line a small icon, a plain sentence and a quiet timestamp, with a filter at the top.

**Mobile** (help, verified for the profile). The blocks stack in one column in the same order; actions become a menu. Two columns collapse; cards stay cards.

## 3. The general rules behind it

- **NN/g, hierarchy:** hierarchy comes from contrast in value, weight and size; keep to about three sizes and no more than two large things; whitespace around a group makes it a group; a **common region** (a border or background) groups explicitly, so use it for the group, not for every line. Squint test: blur the page; the headline facts, the status and the primary action must still stand out.
- **NN/g, proximity:** things close together read as one group and proximity can beat colour. Stacking columns on a phone can separate things that belong together, so the stack order must keep each fact beside its label and its action.
- **Refactoring UI:** make secondary things recede rather than the primary louder (labels small and grey, values heavier and darker); never mix one tone for everything; a constrained spacing scale (4, 8, 12, 16, 24, 32), more space between groups than inside them; shadows map to elevation (a hairline and a small shadow for a card on a canvas, large only for floating things).
- **Material 3:** a card is a container with a stated elevation; outlined or low-elevation cards for content on a plain surface; a multi-element container uses the quiet outline colour, not the strong one; 12dp radius and 16dp side padding as the spec.
- **Apple:** an inset grouped list (rows on a rounded white group over a grey page, label left, value right, hairlines between) is the standard for label-and-value information; each group has a short header.

Why the prototype blurred: one white surface, one text weight, one tone, section titles the same size as the body. By NN/g's list that is no contrast of value, no region, no weight contrast.

## 4. Our rules (requirements for every admin record page and screen)

Each rule names its source. "Card" is a white `bg-card` surface with a `border-border` hairline, `rounded-lg` and a small shadow.

1. **Frame.** The canvas is `bg-cream` (it already is, AdminShell). Every group of information is a card on it. No section sits directly on the canvas except the page header and the notice. (Mailchimp cards on grey; NN/g common region.)
2. **Header.** Crumb, then the title in Barlow Condensed with the **one status badge beside it** (a record with two statuses shows two badges, work then money, never more), one muted line under it that never repeats a badge, and the **actions at the top right** on a laptop. (Mailchimp: status label beside the name, Send Message top right, three-dot menu.)
3. **Summary band.** Directly under the header, one card of four cells, label small and grey over the value in the display face, hairlines between the cells, two by two on a phone. For a job: When, Who, Where, Total (with the money word under it). Four cells always; a number that is not a fact about the record does not go in the band. (Mailchimp report headline numbers; NN/g: no more than two large things, so the band is the one large thing after the title.)
4. **Two columns.** From `lg`: a main column (what the work is: What's included, Visits, Billing, Messages) and a narrow aside of 320px (who and where: Customer, Property, Notes and history). On a phone: one column in this order: band, main, aside. (Mailchimp profile: identity left, activity right; here the work matters more than the person so main comes first.)
5. **Section cards.** Each card has a title bar (the `SectionHeading` in the display face, a quiet action at its right such as Edit or Add a note), a hairline under it, then the body at 20px side padding. A list inside a card runs edge to edge with hairlines. Nothing in a card repeats the card's title. (Mailchimp, Material, Apple group headers.)
6. **Label and value.** Labels 14px, `text-muted-foreground`, 112px column; values medium weight, full ink. In the aside and in the invoice panel the rows are divided by hairlines. Combine label and value only when the label is the value's unit ("$145 unpaid"). (Refactoring UI; Apple inset list.)
7. **Badges.** A status badge is a pill with a 10% tint, a dot in the ink colour, and 12px text in the dark ink, using the tones the recipe already fixes (good green, booked orange, past due and failed red, quiet grey). `size="lg"` (14px) only in a page header. One badge per status, one or two per row, never in a grid cell's second line. A tag or label is a neutral grey chip with no dot and never a status colour. (Mailchimp tint, dot, one place.)
8. **Spacing scale.** 4, 8, 12, 16, 24, 32 only. 24 between the page's parts, 16 between cards in a column, 20 inside a card, 8 between a heading and its body, 12 between rows. The grid components (`gap-4`, `gap-6`, `px-5`) set them; no screen invents a value. (Refactoring UI scale; NN/g proximity.)
9. **Weight and colour, not size.** Three sizes on a page: the title (28), the band values (24), the body (14); section titles are 18. Emphasis is semibold navy for values and grey for labels. Red only for Past due and Failed.
10. **Primary action's place.** Top right of the page header on a laptop (the filled button, then up to two outlines, then More). On a phone the same actions are one bar pinned to the bottom of the screen. The destructive action lives in the More menu, in red, last. (Mailchimp: primary top right, destructive in the three-dot menu.)
11. **Empty states** keep the card and its title and say one line of what will be there; "No invoice or payment yet." not a blank card.
12. **Grids and panels follow the same frame.** A grid is one card with no title (filters and search inside its top), the stat tiles above it are cards; the side panel is white, its facts divided by hairlines, its money summary a stone inset band.

**Decision: actions in the header, not a footer bar.** The old footer made the page a form with a Save bar; the work is reading a record and taking its next step, and Mailchimp puts that step beside the title (Send Message, top right of the profile) where it is found before scrolling. A bottom bar is kept only on a phone, where a button at the top scrolls away. The slot beat two ("How is this paid?") uses is the same actions region, so Charge $145 appears top right, and also in the Billing card where the choice is.

## 5. For Hannah (one sentence each, default stated)

1. Should the aside (customer, property, notes) sit to the right on a laptop? Default: yes, 320px right, main column first on a phone.
2. Should every status pill in the app get the dot now (grids, panels, the customer's account), or only the job and invoice pages? Default: everywhere, one component.
3. Should the summary band show the total with its money word ("$145, Unpaid") or only the total? Default: both, the money word is the thing you scan for.

## 6. Later additions (Nov 19, from Hannah's review)

**On my way, Start, Mark done (research).** Housecall Pro's job strip is On my way, then start work, then finish, with a status that says where the tech is ([Housecall Pro fleet tracking](https://www.housecallpro.com/resources/fleet-tracking-software/)); its own material notes that an "In progress" status can mean only that On my way was pressed, so a separate Start is what proves arrival. Jobber's On my way sends the customer an automated text ([third-party summary](https://ustechautomations.com/resources/blog/automate-best-enroute-notification-software-for-plumbing-companies-2026)). I could not confirm Jobber's visit timer wording or ServiceTitan's dispatch state names from public pages; treat those two as unverified. What we take: three beats in one place, each the one primary in turn (On my way texts the customer and confirms; Start tells no one and confirms nothing; Mark done), and a status that reads In progress with the time it started.

**Build facts.** `visit.started_at`; the derived state "In progress" (started, not done) in `src/lib/admin/jobs.ts`, shown as a solid navy badge with "Started 9:12 am"; the Today badge (info tone, navy tint) for a job whose visit is today. A checklist template per service in Settings › Services, and one checklist item row per visit with done, note and photo. The Jobs grid gains a Who filter (the person on the next visit) and a Status filter in the order Today, Unscheduled, Scheduled, Late, Done, Canceled.

**Rule added: a customer-facing action always confirms and states its effect** (section 4 is amended by `docs/DESIGN.md`'s "Customer-facing action" row). A reminder is "Send a payment reminder" and shows the exact text, never a bare "Remind"; the word is "Past due since Dec 3", never "Overdue". Messages are a table (Date, Message, Channel, To, Status), not chat bubbles. No message in the prototype names a window; a timed visit says "at 9:00 am", an untimed one says only the day.
