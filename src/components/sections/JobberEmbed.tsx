"use client"

import { useEffect, useRef } from "react"

export function JobberEmbed() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (containerRef.current.querySelector("script")) return

    const script = document.createElement("script")
    script.src =
      "https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js"
    script.setAttribute(
      "clienthub_id",
      "e23339b3-04e9-434e-b375-7b4a7a913424-2547401"
    )
    script.setAttribute(
      "form_url",
      "https://clienthub.getjobber.com/client_hubs/e23339b3-04e9-434e-b375-7b4a7a913424/public/work_request/embedded_work_request_form?form_id=2547401"
    )
    containerRef.current.appendChild(script)
  }, [])

  return (
    <div ref={containerRef}>
      <div id="e23339b3-04e9-434e-b375-7b4a7a913424-2547401" />
      <link
        rel="stylesheet"
        href="https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css"
        media="screen"
      />
    </div>
  )
}
