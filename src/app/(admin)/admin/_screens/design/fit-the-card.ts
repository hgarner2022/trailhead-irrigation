import { expect } from "storybook/test"

// The FitTheCard assertion every embedded table has (Hannah, Nov 19 2026): at 1280 each table sits in its card (606px with the 320px aside)
// with nothing clipped and no sideways scroll, so a status pill or a Billing column is never cut off. It reads every table container on the
// story's page and names the card that overflows; a phone shows cards instead, so there is nothing to measure there. Between 768 and 1279
// the grid scrolls sideways under its own cue, as every grid does.

export async function expectTablesFitTheirCards(canvasElement: HTMLElement) {
  const boxes = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-slot=table-container]"))
  await expect(boxes.length).toBeGreaterThan(0)
  const clipped = boxes.filter((b) => b.scrollWidth > b.clientWidth).map((b) => `${b.closest("section")?.querySelector("h2, h3")?.textContent ?? "a table"} (${b.scrollWidth} in ${b.clientWidth})`)
  await expect(clipped).toEqual([])
}
