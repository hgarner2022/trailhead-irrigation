import { cn } from "@/lib/utils"
import { MailFrame } from "./MailFrame"
import { byId } from "./catalog"
import { ANATOMY, COLOURS, DONTS, DOS, NOT_VERIFIED, RULES, SOURCES, TYPE, contrast } from "./design-rules"

// Messages/Design rules: how any Trailhead email is laid out, so a new one follows the same system. The anatomy and the proposed receipt it describes, the ten rules with
// the page each comes from, the colour and type tables (contrast computed from the real values), do's and don'ts, and what the research could not confirm.

export function DesignRules() {
  const receipt = byId("receipt-check").proposed!()
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-8 text-base leading-7 text-foreground">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-navy">Email design rules</h1>
        <p>One layout for every Trailhead email: a 600px single column on a white card over a soft page, a branded header, a headline that states the fact, one summary block, one button, a plain footer. The Proposed email in every Messages story follows it. Nothing live uses it until it is approved.</p>
      </header>

      <section aria-labelledby="anatomy" className="grid gap-8 lg:grid-cols-[1fr_minmax(0,640px)]">
        <div className="space-y-3">
          <h2 id="anatomy" className="font-display text-xl font-semibold text-navy">The anatomy, top to bottom</h2>
          <ol className="space-y-3">
            {ANATOMY.map((a, i) => (
              <li key={a.part} className="flex gap-3">
                <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">{i + 1}</span>
                <p><span className="font-semibold">{a.part}. </span>{a.what}</p>
              </li>
            ))}
          </ol>
        </div>
        <MailFrame label="Proposed" subject={receipt.subject} html={receipt.html} text={receipt.text} width={600} dark />
      </section>

      <section aria-labelledby="rules" className="space-y-3">
        <h2 id="rules" className="font-display text-xl font-semibold text-navy">Ten rules, and where each comes from</h2>
        <ol className="space-y-4">
          {RULES.map((r, i) => (
            <li key={r.rule} className="rounded-lg border border-border p-4">
              <p className="font-semibold"><span className="mr-2 text-primary-dark">{i + 1}.</span>{r.rule}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.because}</p>
              <p className="mt-1 text-xs text-muted-foreground">Source: {r.source}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="colours" className="space-y-3">
        <h2 id="colours" className="font-display text-xl font-semibold text-navy">Colour</h2>
        <p className="text-sm">Hex values are the brand block in <code>src/emails/layout.ts</code>; an email cannot read CSS variables. The dark palette reuses them: charcoal for the page, navy for the card, cream for text. The header band stays white in dark mode so the logo is always on its own plate.</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead className="bg-stone"><tr><th scope="col" className="px-3 py-2">Role</th><th scope="col" className="px-3 py-2">Colour</th><th scope="col" className="px-3 py-2">On</th><th scope="col" className="px-3 py-2">Contrast</th></tr></thead>
            <tbody>
              {COLOURS.map((c) => {
                const ratio = c.on ? contrast(c.value, c.on.value) : null
                const ok = ratio !== null && c.need !== null && ratio >= c.need
                return (
                  <tr key={c.role} className="border-t border-border">
                    <th scope="row" className="px-3 py-2 font-semibold">{c.role}</th>
                    <td className="px-3 py-2"><span aria-hidden className="mr-2 inline-block size-4 rounded align-middle border border-border" style={{ background: c.value }} />{c.name} {c.value}</td>
                    <td className="px-3 py-2">{c.on ? `${c.on.name} ${c.on.value}` : "n/a"}</td>
                    <td className={cn("px-3 py-2 tabular-nums", c.need === null ? "text-muted-foreground" : "")}>{ratio === null ? "n/a" : `${ratio.toFixed(1)}:1`}{c.need === null ? ", decoration only, carries no information" : ok ? `, passes ${c.need}:1` : `, below ${c.need}:1`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="type" className="space-y-3">
        <h2 id="type" className="font-display text-xl font-semibold text-navy">Type</h2>
        <p className="text-sm">Five sizes and no others. No email client here loads a web font reliably, so the body is Helvetica Neue, Helvetica or Arial (Source Sans 3 leads the stack only for clients that have it) and Barlow Condensed on the headline is an extra with Arial Narrow standing in. Never a font file the email depends on.</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead className="bg-stone"><tr><th scope="col" className="px-3 py-2">Role</th><th scope="col" className="px-3 py-2">Size and line</th><th scope="col" className="px-3 py-2">Weight</th><th scope="col" className="px-3 py-2">Stack</th></tr></thead>
            <tbody>
              {TYPE.map((t) => (
                <tr key={t.role} className="border-t border-border align-top">
                  <th scope="row" className="px-3 py-2 font-semibold">{t.role}</th>
                  <td className="px-3 py-2 tabular-nums">{t.size}px / {t.line}px</td>
                  <td className="px-3 py-2">{t.weight}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.face}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="dos" className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 id="dos" className="font-display text-xl font-semibold text-navy">Do</h2>
          <ul className="list-disc space-y-1 pl-5">{DOS.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-navy">Don&apos;t</h2>
          <ul className="list-disc space-y-1 pl-5">{DONTS.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
      </section>

      <section aria-labelledby="unverified" className="space-y-2">
        <h2 id="unverified" className="font-display text-xl font-semibold text-navy">What the research did not confirm</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">{NOT_VERIFIED.map((n) => <li key={n}>{n}</li>)}</ul>
        <h2 className="pt-4 font-display text-xl font-semibold text-navy">Sources read</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">{SOURCES.map((s) => <li key={s}>{s}</li>)}</ul>
      </section>
    </div>
  )
}
