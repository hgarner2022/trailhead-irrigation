import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { visitJob } from "@/lib/admin/jobs"
import type { Visit } from "@/lib/admin/types"
import { RecordFooter } from "./RecordFooter"
import { RecordList, RecordPanel, RecordRowEnd, RecordRowText, RECORD_ROW } from "./RecordPanel"
import { SectionHeading } from "./SectionHeading"
import { StatusPills } from "./StatusPill"

// A record panel the way the three panels write it: the header with its pills, the facts, two sections, the footer. The rows show
// that a pill never runs past the edge.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const visit = { id: "v", clientId: "c", clientName: "Dana", town: "Erie", kind: "turn-on", status: "scheduled", isPass: true, jobberUrl: "", scheduledOn: "2026-11-19" } as Visit
const job = visitJob(visit, "2026-11-12", "America/Denver")
const noop = () => {}

const meta = {
  title: "Blocks/RecordPanel",
  component: RecordPanel,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onOpenChange: noop,
    title: "Andrea Reyes",
    subtitle: "Spring turn-on, Tue Apr 28",
    pills: <StatusPills job={job} />,
    facts: [["When", "Tue Apr 28, any time"], ["Who", "Ryan Garner"], ["Price", "$145"]],
    footer: <RecordFooter primary={{ label: "Mark done", onClick: noop }} secondary={[{ label: "Move", onClick: noop }]} more={[{ label: "Edit", onClick: noop }]} destructive={{ label: "Cancel visit", onClick: noop }} />,
    children: (
      <>
        <section aria-labelledby="rp-property">
          <SectionHeading id="rp-property" action={<a href="#edit" className="text-primary-dark underline underline-offset-2">Edit</a>}>
            At the property
          </SectionHeading>
          <p className="mt-2 text-sm">1450 Main St, Erie. Gate code 4410.</p>
        </section>
        <section aria-labelledby="rp-visits">
          <SectionHeading id="rp-visits">Visits</SectionHeading>
          <RecordList>
            {[1, 2].map((n) => (
              <li key={n} className={`flex items-center ${RECORD_ROW}`}>
                <RecordRowText title={n === 1 ? "Spring turn-on" : "Fall blowout and winterization for a very long customer note"} detail="Thu, Nov 19" />
                <RecordRowEnd>
                  <StatusPills job={job} />
                </RecordRowEnd>
              </li>
            ))}
          </RecordList>
        </section>
      </>
    ),
  },
  globals: LAPTOP,
} satisfies Meta<typeof RecordPanel>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** A record with nothing but a name: no facts, no sections, no footer (a tech who may only read). */
export const Empty: Story = { args: { subtitle: undefined, pills: undefined, facts: undefined, footer: undefined, children: undefined } }

export const Phone: Story = { globals: PHONE }
