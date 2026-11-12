import { Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/blocks/EmptyState"
import { PageHeader } from "@/components/blocks/PageHeader"

// The Customers page's placeholder until the first passes are sold. It will
// layer pass status onto the Jobber client list and send the pass offer to
// the customers who already book a spring visit and a blowout. Pure render,
// server component, no data yet.

export function CustomersScreen() {
  return (
    <div data-slot="customers-screen" className="space-y-6">
      <PageHeader title="Customers" context="Arrives after the first passes are sold." />
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Users}
            title="Customers arrives after the first passes are sold"
            line="This page will layer pass status onto the Jobber client list and send the pass offer to the customers who already book a spring visit and a blowout."
          />
        </CardContent>
      </Card>
    </div>
  )
}
