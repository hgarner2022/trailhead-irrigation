import { JOURNEY_TITLE, MESSAGES, storyIdOf, type Journey, type MessageDef } from "./catalog"

// Messages/Overview: one table of every message a customer (or the crew) can get, with when it is sent, its channel, transactional or marketing, whether it is built
// or only prototyped, and a link to its story. Built from MESSAGES (./catalog.ts), so a message added there appears here with a working link.

const href = (id: string) => `/?path=/story/${id}`
const JOURNEYS = Object.keys(JOURNEY_TITLE) as Journey[]
const CLASS = { transactional: "Transactional", marketing: "Marketing", "to the crew": "To the crew" } as const

const channelWords = (m: MessageDef) => m.channels.map((c) => (c === "text" ? "Text" : "Email")).join(" and ")
const statusWords = (m: MessageDef) => (m.prototype?.length === m.channels.length ? "Prototype, not built yet" : m.prototype?.length ? `Built; ${m.prototype.join(" and ")} is a prototype` : m.noTrigger ? "Built, nothing sends it yet" : "Built")

export function Overview() {
  const built = MESSAGES.filter((m) => !m.prototype).length
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8 text-base leading-7 text-foreground">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-navy">Every message a customer can get</h1>
        <p>{MESSAGES.length} messages in the order of the customer&apos;s journey. {built} are built; the rest are prototypes in the same layout. Each link opens that message on a laptop (Current and Proposed side by side); &ldquo;On a phone&rdquo; opens the Proposed email and the text at the customer&apos;s width.</p>
        <p>Also read: <a className="font-semibold text-primary-dark underline underline-offset-2" target="_top" href={href("messages-design-rules--rules")}>Design rules</a> for the layout every email follows, and <a className="font-semibold text-primary-dark underline underline-offset-2" target="_top" href={href("messages-archive-every-live-email--receipt")}>the archive of every live email</a> at laptop and phone width.</p>
      </header>
      {JOURNEYS.map((journey) => {
        const rows = MESSAGES.filter((m) => m.journey === journey)
        return (
          <section key={journey} aria-labelledby={`j-${journey.replace(/\W+/g, "-")}`} className="space-y-2">
            <h2 id={`j-${journey.replace(/\W+/g, "-")}`} className="font-display text-xl font-semibold text-navy">{journey}</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                <thead className="bg-stone text-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">Message</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Channel</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Class</th>
                    <th scope="col" className="px-3 py-2 font-semibold">When it is sent</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className="border-t border-border align-top">
                      <th scope="row" className="px-3 py-2 font-semibold">
                        <a className="text-primary-dark underline underline-offset-2" target="_top" href={href(storyIdOf(m, "laptop"))}>{m.name}</a>
                        <span className="block text-xs font-normal"><a className="text-primary-dark underline underline-offset-2" target="_top" href={href(storyIdOf(m, "phone"))}>On a phone</a></span>
                      </th>
                      <td className="px-3 py-2">{channelWords(m)}</td>
                      <td className="px-3 py-2">{CLASS[m.klass]}</td>
                      <td className="max-w-md px-3 py-2">{m.when}</td>
                      <td className="px-3 py-2">{statusWords(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
