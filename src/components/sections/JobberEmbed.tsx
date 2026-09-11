"use client"

import { useEffect, useRef } from "react"
import { JOBBER_FORMS, JOBBER_HUB_ID as HUB_ID } from "@/lib/jobber"

const SNIPPET =
  "https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js"
const STYLESHEET =
  "https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css"
const ASSETS_ORIGIN = "https://d3ey4dbjkt2f6s.cloudfront.net"
const FORM_ORIGIN = "https://clienthub.getjobber.com"

/** Below this width we treat it as a phone. Matches Tailwind's md breakpoint. */
const MOBILE_MAX_WIDTH = 767
/** Breathing room under the sticky header so the form top is not tight to it. */
const HEADER_GAP = 12
/**
 * A step change resizes the form substantially. Smaller changes are things
 * like a validation message appearing, which should not move the page.
 */
const STEP_CHANGE_THRESHOLD_PX = 40

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

  /**
   * Keep the form in view when a step advances on a phone.
   *
   * Jobber posts "scrolltop" to the parent window when the form moves to the
   * next step. Their own handler responds to it with
   * `document.querySelector(".jobber-dialog-overlay").scrollTo(0, 0)`, but
   * `.jobber-dialog-overlay` only exists in their modal embed. On an inline
   * embed that selector returns null, the line throws, and nothing scrolls.
   * The iframe meanwhile resizes under a focused field, which on iOS Safari
   * and Android Chrome drops the reader near the bottom of the page with the
   * form somewhere above them.
   *
   * So: listen for their signal ourselves. Height messages are a fallback for
   * the case where "scrolltop" does not arrive, since every step change also
   * changes the iframe height.
   *
   * Registered in its own effect, declared before the one that injects the
   * script, so the listener is live before Jobber's iframe can post anything.
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let lastHeight: number | null = null
    let pending: ReturnType<typeof setTimeout> | null = null

    const scrollFormIntoView = () => {
      // Desktop shows the whole form at once and has no jump to correct.
      if (window.innerWidth > MOBILE_MAX_WIDTH) return

      const header = document.querySelector("header")
      const headerHeight = header ? header.getBoundingClientRect().height : 0
      const top =
        container.getBoundingClientRect().top +
        window.scrollY -
        headerHeight -
        HEADER_GAP

      // Only pull back when the page has actually run past the form. Without
      // this, any resize would yank someone who was reading further up.
      if (window.scrollY <= top + 1) return

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      window.scrollTo({
        top: Math.max(top, 0),
        behavior: reduced ? "auto" : "smooth",
      })
    }

    // Let the iframe finish resizing, and let the browser's own scrolling
    // settle, before correcting it. Otherwise we scroll and it jumps after us.
    const queueScroll = () => {
      if (pending) clearTimeout(pending)
      pending = setTimeout(scrollFormIntoView, 80)
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== FORM_ORIGIN) return

      // Make sure this came from our iframe and not some other embed. Reading
      // contentWindow is a reference comparison, allowed cross-origin.
      const iframe = container.querySelector<HTMLIFrameElement>(
        "iframe.jobber-work-request"
      )
      if (!iframe || event.source !== iframe.contentWindow) return

      if (event.data === "scrolltop") {
        queueScroll()
        return
      }

      // Everything else worth reading is a height string like "311px".
      // "close" and "recaptcha-setup" fall out here as NaN.
      if (typeof event.data !== "string") return
      const height = Number.parseInt(event.data, 10)
      if (!Number.isFinite(height)) return

      const previous = lastHeight
      lastHeight = height
      // The first height is the form rendering, not a step change.
      if (previous === null) return
      if (Math.abs(height - previous) < STEP_CHANGE_THRESHOLD_PX) return
      queueScroll()
    }

    window.addEventListener("message", onMessage)
    return () => {
      window.removeEventListener("message", onMessage)
      if (pending) clearTimeout(pending)
    }
  }, [])

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
