import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { JobPill } from "./JobPill"
import { PANEL_ROW, PanelFacts, PanelHeading, PanelList, PanelRowEnd, PanelRowText } from "./PanelParts"
import { visitJob } from "@/lib/admin/jobs"
import type { Visit } from "@/lib/admin/types"

// A section the way every panel writes it: heading, facts, then rows whose pill never runs past the edge.
const visit = { id: "v", clientId: "c", clientName: "Dana", town: "Erie", kind: "turn-on", status: "scheduled", isPass: true, jobberUrl: "", scheduledOn: "2026-11-19" } as Visit
const job = visitJob(visit, "2026-11-12", "America/Denver")

const meta = { title: "Blocks/PanelParts", parameters: { layout: "padded" } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="max-w-sm space-y-6">
      <section aria-labelledby="pp-facts">
        <PanelHeading id="pp-facts">Customer</PanelHeading>
        <PanelFacts rows={[["Address", "12 Briggs Street, Erie"], ["Phone", "(303) 555-0111"]]} />
      </section>
      <section aria-labelledby="pp-rows">
        <PanelHeading id="pp-rows">Visits</PanelHeading>
        <PanelList>
          {[1, 2].map((n) => (
            <li key={n} className={`flex items-center ${PANEL_ROW}`}>
              <PanelRowText title={n === 1 ? "Spring turn-on" : "Fall blowout and winterization for a very long customer note"} detail="Thu, Nov 19" />
              <PanelRowEnd>
                <JobPill job={job} />
              </PanelRowEnd>
            </li>
          ))}
        </PanelList>
      </section>
    </div>
  ),
}

export const Phone: Story = { ...Default, globals: { viewport: { value: "phone", isRotated: false } } }
export const Empty: Story = { render: () => <PanelFacts rows={[]} /> }
