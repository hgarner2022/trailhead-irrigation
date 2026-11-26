"use client"

import { useRef, useState } from "react"
import { Copy, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { SettingsFact, SettingsList } from "@/components/blocks/SettingsList"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { API_SCOPES, SCOPE_WORDS, revokeKey, type ApiScope, type SettingsState } from "../settings-model"
import { ConfirmButton, TAP_TARGET, type Apply } from "./fields"

// Keys for the open API: an agent or another system connects with one, scoped to what it may do, one SettingsList row each. Create
// shows the key once, in its own dialog, with a copy button; only its first characters are kept after that, so only Done closes it.
// Revoke asks first. Keys act at once (they are not part of Save).

/** Creates the key and returns its one-time secret, or null when the name or scopes were not enough. */
export type OnCreateKey = (name: string, scopes: ApiScope[]) => string | null | Promise<string | null>

function CreateKey({ onCreate }: { onCreate: OnCreateKey }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<ApiScope[]>(["read"])
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // Set once the key is made, so closing the first dialog after success keeps the name and scopes until Done.
  const created = useRef(false)
  const reset = () => {
    created.current = false
    setOpen(false)
    setName("")
    setScopes(["read"])
    setSecret(null)
    setCopied(false)
  }
  const ready = name.trim() !== "" && scopes.length > 0
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Create key
      </Button>
      <ConfirmDialog
        title="Create an API key"
        message="Choose what the key may do. You can revoke it any time."
        confirmLabel="Create key"
        confirmDisabled={!ready}
        open={open}
        onOpenChange={(next) => {
          if (next) return setOpen(true)
          if (created.current) return setOpen(false)
          reset()
        }}
        onConfirm={async () => {
          const made = await onCreate(name, scopes)
          if (made === null) return { ok: false, message: "The key was not created. Give it a name and at least one scope." }
          created.current = true
          setSecret(made)
          return { ok: true }
        }}
      >
        <FormRow label="Key name">
          <Input className="min-h-11" value={name} onChange={(e) => setName(e.target.value)} placeholder="Appy agent" />
        </FormRow>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-foreground">Scopes</legend>
          {API_SCOPES.map((scope) => (
            <FormRow key={scope} label={SCOPE_WORDS[scope]} inline>
              <Checkbox className={`mt-2.5 ${TAP_TARGET}`} checked={scopes.includes(scope)} onCheckedChange={(v) => setScopes((cur) => (v === true ? [...cur, scope] : cur.filter((s) => s !== scope)))} />
            </FormRow>
          ))}
        </fieldset>
      </ConfirmDialog>
      {/* Once the key is shown it is gone for good, so only Done closes this one: Escape and a click outside are ignored. */}
      <ConfirmDialog
        title="Copy your key now"
        message="This is the only time the whole key is shown. Store it somewhere safe; after you close this, only its first characters are kept."
        open={secret !== null}
        onOpenChange={() => undefined}
        actions="none"
        size="md"
      >
        <div className="flex items-center gap-2">
          <code data-slot="new-key" className="min-w-0 flex-1 break-all rounded-lg bg-stone p-3 text-sm text-foreground">
            {secret}
          </code>
          <Button
            variant="outline"
            size="icon"
            aria-label="Copy key"
            onClick={() => {
              void navigator.clipboard?.writeText(secret ?? "").catch(() => undefined)
              setCopied(true)
            }}
          >
            <Copy className="size-4" aria-hidden />
          </Button>
        </div>
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {copied ? "Copied" : ""}
        </p>
        <div className="flex justify-end">
          <Button size="touch" onClick={reset}>
            Done
          </Button>
        </div>
      </ConfirmDialog>
    </>
  )
}

export function ApiKeys({ state, apply, onCreate, onRevoke }: { state: SettingsState; apply: Apply; onCreate: OnCreateKey; onRevoke?: (keyId: string) => void }) {
  return (
    <SettingsList
      title="API keys"
      description="An agent or another system connects with a key, scoped to what it may do."
      action={<CreateKey onCreate={onCreate} />}
      empty={{ title: "No keys yet", line: "Create a key and an agent or another system can read and act through the API." }}
      changes={state.changes}
      rows={state.keys.map((key) => ({
        id: key.id,
        title: key.name,
        single: true,
        aside: (
          <ConfirmButton
            label={`Revoke ${key.name}`}
            title={`Revoke ${key.name}?`}
            description="Anything using this key stops working right away. This cannot be undone; create a new key if you need one again."
            confirm="Revoke key"
            onConfirm={() => {
              apply((s, a) => revokeKey(s, key.id, a))
              onRevoke?.(key.id)
            }}
          />
        ),
        children: (
          <>
            <SettingsFact label="Key">
              <code className="text-sm">{key.prefix}</code>
            </SettingsFact>
            <SettingsFact label="Scopes">
              <div className="flex flex-wrap gap-1.5">
                {key.scopes.map((s) => (
                  <Badge key={s} variant="secondary">
                    {SCOPE_WORDS[s]}
                  </Badge>
                ))}
              </div>
            </SettingsFact>
            <SettingsFact label="Last used">
              <span className="text-muted-foreground">{key.lastUsedAt ? shortDate(key.lastUsedAt, TIME_ZONE) : "Never"}</span>
            </SettingsFact>
          </>
        ),
      }))}
    />
  )
}
