/**
 * Jobber work request form ids.
 *
 * Lives here, in a plain module, rather than in JobberEmbed.tsx. That file is
 * `"use client"`, and a Server Component importing a plain constant from a
 * client module gets a client-reference proxy instead of the value, so
 * `JOBBER_FORMS.aeration` silently read as undefined and the component fell
 * back to its default form. No error, just the wrong booking form on the page.
 *
 * Jobber uses one form per service, each with its own id.
 */
export const JOBBER_HUB_ID = "e23339b3-04e9-434e-b375-7b4a7a913424"

export const JOBBER_FORMS = {
  /** Turn-on, inspection, winterization. Used on /book. */
  seasonal: "2547401",
  /** Core aeration. Used on /aeration. */
  aeration: "5164288",
} as const

/**
 * Whether Trailhead is taking core aeration bookings.
 *
 * Off for the 2026 season per Hannah (2026-09-22). While this is false the
 * /aeration page keeps its explainer but shows no booking form, the cross
 * sell on /book is hidden, and /services links to the page rather than
 * offering to book it.
 *
 * Turning this back to true restores every booking path. It does NOT
 * reactivate the form inside Jobber. Form 5164288 has to be switched back on
 * there too, or the embed renders an inactive form.
 */
export const AERATION_BOOKING_OPEN = false
