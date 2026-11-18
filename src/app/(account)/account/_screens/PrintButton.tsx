"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Opens the browser's print dialog for the receipt on screen. */
export function PrintButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      Print
    </Button>
  )
}
