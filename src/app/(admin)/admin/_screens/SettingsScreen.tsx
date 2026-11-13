"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { ChangeLog } from "@/components/blocks/ChangeLog"
import { PageHeader } from "@/components/blocks/PageHeader"
import type { AdminData } from "@/lib/admin/types"
import { SAMPLE_KEYS, createKey, type Actor, type ApiScope, type SettingsState } from "./settings-model"
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
}

const TABS: { value: SettingsTab; label: string }[] = [
  { value: "trucks", label: "Trucks" },
  { value: "areas", label: "Areas" },
  { value: "capacity", label: "Capacity and windows" },
  { value: "messages", label: "Messages" },
  { value: "keys", label: "API keys" },
]

export function SettingsScreen({ data, today, defaultTab = "trucks", who = "Hannah" }: SettingsScreenProps) {
  const [state, setState] = useState<SettingsState>({ settings: data.settings, changes: data.settingsChanges, keys: SAMPLE_KEYS })
  const [savedAtCount, setSavedAtCount] = useState<number>()
  const actorFor = (s: SettingsState): Actor => ({ who, at: new Date(Date.parse(today) + s.changes.length * 1000).toISOString() })

  const apply: Apply = (change) => setState((s) => change(s, actorFor(s)))
  const onCreate = (name: string, scopes: ApiScope[]) => {
    const made = createKey(state, name, scopes, actorFor(state))
    if (!made) return null
    setState(made.state)
    return made.secret
  }
  const save = () => {
    console.info("save settings", state.settings)
    setSavedAtCount(state.changes.length)
  }
  const saved = savedAtCount === state.changes.length

  return (
    <div data-slot="settings-screen" className="space-y-6">
      <PageHeader
        title="Settings"
        context="Changes apply from the next schedule run."
        actions={
          <>
            <p role="status" className="self-center text-sm text-muted-foreground">
              {saved ? "Saved just now" : ""}
            </p>
            <Button onClick={save}>Save</Button>
          </>
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
          <Trucks state={state} apply={apply} />
        </TabsContent>
        <TabsContent value="areas">
          <Areas state={state} apply={apply} />
        </TabsContent>
        <TabsContent value="capacity">
          <Capacity state={state} apply={apply} />
        </TabsContent>
        <TabsContent value="messages">
          <Messages state={state} apply={apply} data={{ ...data, settings: state.settings }} />
        </TabsContent>
        <TabsContent value="keys">
          <ApiKeys state={state} apply={apply} onCreate={onCreate} />
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
