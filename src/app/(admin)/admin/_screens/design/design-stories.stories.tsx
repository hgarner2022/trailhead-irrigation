import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DesignShell } from "./DesignShell"
import { JobsGridDesign, type GridJob } from "./JobsGridDesign"

// D of the job object design (docs/plans/2026-11-19-job-object-design.md): the Jobs grid with its Billing column, at 1280 (Laptop) and 375 (Phone).
// The Invoices page and the invoice page are in InvoicesPage.stories.tsx and the customer's Billing in CustomerPage.stories.tsx. Pure screens over fixtures.

const meta = { title: "Admin/Jobs grid", parameters: { layout: "fullscreen", docs: { description: { component: "The Jobs grid with its Billing column at 1280 and 375, empty and with the filters hiding every row. Open a row for its job page; the whole path is Admin / Walkthrough (clickable)." } } } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const shell = (children: React.ReactNode) => <DesignShell current="jobs">{children}</DesignShell>

const job = (id: string, name: string, service: string, title: string, property: string, stage: GridJob["stage"], visits: string, total: number, billingState: GridJob["billingState"], billing: string, next: string, who: string, season = ""): GridJob =>
  ({ id, name, service, title, property, stage, visits, total, billingState, billing, next, who, season })
const RYAN = "Ryan Garner"
const JOBS: GridJob[] = [
  job("j1", "Reese Holloway", "Fall blowout", "Fall blowout", "51 Shadow Ln, Firestone", "done", "1 of 1 done", 115, "overdue", "Past due since Nov 17", "None", RYAN, "2026"),
  job("j2", "Marcus Bell", "Sprinkler repair", "Sprinkler repair", "91 Main St, Longmont", "done", "1 of 1 done", 145, "bill-sent", "Invoice sent, due Dec 2", "None", RYAN),
  job("j3", "Joe Alvarez", "Sprinkler repair", "Sprinkler repair", "22 Pine St, Louisville", "done", "1 of 1 done", 145, "owed", "$145 unpaid", "None", "Hannah Garner"),
  job("j4", "Andrea Dalton", "Season Pass", "Season Pass TH-2027-0008", "480 Briggs St, Erie", "scheduled", "0 of 2 done", 260, null, "", "Mon, May 3", RYAN, "2027"),
  job("j5", "Sam Ortiz", "Sprinkler repair", "Sprinkler repair", "14 Aspen Dr, Firestone", "today", "0 of 1 done", 145, null, "", "Today", RYAN),
  job("j6", "Dana Cho", "Spring turn-on", "Spring turn-on", "18 Cedar Way, Erie", "done", "1 of 1 done", 145, "paid", "Paid, card", "None", RYAN, "2026"),
  job("j7", "Priya Shah", "Sprinkler repair", "Sprinkler repair", "330 Elm Dr, Lafayette", "done", "1 of 1 done", 145, "paid", "Paid, Venmo", "None", "Hannah Garner"),
  job("j8", "Tom Becker", "New sprinkler system installation", "New sprinkler system installation", "600 Hill Rd, Broomfield", "unscheduled", "0 of 1 done", 0, null, "", "Unscheduled", "No one yet"),
  job("j9", "Lena Park", "Christmas lights", "Christmas lights", "7 Oak Ct, Lafayette", "unscheduled", "0 of 1 done", 600, null, "", "Unscheduled", "No one yet"),
  job("j10", "Greg Olsen", "Core aeration", "Core aeration", "5 Birch Ln, Erie", "cancelled", "0 of 1 done", 95, null, "", "None", "No one yet"),
  job("j12", "Kim Ortega", "Sprinkler repair", "Sprinkler repair", "12 Oak St, Erie", "done", "1 of 1 done", 145, "refunded", "Refunded", "None", RYAN),
  job("j11", "Ana Ruiz", "Sprinkler repair", "Sprinkler repair", "9 Laurel St, Louisville", "late", "0 of 1 done", 145, null, "", "Mon, Nov 16", RYAN),
]

/** Ryan sees every job with a Billing column (Past due, Invoice sent, Unpaid, Paid) and the Job filter listing the services. Open a row for its page. */
export const JobsGrid: Story = { name: "Jobs grid", globals: laptop, render: () => shell(<JobsGridDesign rows={JOBS} />) }
export const JobsGridPhone: Story = { name: "Jobs grid, phone", globals: phone, render: () => shell(<JobsGridDesign rows={JOBS} />) }
/** No jobs yet: the empty state says how to add one. */
export const JobsGridEmpty: Story = { name: "Jobs grid empty", globals: laptop, render: () => shell(<JobsGridDesign rows={[]} />) }
/** The filters hide every row: "No jobs match." with Clear filters. */
export const JobsGridNoMatch: Story = { name: "Jobs grid no match", globals: laptop, render: () => shell(<JobsGridDesign rows={JOBS} defaultFilters={[{ column: "billing", values: ["paid"] }, { column: "service", values: ["Core aeration"] }]} />) }
