import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ApiDocsModel, DocField, DocOperation } from "./api-docs-model"

// The public API reference, rendered from the OpenAPI document: operations grouped
// by resource, each with its method, path, scope, a readable list of what goes in
// and what comes out, and a curl example. Pure render, server component. It lives
// on /developers, outside the admin shell, with no marketing chrome.

const METHOD_TONE: Record<DocOperation["method"], string> = {
  GET: "bg-positive/10 text-positive-deep",
  POST: "bg-primary/10 text-primary-deep",
  PATCH: "bg-stone text-navy",
  DELETE: "bg-destructive/10 text-destructive",
}

const anchor = (name: string) => `resource-${name}`
const opAnchor = (id: string) => `op-${id.replace(/\./g, "-")}`

function Fields({ label, fields }: { label: string; fields: DocField[] }) {
  return (
    <div data-slot="api-fields">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
      {fields.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Nothing.</p>
      ) : (
        <dl className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
          {fields.map((f) => (
            <div key={f.name} className="grid gap-x-4 gap-y-0.5 px-3 py-2 text-sm sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              <dt className="break-words font-mono text-[13px] text-navy">
                {f.name}
                {f.required && <span className="ml-1 text-xs text-destructive" title="Required"> required</span>}
              </dt>
              <dd className="min-w-0 text-muted-foreground">
                <span className="break-words font-mono text-xs text-foreground">{f.type}</span>
                {f.description && <span className="block">{f.description}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function Operation({ op }: { op: DocOperation }) {
  return (
    <article id={opAnchor(op.id)} data-slot="api-operation" aria-labelledby={`${opAnchor(op.id)}-title`} className="scroll-mt-6 rounded-lg border border-border bg-card p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={cn("rounded-md px-2 py-0.5 font-mono text-xs font-semibold", METHOD_TONE[op.method])}>{op.method}</span>
        <code className="break-all font-mono text-sm text-navy">{op.path}</code>
        <Badge variant="secondary">{op.scope} scope</Badge>
        {op.customerSelf && <Badge variant="outline">customers: own records</Badge>}
      </header>
      <h3 id={`${opAnchor(op.id)}-title`} className="mt-3 font-display text-xl font-semibold text-navy">
        <span className="font-mono text-base font-medium">{op.id}</span>
      </h3>
      <p className="mt-1 text-sm text-foreground">{op.summary}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Fields label="Input" fields={op.input} />
        <Fields label={`Output (${op.status})`} fields={op.output} />
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-charcoal p-3 text-xs leading-relaxed text-white" tabIndex={0} aria-label={`curl example for ${op.id}`}>
        <code>{op.curl}</code>
      </pre>
    </article>
  )
}

export interface ApiDocsProps {
  model: ApiDocsModel
  className?: string
}

export function ApiDocs({ model, className }: ApiDocsProps) {
  return (
    <div data-slot="api-docs" className={cn("mx-auto max-w-7xl container-padding-x py-8 sm:py-12", className)}>
      <header className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold text-navy">{model.title}</h1>
        <p className="mt-3 text-base text-foreground">{model.description}</p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Base URL</dt>
            <dd className="mt-1 break-all font-mono text-navy">{model.baseUrl}</dd>
            <dd className="mt-1 text-muted-foreground">
              The contract as <a className="text-primary-dark underline underline-offset-2" href={`${model.baseUrl}/openapi.json`}>OpenAPI 3.1 JSON</a>.
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Connect an agent over MCP</dt>
            <dd className="mt-1 break-all font-mono text-navy">{model.mcpUrl}</dd>
            <dd className="mt-1 text-muted-foreground">Send the same API key as a bearer token. Every operation below is a tool, named by its operation id.</dd>
          </div>
        </dl>
      </header>
      <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Resources" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {model.resources.map((r) => (
              <li key={r.name}>
                <a href={`#${anchor(r.name)}`} className="inline-flex min-h-8 items-center rounded-lg border border-border bg-card px-3 text-sm text-navy hover:bg-stone lg:w-full lg:border-transparent lg:bg-transparent">
                  {r.name} <span className="ml-1.5 text-xs text-muted-foreground">{r.operations.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-10">
          {model.resources.map((r) => (
            <section key={r.name} id={anchor(r.name)} aria-labelledby={`${anchor(r.name)}-title`} className="scroll-mt-6">
              <h2 id={`${anchor(r.name)}-title`} className="mb-4 font-display text-2xl font-semibold text-navy">{r.name}</h2>
              <div className="space-y-4">
                {r.operations.map((op) => (
                  <Operation key={op.id} op={op} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
