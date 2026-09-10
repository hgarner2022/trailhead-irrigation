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
      <div id={clientHubId} />
      <link rel="stylesheet" href={STYLESHEET} media="screen" />
    </div>
  )
}
