"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { FlowText } from "../FlowFrame"

// The texts and emails of the customer walkthrough, drawn the way a phone shows them: a Messages thread from "Trailhead" (grey incoming bubbles, a
// time under each) and a Mail list that opens one email. A link in a message is a short tappable domain, never a path or a query string; tapping it
// opens the page it stands for inside the phone. Pure props over the real renderers' words.

const URL_RE = /(https?:\/\/[^\s]+)/g

/** "trailheadirrigation.com/v/ab12" for a visit link, ".../p/7k2m" for the pay link: short, and nothing of the real address on screen. */
export function shortLink(url: string): string {
  if (/\/pay\//.test(url)) return "trailheadirrigation.com/p/7k2m"
  if (/\/visits\//.test(url)) return "trailheadirrigation.com/v/ab12"
  return "trailheadirrigation.com/a/9x3k"
}

const TIMES = ["9:41 am", "9:41 am", "Yesterday, 4:00 pm", "Today, 8:12 am", "Today, 11:30 am", "Today, 11:31 am"]

function Words({ body, onLink }: { body: string; onLink: (url: string) => void }) {
  return (
    <>
      {body.split(URL_RE).map((p, i) =>
        i % 2 === 1 ? (
          <button key={i} type="button" onClick={() => onLink(p)} className="min-h-6 text-left font-medium text-[#0a66c2] underline underline-offset-2">
            {shortLink(p)}
          </button>
        ) : (
          p
        ),
      )}
    </>
  )
}

export function PhoneInbox({ texts, onLink, onUnsubscribe }: { texts: FlowText[]; onLink: (url: string) => void; onUnsubscribe?: () => void }) {
  const messages = texts.filter((t) => t.channel === "text")
  const mail = texts.filter((t) => t.channel === "email")
  const [tab, setTab] = useState<"messages" | "mail">(messages.length ? "messages" : "mail")
  const [openId, setOpenId] = useState<string | null>(null)
  const open = mail.find((m) => m.id === openId) ?? null
  const setOpen = (t: FlowText | null) => setOpenId(t?.id ?? null)
  return (
    <div data-slot="phone-inbox" className="flex min-h-svh flex-col bg-white">
      <header className="border-b border-border bg-stone/70 px-4 pb-3 pt-4 text-center">
        <span aria-hidden className="mx-auto flex size-10 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">T</span>
        <h1 className="mt-1 text-sm font-semibold text-foreground">{tab === "messages" ? "Trailhead" : open ? "Mail" : "Inbox"}</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-3 pb-16 pt-4">
        {tab === "messages" ? (
          messages.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">No texts. You chose email.</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {messages.map((t, i) => (
                <li key={t.id}>
                  <p data-slot="phone-time" className="mb-1 text-center text-xs text-muted-foreground">{TIMES[i] ?? "Today"}</p>
                  <p data-slot="phone-bubble" className="max-w-[17rem] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-[#e9e9eb] px-3.5 py-2 text-[15px] leading-snug text-black">
                    <Words body={t.body} onLink={onLink} />
                  </p>
                </li>
              ))}
            </ol>
          )
        ) : open ? (
          <article data-slot="phone-mail" className="px-1">
            <button type="button" className="mb-3 min-h-9 text-sm font-medium text-[#0a66c2]" onClick={() => setOpen(null)}>‹ Inbox</button>
            <h2 className="text-lg font-semibold text-foreground">{open.subject}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">From Trailhead Lawn &amp; Irrigation</p>
            <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-snug text-foreground"><Words body={open.body} onLink={onLink} /></p>
            {open.id === "marketing-email" && (
              <p data-slot="mail-footer" className="mt-6 border-t border-border pt-3 text-sm text-muted-foreground">
                You get this because you chose marketing emails.{" "}
                <button type="button" onClick={onUnsubscribe} className="min-h-9 font-medium text-[#0a66c2] underline underline-offset-2">Unsubscribe</button>
              </p>
            )}
          </article>
        ) : mail.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">No emails. You chose text.</p>
        ) : (
          <ul className="divide-y divide-border">
            {mail.map((t, i) => (
              <li key={t.id}>
                <button type="button" onClick={() => setOpen(t)} className="flex min-h-16 w-full flex-col items-start justify-center px-2 py-2 text-left">
                  <span className="flex w-full justify-between text-sm"><span className="font-semibold text-foreground">Trailhead</span><span className="text-xs text-muted-foreground">{TIMES[i] ?? "Today"}</span></span>
                  <span className="text-sm font-medium text-foreground">{t.subject}</span>
                  <span className="line-clamp-1 text-sm text-muted-foreground">{t.body.replace(URL_RE, "")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <nav aria-label="Messages or Mail" className="sticky bottom-0 grid grid-cols-2 border-t border-border bg-stone/90 text-sm">
        {(["messages", "mail"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => (setTab(k), setOpen(null))} className={cn("min-h-12 font-medium", tab === k ? "text-[#0a66c2]" : "text-muted-foreground")}>
            {k === "messages" ? "Messages" : "Mail"}
          </button>
        ))}
      </nav>
    </div>
  )
}
