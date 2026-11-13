"use client"

import { useState } from "react"
import { Copy, KeyRound, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/blocks/EmptyState"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { API_SCOPES, SCOPE_WORDS, revokeKey, type ApiScope, type SettingsState } from "../settings-model"
import { ConfirmButton, type Apply } from "./fields"

// Keys for the open API: an agent or another system connects with one, scoped
// to what it may do. Create shows the key once, in the dialog, with a copy
// button; only its first characters are kept after that. Revoke asks first.

/** Creates the key and returns its one-time secret, or null when the name or scopes were not enough. */
export type OnCreateKey = (name: string, scopes: ApiScope[]) => string | null

function CreateKey({ onCreate }: { onCreate: OnCreateKey }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<ApiScope[]>(["read"])
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setName("")
      setScopes(["read"])
      setSecret(null)
      setCopied(false)
    }
  }
  const ready = name.trim() !== "" && scopes.length > 0
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" aria-hidden />
          Create key
        </Button>
      </DialogTrigger>
      <DialogContent
        // Once the key is shown it is gone for good, so only Done closes the dialog.
        showCloseButton={secret === null}
        onEscapeKeyDown={(e) => secret !== null && e.preventDefault()}
        onInteractOutside={(e) => secret !== null && e.preventDefault()}
      >
        {secret === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Create an API key</DialogTitle>
              <DialogDescription>Choose what the key may do. You can revoke it any time.</DialogDescription>
            </DialogHeader>
            <Input label="Key name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Appy agent" />
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-foreground">Scopes</legend>
              {API_SCOPES.map((scope) => (
                <div key={scope} className="flex items-center gap-2">
                  <Checkbox
                    id={`scope-${scope}`}
                    checked={scopes.includes(scope)}
                    onCheckedChange={(v) => setScopes((cur) => (v === true ? [...cur, scope] : cur.filter((s) => s !== scope)))}
                  />
                  <Label htmlFor={`scope-${scope}`} className="font-normal">
                    {SCOPE_WORDS[scope]}
                  </Label>
                </div>
              ))}
            </fieldset>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button disabled={!ready} onClick={() => setSecret(onCreate(name, scopes))}>
                Create key
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Copy your key now</DialogTitle>
              <DialogDescription>This is the only time the whole key is shown. Store it somewhere safe; after you close this, only its first characters are kept.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code data-slot="new-key" className="min-w-0 flex-1 break-all rounded-lg bg-stone p-3 text-sm text-foreground">
                {secret}
              </code>
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy key"
                onClick={() => {
                  void navigator.clipboard?.writeText(secret).catch(() => undefined)
                  setCopied(true)
                }}
              >
                <Copy className="size-4" aria-hidden />
              </Button>
            </div>
            <p role="status" className="min-h-5 text-sm text-muted-foreground">
              {copied ? "Copied" : ""}
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Done</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ApiKeys({ state, apply, onCreate }: { state: SettingsState; apply: Apply; onCreate: OnCreateKey }) {
  return (
    <div className="space-y-4">
      {state.keys.length === 0 ? (
        <EmptyState icon={KeyRound} title="No keys yet" line="Create a key and an agent or another system can read and act through the API." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Revoke</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium text-foreground">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-sm">{key.prefix}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {key.scopes.map((s) => (
                        <Badge key={s} variant="secondary">
                          {SCOPE_WORDS[s]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{key.lastUsedAt ? shortDate(key.lastUsedAt, TIME_ZONE) : "Never"}</TableCell>
                  <TableCell>
                    <ConfirmButton
                      label={`Revoke ${key.name}`}
                      title={`Revoke ${key.name}?`}
                      description="Anything using this key stops working right away. This cannot be undone; create a new key if you need one again."
                      confirm="Revoke key"
                      onConfirm={() => apply((s, a) => revokeKey(s, key.id, a))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <CreateKey onCreate={onCreate} />
    </div>
  )
}
