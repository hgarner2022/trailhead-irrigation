import { expect } from "storybook/test"

// The FitTheCard assertion every embedded table has (Hannah, Nov 19 2026): at 1280 each table sits in its card (606px with the 320px aside)
// with nothing clipped and no sideways scroll, so a status pill or a Billing column is never cut off. It reads every table container on the
// story's page and names the card that overflows; a phone shows cards instead, so there is nothing to measure there. Between 768 and 1279
// the grid scrolls sideways under its own cue, as every grid does.
//
// And the edges line up (Nov 20 2026): a table's hairlines start and end where the card's own content does (the card's padding, no bleed), and the
// first header and the first cell's text start on that same left edge, so a table reads as part of the card's column of headings and facts.

const EDGE = 1.5

export async function expectTablesFitTheirCards(canvasElement: HTMLElement) {
  const boxes = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-slot=table-container]"))
  await expect(boxes.length).toBeGreaterThan(0)
  const clipped = boxes.filter((b) => b.scrollWidth > b.clientWidth).map((b) => `${b.closest("section")?.querySelector("h2, h3")?.textContent ?? "a table"} (${b.scrollWidth} in ${b.clientWidth})`)
  await expect(clipped).toEqual([])
  const bleeding: string[] = []
  for (const box of boxes) {
    const body = box.closest<HTMLElement>("[data-slot=section-card-body]")
    if (!body) continue
    const pad = getComputedStyle(body)
    const left = body.getBoundingClientRect().left + parseFloat(pad.paddingLeft)
    const right = body.getBoundingClientRect().right - parseFloat(pad.paddingRight)
    const rect = box.getBoundingClientRect()
    const first = box.querySelector<HTMLElement>("th, td")
    const firstLeft = first ? first.getBoundingClientRect().left + parseFloat(getComputedStyle(first).paddingLeft) : left
    if (Math.abs(rect.left - left) > EDGE || Math.abs(rect.right - right) > EDGE || Math.abs(firstLeft - left) > EDGE) {
      bleeding.push(`${box.closest("section")?.querySelector("h2, h3")?.textContent ?? "a table"} (table ${Math.round(rect.left)} to ${Math.round(rect.right)}, text at ${Math.round(firstLeft)}, card content ${Math.round(left)} to ${Math.round(right)})`)
    }
  }
  await expect(bleeding).toEqual([])
}
