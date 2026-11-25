"use client"

import { useEffect, useState } from "react"
import { firstNameOf } from "@/lib/admin/people"
import { ScheduleToast } from "@/components/blocks/ScheduleToast"
import { MessageDialog } from "./MessageDialog"
import { moveMessage } from "./schedule-message"
import { useWorldState, type WorldStore } from "./schedule-world-store"

// What follows any move or placement, wherever the person is (the Schedule, or a job page whose Schedule or Move was just confirmed): the confirmation ("Moved to Thu, Nov 26,
// 9:00 am" with Notify the customer and Undo) and, when Notify the customer is pressed, the one Send a message dialog prefilled with the move's words. Notify all goes through the
// customers one at a time. Nothing is sent: Send only clears the "not notified" mark. Reads the store the screen and the walkthrough share.

const OPENER = "Trailhead: "

/** On a phone a sheet or dialog is open: the toast waits until it closes, so it never covers a row or a button. */
function useHeldOnPhone(): boolean {
  const [held, setHeld] = useState(false)
  useEffect(() => {
    const check = () => setHeld(window.matchMedia("(max-width: 767px)").matches && Boolean(document.querySelector("[role=dialog]")))
    check()
    const o = new MutationObserver(check)
    o.observe(document.body, { childList: true, subtree: true })
    return () => o.disconnect()
  }, [])
  return held
}

export function ScheduleOverlays({ store, people = [], toastSeconds = 10 }: { store: WorldStore; /** who is on the calendar, so the text says who is coming */ people?: readonly { id: string; name: string }[]; toastSeconds?: number }) {
  const state = useWorldState(store)
  const held = useHeldOnPhone()
  const toast = held ? null : state.toast
  const headId = state.notify[0]
  const head = headId ? state.visits.find((b) => b.id === headId) : undefined
  const meta = head ? state.meta[head.id] : undefined
  return (
    <>
      {toast && (
        <ScheduleToast
          key={toast.key}
          message={toast.message}
          notified={toast.notified}
          seconds={toastSeconds}
          onNotify={() => store.dispatch({ type: "ask-notify", ids: toast.ids })}
          onUndo={() => store.dispatch({ type: "undo" })}
          onClose={() => store.dispatch({ type: "dismiss-toast" })}
        />
      )}
      {head && meta && (
        <MessageDialog
          key={head.id}
          facts={{ first: firstNameOf(meta.customer) ?? meta.customer, customer: meta.customer, service: head.service.toLowerCase(), amount: "", dueOn: "", phone: meta.phone ?? "no phone on file", email: meta.email, address: head.title, channel: meta.phone ? "text" : "email" }}
          initialBody={moveMessage(head, { customer: meta.customer, personName: people.find((p) => p.id === head.personId)?.name, was: state.was[head.id] }).slice(OPENER.length)}
          onClose={() => store.dispatch({ type: "notify-close" })}
          onSend={() => store.dispatch({ type: "notify-next", sent: true })}
        />
      )}
    </>
  )
}
