"use client"

import { useEffect } from "react"

/**
 * Global conversion tracker.
 *
 * Listens for clicks on key conversion CTAs across the entire site and fires
 * GA4 events. Uses event delegation on the document so it catches links from
 * any page or component without each component having to wire up its own
 * event handlers.
 *
 * Events fired:
 *   - phone_click  → user tapped/clicked any tel: link
 *   - book_click   → user clicked any link to /book or /book/...
 *
 * Form-submit conversions (e.g. the contact form) fire their own gtag()
 * call directly inside the form's onSubmit handler — this component does
 * not handle those.
 *
 * Mark these as "Conversions" in the GA4 dashboard:
 *   GA4 → Admin → Events → toggle "Mark as conversion" on each event name
 */
export function ConversionTracking() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Walk up to the nearest <a> in case the click landed on a child span/icon.
      const link = target.closest("a")
      if (!link) return

      const href = link.getAttribute("href") ?? ""

      // tel: links
      if (href.startsWith("tel:")) {
        fireEvent("phone_click", {
          phone_number: href.replace("tel:", ""),
          link_text: link.textContent?.trim().slice(0, 80) ?? "",
          page_path: window.location.pathname,
        })
        return
      }

      // /book and /book/* links
      if (href === "/book" || href.startsWith("/book/") || href.startsWith("/book?")) {
        fireEvent("book_click", {
          link_text: link.textContent?.trim().slice(0, 80) ?? "",
          page_path: window.location.pathname,
        })
        return
      }
    }

    document.addEventListener("click", handleClick, { capture: true })
    return () => document.removeEventListener("click", handleClick, { capture: true })
  }, [])

  return null
}

/** Fires a GA4 event if gtag is available; otherwise no-ops. */
function fireEvent(name: string, params: Record<string, unknown>) {
  if (typeof window === "undefined") return
  // @ts-expect-error gtag is injected globally by Google Analytics' loader script
  if (typeof window.gtag !== "function") return
  // @ts-expect-error gtag is injected globally
  window.gtag("event", name, params)
}
