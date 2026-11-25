"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SaveBar } from "@/components/blocks/SaveBar"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/blocks/PageHeader"
import type { AdminData, ServiceItem } from "@/lib/admin/types"
import { DEFAULT_BILLING } from "@/lib/settings/defaults"
import { SERVICE_LIST } from "@/lib/services"
import type { Outcome } from "./action-types"
import { SAMPLE_KEYS, createKey, type Actor, type ApiKey, type ApiScope, type SettingsState } from "./settings-model"
import { Billing } from "./settings-tabs/Billing"
import { ApiKeys } from "./settings-tabs/ApiKeys"
import { messageProblems } from "./settings-messages"
import { Messages } from "./settings-tabs/Messages"
import { People, type PeopleTimeOff } from "./settings-tabs/People"
import { peopleProblems } from "./settings-people"
import { Services } from "./settings-tabs/Services"
import type { Apply } from "./settings-tabs/fields"
import { changeWords, pendingLines } from "./settings-tabs/change-words"

// Where Ryan and Hannah set the rules the scheduler and the messages follow:
// the people, the services, billing, the customer messages and the API keys (step 6 took the Areas and
// Capacity and windows tabs off the screen; their columns stay in the database until the engine step).
// The five entries are a list at the left (on a phone a list that drills into one entry, with a way
// back). Every edit goes through a reducer that also writes the change log; nothing saves while typing:
// the first change shows the SaveBar with the count of changed fields, Discard and Save. Client
// because the entry, the edits and the saved line are state; Save only logs in the prototype. The
// route's page.tsx supplies `data` and `today`; the log's times count up from `today` so a render
// is the same each time.

export type SettingsTab = "people" | "services" | "billing" | "messages" | "keys"

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
  /** People's Time off rows (the prototype passes it: the Schedule only draws the band); the live admin leaves it off for now */
  timeOff?: PeopleTimeOff
}

export interface SettingsActions {
  save: (settings: AdminData["settings"], services?: ServiceItem[]) => Promise<Outcome>
  createKey: (name: string, scopes: ApiScope[]) => Promise<Outcome<{ key: string }>>
  revokeKey: (keyId: string) => Promise<Outcome>
}

const TABS: { value: SettingsTab; label: string }[] = [
  { value: "people", label: "People" },
  { value: "services", label: "Services" },
  { value: "billing", label: "Billing" },
  { value: "messages", label: "Messages" },
  { value: "keys", label: "API keys" },
]

export function SettingsScreen({ data, today, defaultTab, who = "Hannah", keys, readOnly = false, actions, timeOff }: SettingsScreenProps) {
  // The fixtures carry no billing settings: they read the defaults, as an organization that never saved the tab does.
  const fresh = (): SettingsState => ({ settings: { ...data.settings, billing: data.settings.billing ?? DEFAULT_BILLING }, changes: data.settingsChanges, keys: keys ?? SAMPLE_KEYS, services: [...(data.services ?? SERVICE_LIST)] })
  const [state, setState] = useState<SettingsState>(fresh)
  // How many log lines were there when the screen last matched the server: the lines after them are the unsaved changes.
  const [baseline, setBaseline] = useState(data.settingsChanges.length)
  const [seen, setSeen] = useState({ settings: data.settings, keys, services: data.services })
  const [pending, start] = useTransition()
  const [message, setMessage] = useState("")
  const [failed, setFailed] = useState(false)
  // null: on a phone the list of entries; from a laptop up the first entry is open either way.
  const [tab, setTab] = useState<SettingsTab | null>(defaultTab ?? null)
  // What the server holds, after Save or a key change refreshed the page, replaces what the screen holds.
  if (data.settings !== seen.settings || keys !== seen.keys || data.services !== seen.services) {
    setSeen({ settings: data.settings, keys, services: data.services })
    setState(fresh())
    setBaseline(data.settingsChanges.length)
  }
  const actorFor = (s: SettingsState): Actor => ({ who, at: new Date(Date.parse(today) + s.changes.length * 1000).toISOString() })

  const apply: Apply = (change) => {
    setMessage("")
    setState((s) => change(s, actorFor(s)))
  }
  const onCreate = (name: string, scopes: ApiScope[]): string | null | Promise<string | null> => {
    if (actions)
      return actions.createKey(name, scopes).then((out) => {
        if (out.ok) return out.data.key
        setFailed(true)
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
      setFailed(true)
      setMessage(out.message)
      setState(fresh())
    })
  }
  // Keys are created and revoked at once, not by Save, so their log lines are never "unsaved".
  const waiting = state.changes.slice(baseline).filter((c) => c.field !== "API keys")
  const lines = pendingLines(waiting)
  const unsaved = lines.length
  // The log holds what is saved, in words; the edits Save has not written yet are listed in the SaveBar instead.
  const savedChanges = state.changes.filter((c, i) => i < baseline || c.field === "API keys").map(changeWords)
  const shown: SettingsState = { ...state, changes: savedChanges }
  const problems = [...peopleProblems(state.settings), ...messageProblems(state.settings)]
  const discard = () => {
    setState(fresh())
    setBaseline(data.settingsChanges.length)
    setMessage("")
  }
  const save = () => {
    if (!actions) {
      console.info("save settings", state.settings)
      setBaseline(state.changes.length)
      setFailed(false)
      return setMessage("Saved just now")
    }
    start(async () => {
      const out = await actions.save(state.settings, state.services)
      setFailed(!out.ok)
      if (out.ok) setBaseline(state.changes.length)
      setMessage(out.ok ? "Saved just now" : out.message)
    })
  }
  const open = tab ?? "people"
  const label = TABS.find((x) => x.value === open)!.label

  return (
    <div data-slot="settings-screen" className="space-y-6">
      <PageHeader title="Settings" context={readOnly ? "You can read the settings. A manager changes them." : "Changes apply from the next schedule run."} />
      <Tabs value={open} onValueChange={(v) => setTab(v as SettingsTab)} orientation="vertical" className="flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <TabsList
          variant="line"
          aria-label="Settings sections"
          className={cn("w-full gap-0 rounded-lg border border-border bg-card p-0 md:sticky md:top-20 md:w-52 md:shrink-0 md:border-0 md:bg-transparent", tab !== null && "max-md:hidden")}
        >
          {TABS.map((x) => (
            <TabsTrigger
              key={x.value}
              value={x.value}
              // Radix fires onValueChange only for a new value; on a phone the already-selected first entry must still drill in.
              onClick={() => setTab(x.value)}
              className="h-14 flex-none justify-between rounded-none border-b border-border px-4 text-base last:border-b-0 data-[state=active]:font-semibold md:h-10 md:justify-start md:rounded-md md:border-0 md:px-3 md:text-sm md:data-[state=active]:bg-stone"
            >
              {x.label}
              <ChevronRight className="size-4 text-muted-foreground md:hidden" aria-hidden />
            </TabsTrigger>
          ))}
        </TabsList>
        <div className={cn("min-w-0 flex-1 space-y-4", tab === null && "max-md:hidden")}>
          <Button variant="ghost" size="sm" className="-ml-2 min-h-11 md:hidden" onClick={() => setTab(null)} aria-label={`Back to Settings from ${label}`}>
            <ChevronLeft className="size-4" aria-hidden />
            Settings
          </Button>
          <TabsContent value="people">
            <fieldset disabled={readOnly} className="min-w-0">
              <People state={shown} apply={apply} timeOff={timeOff} />
            </fieldset>
          </TabsContent>
          <TabsContent value="services">
            <fieldset disabled={readOnly} className="min-w-0">
              <Services state={shown} apply={apply} />
            </fieldset>
          </TabsContent>
          <TabsContent value="billing">
            <fieldset disabled={readOnly} className="min-w-0">
              <Billing state={shown} apply={apply} />
            </fieldset>
          </TabsContent>
          <TabsContent value="messages">
            <fieldset disabled={readOnly} className="min-w-0">
              <Messages state={shown} apply={apply} data={{ ...data, settings: state.settings }} />
            </fieldset>
          </TabsContent>
          <TabsContent value="keys">
            <fieldset disabled={readOnly} className="min-w-0">
              <ApiKeys state={shown} apply={apply} onCreate={onCreate} onRevoke={onRevoke} />
            </fieldset>
          </TabsContent>
          {!readOnly && <SaveBar count={unsaved} lines={lines} problems={problems} pending={pending} message={message} failed={failed} onSave={save} onDiscard={discard} />}
        </div>
      </Tabs>
    </div>
  )
}
