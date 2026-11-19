"use client"

import { FormRow } from "@/components/blocks/FormRow"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// The request path's "Tell Ryan about it" step: a few words (optional) and photos (optional), so Ryan knows what he is looking at before he calls. Nothing here is required, and the
// photo box only names the files in the prototype; the live step will upload them. Pure props, client component.

export function DetailsStep({ text, onText, files, onFiles }: { text: string; onText: (t: string) => void; files: string[]; onFiles: (names: string[]) => void }) {
  return (
    <div data-slot="booking-details" className="space-y-6">
      <FormRow label="A few words about it" hint="Optional. Ryan reads this before he calls.">
        <Textarea value={text} onChange={(e) => onText(e.target.value)} placeholder="A new system for the back yard, about a quarter acre" className="min-h-28 text-base" data-autofocus />
      </FormRow>
      <FormRow label="Photos" hint={files.length ? `${files.length} added: ${files.join(", ")}` : "Optional. A photo of the yard or the problem helps."}>
        <Input type="file" accept="image/*" multiple onChange={(e) => onFiles(Array.from(e.target.files ?? []).map((f) => f.name))} className="h-auto min-h-11 text-base" />
      </FormRow>
    </div>
  )
}
