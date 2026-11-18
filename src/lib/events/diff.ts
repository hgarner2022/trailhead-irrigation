/** What a write changed, as an event's `detail.changed`: each field that differs, `{ from, to }`; a field the write left out is not in it. */
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
  const changed: Record<string, { from: unknown; to: unknown }> = {}
  for (const [key, to] of Object.entries(after)) {
    if (to === undefined) continue
    const from = before[key] ?? null
    if (JSON.stringify(from) !== JSON.stringify(to ?? null)) changed[key] = { from, to: to ?? null }
  }
  return changed
}
