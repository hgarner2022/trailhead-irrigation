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
