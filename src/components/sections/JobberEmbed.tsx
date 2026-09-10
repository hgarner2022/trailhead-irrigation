"use client"

import { useEffect, useRef } from "react"
import { JOBBER_FORMS, JOBBER_HUB_ID as HUB_ID } from "@/lib/jobber"
const SNIPPET =
  "https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js"
const STYLESHEET =
  "https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css"

interface JobberEmbedProps {
  /** Jobber form id. Defaults to the seasonal form used on /book. */
  formId?: string
}

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
      `https://clienthub.getjobber.com/client_hubs/${HUB_ID}/public/work_request/embedded_work_request_form?form_id=${formId}`
    )
    containerRef.current.appendChild(script)
  }, [clientHubId, formId])

  return (
    <div ref={containerRef}>
      {/*
        Jobber's embedded form ships ~96px of its own top padding above its
        "Enter your zip code to get started" heading: 32px on the page shell,
        40px on the centering wrapper, 24px on the card (16px under 640px
        wide, so ~88px on mobile). It renders in a cross-origin iframe, so
        none of that is reachable from here.

        Clipping 64px off the top leaves a normal 24-32px above the heading.
        The negative margin also takes those 64px off this container's flow
        height, so nothing dangles below the form. overflow-hidden does the
        clipping AND establishes a block formatting context, which is what
        stops the negative margin collapsing out of the wrapper instead.
      */}
      <div className="overflow-hidden">
        <div className="-mt-16">
          <div id={clientHubId} />
        </div>
      </div>
      <link rel="stylesheet" href={STYLESHEET} media="screen" />
    </div>
  )
}
