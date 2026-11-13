/**
 * What an admin server action answers (`(shell)/actions.ts`): done with whatever the screen reads back, or the API's own words
 * for why not. The screens take their actions as optional props of this shape; the catalog passes none and they stay local.
 */
export type Outcome<T = undefined> = { ok: true; data: T } | { ok: false; message: string }
