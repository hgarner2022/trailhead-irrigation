# Service card redesign: no mark, the card is the signal

Nov 26 2026. The Service step of the booking form (`ServiceCard`, `ServicePicker`), phone first.

## What Hannah said

- The orange check badge on the chosen card: "it looks tacky".
- The white ring with a dot: it looks like a radio button.
- "The circle is still there": the empty ring at the right of every unchosen card.
- An orange outline round the chosen card that reads as a double border beside the navy edge.
- "Keep the icons, keep the animation, keep the card solid." "Slower animation better." "Redesign it, do better."

## The decision

**No card carries a mark, chosen or not.** No check, ring, dot, badge or chevron. The right end of a card is empty. The card itself does both jobs a mark used to do.

| State | What the customer sees | Why it reads |
|---|---|---|
| At rest | A white card with a hairline edge on a soft shadow; the drawn icon in a quiet stone tile; the name; one meta line | A raised, bordered surface with an icon and a title is the card's own signifier of "press me". The icon draws itself on first view, once. |
| Pointer over it (laptop only) | It lifts one pixel, its shadow deepens, its edge darkens | Hover is the laptop's confirmation that the whole card is the target. It is behind `@media (hover: hover)`, so a phone never shows a stuck hover that could look chosen. |
| Pressed | The whole card gives a little (0.985) and comes down onto the page: its shadow goes | Press feedback under the finger, at once (100 ms). |
| Chosen | The header fills navy with white words, the card rises on a deeper shadow, and it opens on what is included, the length and the price rule | Filled against unfilled and open against closed are differences of lightness and shape, not hue. Nothing else on the step is navy or open, so it reads at a glance and without colour. |
| Pressed again | The fill fades back, the card closes (400 ms) and comes back down | Same card, same place: the toggle is symmetrical. |
| Another card pressed | The first closes while the new one fills and opens | Only one card is ever navy and open. |
| Keyboard | Tab shows the orange focus ring round the card; Space or Enter toggles | The ring is drawn for the keyboard only (below). |

The Season Pass is the same white card with an orange tile and a thin orange rule along its top (now a straight rule clipped by the card's corner, where it was a border that bent round it). Chosen, it is navy like any other and the rule fades out. Its two visits are money, so they are the `PriceLines` block every customer screen lists money through, with no ticks.

"Need a quote?" is not a choice, it goes somewhere. So it is no longer a white card with a dashed edge and an arrow in a grey disc (another circle at the right): it lies flat in the page's stone with a white icon tile and one plain arrow.

## The orange outline

It was the focus ring, not a border. The card drew it with `:focus-visible` (`has-[:focus-visible]`), which is the browser's guess, and the browser also says yes when a script gives the focus (the step opens on its chosen card, `data-autofocus`) and, on some phones, after a tap. On a large navy surface that is a second, orange edge nobody asked for.

Now the ring is tied to a fact (`useKeyboardFocus`, `src/components/blocks/keyboard-focus.ts`): the page remembers whether the last thing the person did was steer with a key or use a pointer, and the card asks when it takes the focus. A tap, a click and a focus on load draw nothing. Tab, Space, Enter and the arrows draw the ring. Typing in a field does not count as steering (a phone's own keyboard sends key events, and someone who types a note and goes back a step has not picked up a keyboard). WCAG 2.4.7 Focus Visible is about keyboard focus, and that is kept.

## The motion

Kept, and judged again on exact frames (`after/375-strip-open.jpg`, `after/375-strip-close.jpg`; each frame is the clock held at that millisecond).

- Press: the card gives, 100 ms.
- Fill: header to navy, the card rising on its shadow, 450 ms.
- Open: starts 160 ms after the press and takes 650 ms on a symmetric ease; done at about 810 ms.
- Lines: each fades up over 420 ms, 60 ms apart, from about 290 ms (it was 350 ms: at 360 ms the old strip showed an open white box with nothing in it yet).
- Close: 400 ms.

Unhurried and not slow: the choice is unmistakable by 260 ms, the card is readable by 720 ms and at rest by 1 s. Under `prefers-reduced-motion` every state is simply shown.

## Research

How others signal a selectable card, and what was taken from each.

- **Salt (J.P. Morgan), Selectable card**: "Selectable cards must include a non-color selection indicator"; "Don't rely on border/stroke or color alone", because "in grayscale the selected card may be indistinguishable"; hover "highlights the entire card to indicate it can be selected by clicking anywhere in the card". Salt's own answer is a radio. Ours meets the requirement behind it another way: the chosen card differs in lightness (navy fill, about 12:1 against white) and in shape (it is open), both of which survive grayscale. <https://www.saltdesignsystem.com/salt/patterns/selectable-card>
- **ServiceTitan Anvil, Select Card** (a field-service product, the nearest neighbour to this one): the radio or checkbox indicator is optional and off by default (`showSelectIndicator` defaults to `false`); the selected card is shown by its own styling. <https://anvil.servicetitan.com/docs/web/components/select-card/design.md>
- **Appian SAIL, card layout**: a selected card is shown with a distinct border as a documented pattern. **Atlassian, border foundations**: a selected-border token at 2px. Both treat the card's own edge as a legitimate selected state. <https://docs.appian.com/suite/help/26.10/sail/ux-card-layout.html> <https://atlassian.design/foundations/border>
- **Material Design, states**: components such as cards use elevation for hover, and a state change is shown with an overlay or elevation rather than a new element. That is the rest, hover and chosen shadows here. <https://m2.material.io/go/design-states>
- **Chrome, card guidance**: a choice card keeps a real control in the markup. Here it is one `button` with `aria-pressed`, so a screen reader hears "Spring turn-on, toggle button, pressed" with no visual mark needed. <https://developer.chrome.com/docs/modern-web-guidance/guides/ui-components/card.md.txt>
- **Motion** (already cited in `src/app/base.css`): Material 3 motion, NN/g "Executing UX Animations", Apple HIG Motion.

Not verified from a live source and so not relied on: how Apple's store, Airbnb, Stripe, Cal.com and Linear style their option tiles. The searches returned no primary page for them.

Ruled out:

- A chevron at the right. It is a mark, it says "accordion" not "choice", and an earlier version with one was already replaced.
- The price at the right end in place of the ring. At 375 it pushes three of the seven names onto two lines, and the Season Pass has no single price to show.
- An orange edge or accent bar for chosen. Orange beside navy is what read as a double border.
- Dimming the unchosen cards. It reads as disabled, and a second press on another card must stay obviously possible.

## What was looked at

Storybook on port 6011, headless Chromium, real taps at 375 x 812 (touch) and real clicks at 1280 x 800, story `Customer / Booking form / Service`.

`after/`: collapsed, pressed (375), hover (1280), chosen (whole page and as the phone shows it), switched to another card, unselected by a second press, Season Pass chosen, the quote card, the step opening on a chosen card (no orange ring), Tab (ring shown), Space (chosen, ring stays), and the open and close frame strips. `before/`: the same step before this change.

Not seen: a real iPhone or Android phone (the tap-leaves-a-ring behaviour is a device behaviour; here it is removed by construction and covered by a unit test, not reproduced and then watched to disappear). The frame strips hold the clock by hand, so they show the design of the motion, not a recording of a phone's frame rate.

One thing unchanged and worth knowing: when the step opens with a card already chosen low in the list, the card can sit partly under the Continue bar until the customer scrolls (`after/375-08`). The card only scrolls itself clear when it is chosen by a press.
