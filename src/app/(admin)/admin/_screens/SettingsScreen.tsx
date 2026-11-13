"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { ChangeLog } from "@/components/blocks/ChangeLog"
import { PageHeader } from "@/components/blocks/PageHeader"
import type { AdminData } from "@/lib/admin/types"
import type { Outcome } from "./action-types"
import { SAMPLE_KEYS, createKey, type Actor, type ApiKey, type ApiScope, type SettingsState } from "./settings-model"
import { Areas } from "./settings-tabs/Areas"
import { ApiKeys } from "./settings-tabs/ApiKeys"
import { Capacity } from "./settings-tabs/Capacity"
import { Messages } from "./settings-tabs/Messages"
import { Trucks } from "./settings-tabs/Trucks"
import type { Apply } from "./settings-tabs/fields"

// Where Ryan and Hannah set the rules the scheduler and the messages follow:
// trucks, area groups and town order, capacity and season windows, the
// customer messages and the API keys. Every edit goes through a reducer in
// settings-model.ts that also writes the change log under the tabs. Client
// because the tabs, the edits and the saved line are state; Save only logs
// in the prototype. The route's page.tsx supplies `data` and `today`; the
// log's times count up from `today` so a render is the same each time.

export type SettingsTab = "trucks" | "areas" | "capacity" | "messages" | "keys"

export interface SettingsScreenProps {
  data: AdminData
  /** ISO datetime the first new change is stamped with */
  today: string
  /** the tab open on first render; for the catalog, since the prototype has no URL state */
  defaultTab?: SettingsTab
  /** who the changes are logged as */
  who?: string
  /** the keys the API holds; the catalog's sample keys when absent */
  keys?: ApiKey[]
  /** a tech reads the settings and changes nothing: the fields are disabled and there is no Save */
  readOnly?: boolean
  /** Save and the key buttons; server actions in the app. Without them the screen only edits locally, as in the catalog. */
  actions?: SettingsActions
}

export interface SettingsActions {
  save: (settings: AdminData["settings"]) => Promise<Outcome>
  createKey: (name: string, scopes: ApiScope[]) => Promise<Outcome<{ key: string }>>
  revokeKey: (keyId: string) => Promise<Outcome>
}

const TABS: { value: SettingsTab; label: string }[] = [
  { value: "trucks", label: "Trucks" },
  { value: "areas", label: "Areas" },
  { value: "capacity", label: "Capacity and windows" },
  { value: "messages", label: "Messages" },
  { value: "keys", label: "API keys" },
]

export function SettingsScreen({ data, today, defaultTab = "trucks", who = "Hannah", keys, readOnly = false, actions }: SettingsScreenProps) {
  const fresh = (): SettingsState => ({ settings: data.settings, changes: data.settingsChanges, keys: keys ?? SAMPLE_KEYS })
  const [state, setState] = useState<SettingsState>(fresh)
  const [seen, setSeen] = useState({ settings: data.settings, keys })
  const [pending, start] = useTransition()
  const [message, setMessage] = useState("")
  // What the server holds, after Save or a key change refreshed the page, replaces what the screen holds.
  if (data.settings !== seen.settings || keys !== seen.keys) {
    setSeen({ settings: data.settings, keys })
    setState(fresh())
  }
  const [savedAtCount, setSavedAtCount] = useState<number>()
  const actorFor = (s: SettingsState): Actor => ({ who, at: new Date(Date.parse(today) + s.changes.length * 1000).toISOString() })

  const apply: Apply = (change) => {
    setMessage("")
    setState((s) => change(s, actorFor(s)))
  }
  const onCreate = (name: string, scopes: ApiScope[]): string | null | Promise<string | null> => {
    if (actions)
      return actions.createKey(name, scopes).then((out) => {
        if (out.ok) return out.data.key
        setMessage(out.message)
        return null
      })
    const made = createKey(state, name, scopes, actorFor(state))
    if (!made) return null
    setState(made.state)
    return made.secret
  }
  const onRevoke = (keyId: string) => {
    if (!actions) return
    start(async () => {
      const out = await actions.revokeKey(keyId)
      if (out.ok) return
      setMessage(out.message)
      setState(fresh())
    })
  }
  const save = () => {
    if (!actions) {
      console.info("save settings", state.settings)
      return setSavedAtCount(state.changes.length)
    }
    start(async () => {
      const out = await actions.save(state.settings)
      setMessage(out.ok ? "Saved just now" : out.message)
    })
  }
  const saved = savedAtCount === state.changes.length

  return (
    <div data-slot="settings-screen" className="space-y-6">
      <PageHeader
        title="Settings"
        context={readOnly ? "You can read the settings; a manager changes them." : "Changes apply from the next schedule run."}
        actions={
          readOnly ? undefined : (
            <>
              <p role="status" className="self-center text-sm text-muted-foreground">
                {message || (!actions && saved ? "Saved just now" : "")}
              </p>
              <Button onClick={save} disabled={pending}>
                Save
              </Button>
            </>
          )
        }
      />
      <Tabs defaultValue={defaultTab}>
        <div className="max-w-full overflow-x-auto">
          <TabsList aria-label="Settings sections">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="shrink-0 whitespace-nowrap">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="trucks">
          <fieldset disabled={readOnly} className="min-w-0">
            <Trucks state={state} apply={apply} />
          </fieldset>
        </TabsContent>
        <TabsContent value="areas">
          <fieldset disabled={readOnly} className="min-w-0">
            <Areas state={state} apply={apply} />
          </fieldset>
        </TabsContent>
        <TabsContent value="capacity">
          <fieldset disabled={readOnly} className="min-w-0">
            <Capacity state={state} apply={apply} />
          </fieldset>
        </TabsContent>
        <TabsContent value="messages">
          <fieldset disabled={readOnly} className="min-w-0">
            <Messages state={state} apply={apply} data={{ ...data, settings: state.settings }} />
          </fieldset>
        </TabsContent>
        <TabsContent value="keys">
          <fieldset disabled={readOnly} className="min-w-0">
            <ApiKeys state={state} apply={apply} onCreate={onCreate} onRevoke={onRevoke} />
          </fieldset>
        </TabsContent>
      </Tabs>
      <Card>
        <CardHeader>
          <CardTitleHeading>Change log</CardTitleHeading>
        </CardHeader>
        <CardContent>
          <ChangeLog changes={state.changes} />
        </CardContent>
      </Card>
    </div>
  )
}
