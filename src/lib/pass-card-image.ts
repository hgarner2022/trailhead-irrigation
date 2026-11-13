import { toPng } from "html-to-image"

/** The file the pass card is saved as: the pass number, which is also what the customer calls it. */
export const passImageFilename = (pass: { number: string }) => `${pass.number}.png`

/**
 * Saves the pass card on screen as a PNG at twice the size: the Done step's "Save as image" and the pass page's. It reads the
 * element marked `data-slot="pass-card"`, so what the customer saves is exactly what they see. Does nothing when no card is on screen.
 */
export async function savePassImage(pass: { number: string }, root: ParentNode = document): Promise<boolean> {
  const card = root.querySelector<HTMLElement>('[data-slot="pass-card"]')
  if (!card) return false
  const url = await toPng(card, { pixelRatio: 2, cacheBust: true })
  const link = document.createElement("a")
  link.href = url
  link.download = passImageFilename(pass)
  link.click()
  return true
}
