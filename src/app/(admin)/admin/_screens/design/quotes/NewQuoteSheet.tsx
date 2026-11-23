"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SidePanel } from "@/components/blocks/SidePanel"
import type { AdminData } from "@/lib/admin/types"
import { CustomerPicker, choiceReady, emptyChoice, type CustomerChoice } from "../../CustomerPicker"
import { NO_PICK, pickMissing, pickedService, type ServicePick } from "../requests/request-catalogue"
import type { ChosenService } from "../requests/RequestDialogs"
import { ServicePicker } from "../requests/ServicePicker"

// New quote (Hannah, Nov 22 2026: "we need to be able to manually create a quote too"): a short sheet, the customer (search, or a new one) and the same required "What is this for?" picker the
// convert sheet has, ending in Something else. The service becomes the quote's first line, with the catalogue price when it has one. It makes a quote in Draft and the host opens its page; no request
// is involved and nothing is sent. Opened from the Quotes list, a customer's page (and More) and New job's "New quote", which brings the customer and the service it already has. Pure props.

export interface NewQuoteSheetProps {
  data: AdminData
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the customer already chosen, when it opens from a customer's page */
  customerId?: string
  /** what the sheet opens with: New job's choice carried over, or a story's filled-in sheet */
  initial?: { customer?: CustomerChoice; pick?: ServicePick }
  onCreate: (o: { choice: CustomerChoice; service: ChosenService }) => void
}

export function NewQuoteSheet({ data, open, onOpenChange, customerId, initial, onCreate }: NewQuoteSheetProps) {
  const [choice, setChoice] = useState<CustomerChoice>(initial?.customer ?? emptyChoice(customerId))
  const [pick, setPick] = useState<ServicePick>(initial?.pick ?? NO_PICK)
  const service = pickedService(pick)
  const ready = choiceReady(choice, data.clients)
  const missing = !ready ? "Choose a customer." : pickMissing(pick)
  // closing the sheet forgets what was chosen, as New job does: the next one starts blank
  const change = (next: boolean) => {
    if (!next) {
      setChoice(initial?.customer ?? emptyChoice(customerId))
      setPick(initial?.pick ?? NO_PICK)
    }
    onOpenChange(next)
  }
  return (
    <SidePanel
      open={open}
      onOpenChange={change}
      title="New quote"
      description="A customer and what it is for."
      footer={
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="min-h-11 w-full sm:w-fit"
            disabled={Boolean(missing)}
            aria-describedby={missing ? "new-quote-missing" : undefined}
            onClick={() => {
              if (!service) return
              onCreate({ choice, service: { name: service.name, ...(service.price !== undefined ? { price: service.price } : {}) } })
              change(false)
            }}
          >
            New quote
          </Button>
          {missing && (
            <p id="new-quote-missing" className="text-sm text-muted-foreground">
              {missing}
            </p>
          )}
        </div>
      }
    >
      <div data-slot="new-quote" className="flex flex-col gap-5">
        <CustomerPicker data={data} customerId={customerId} value={choice} onChange={setChoice} idPrefix="nq" />
        <ServicePicker value={pick} onChange={setPick} />
      </div>
    </SidePanel>
  )
}
