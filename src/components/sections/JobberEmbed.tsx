"use client"

import { useEffect, useRef } from "react"
import { JOBBER_FORMS, JOBBER_HUB_ID as HUB_ID } from "@/lib/jobber"

const SNIPPET =
  "https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js"
const STYLESHEET =
  "https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css"
const ASSETS_ORIGIN = "https://d3ey4dbjkt2f6s.cloudfront.net"
const FORM_ORIGIN = "https://clienthub.getjobber.com"

interface JobberEmbedProps {
  /** Jobber form id. Defaults to the seasonal form used on /book. */
  formId?: string
}

/**
 * Jobber work request form.
 *
 * Two things about Jobber's embed script are worth knowing before changing
 * anything here, both read off the live snippet at SNIPPET:
 *
 * 1. While the form loads, their script puts BOTH `jobber-inline-work-request`
 *    and `jobber-spinner` on the container div. Their stylesheet defines
 *    `.jobber-spinner` as `position:absolute; inset:0; width:100%;
 *    height:100%`. So during loading the container is pulled out of the
 *    layout flow, and without a positioned ancestor it sizes against the
 *    viewport: no space is reserved where the form will go, and the spinner
 *    is painted over the middle of the page rather than over the form slot.
 *    When the class comes off, the page jumps. `relative` on this wrapper
 *    contains that, and the min-height holds the slot open. The min-height
 *    sits just under the ~311px the first step settles at, so it never adds
 *    height once the form is up.
 *
 * 2. Their script only starts the XHR after awaiting gtag's client_id and
 *    session_id, each raced against a 3s timeout. This site loads GA4, so
 *    any visitor whose GA is blocked or slow waits up to 3 seconds before
 *    the form is even requested. That is Jobber's code and cannot be fixed
 *    from here; the preconnects below at least take the connection setup to
 *    both of their origins off the critical path.
 *
 * Do NOT try to clip Jobber's generous internal padding with a negative
 * margin. That shipped on 2026-09-10 and removed the form from the page
 * entirely: the iframe starts at 40px and only grows when their script
 * receives a resize message, so a 64px clip swallowed the whole thing.
 */
export function JobberEmbed({ formId = JOBBER_FORMS.seasonal }: JobberEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clientHubId = `${HUB_ID}-${formId}`

  useEffect(() => {
    if (!containerRef.current) return
    if (containerRef.current.querySelector("script")) return

    const script = document.createElement("script")
    script.src = SNIPPET
    script.setAttribute("clienthub_id", clientHubId)
    script.setAttribute(
      "form_url",
      `${FORM_ORIGIN}/client_hubs/${HUB_ID}/public/work_request/embedded_work_request_form?form_id=${formId}`
    )
    containerRef.current.appendChild(script)
  }, [clientHubId, formId])

  return (
    <div ref={containerRef} className="relative min-h-[300px]">
      <div id={clientHubId} />
      {/* React hoists these into <head>. preconnect opens the TCP/TLS
          connections while the page is still rendering, so the script and the
          form request do not each pay for a cold handshake. */}
      <link rel="preconnect" href={ASSETS_ORIGIN} crossOrigin="" />
      <link rel="preconnect" href={FORM_ORIGIN} crossOrigin="" />
      <link rel="preload" as="script" href={SNIPPET} crossOrigin="" />
      <link rel="stylesheet" href={STYLESHEET} media="screen" />
    </div>
  )
}
