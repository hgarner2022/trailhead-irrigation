import type { GridColumnDef } from "@/components/blocks/data-grid-table"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { StagePill } from "./JobPills"
import type { JobRow } from "./jobs-model"

// The Jobs grid's columns, in the order the filters use too: Customer (the full name, opens the job), Job ("Season Pass
// TH-2027-0007", "Repair", "Installation"), Property (street and town), Sold (the day and how: website, office, site, renewal),
// Status (Needs a quote, Quote sent, Open, Done, Canceled), Visits ("2 of 3 done"), Total, Money (one cell: "$145 · Invoice sent, due
// Dec 1", "$115 unpaid", "Paid") and Next (the next visit's day, Unscheduled or None). The first column's value is the search text
// (name, street, phone, pass number) and its cell shows the name. Money sorts by what is unpaid while its chip filters by state.

export const jobColumns: GridColumnDef<JobRow>[] = [
  { id: "name", accessorFn: (r) => r.search, header: "Customer", cell: ({ row }) => row.original.name, meta: { csv: (r) => (r as JobRow).name } },
  // The chip filters by the service (pass, a catalogue service's key, other) while the cell says what the job is.
  { id: "kind", accessorKey: "service", header: "Job", cell: ({ row }) => row.original.title, meta: { csv: (r) => (r as JobRow).title } },
  { id: "property", accessorKey: "property", header: "Property", cell: ({ getValue }) => (getValue() as string) || null },
  {
    // The Season chip filters by the season; a click on the header sorts by the day it was sold.
    id: "season",
    accessorFn: (r) => String(r.season),
    header: "Sold",
    sortFn: (a, b) => ((a.original as JobRow).soldOn ?? "").localeCompare((b.original as JobRow).soldOn ?? ""),
    cell: ({ row }) => row.original.soldText || null,
    meta: { csv: (r) => (r as JobRow).soldText },
  },
  {
    id: "stage",
    accessorKey: "stage",
    header: "Status",
    cell: ({ row }) => <StagePill stage={row.original.stage} />,
    meta: { csv: (r) => (r as JobRow).stageLabel },
  },
  { id: "visits", accessorKey: "visitsText", header: "Visits", meta: { csv: (r) => (r as JobRow).visitsText } },
  {
    id: "total",
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (row.original.stage === "cancelled" ? null : <MoneyCell end text={row.original.total > 0 ? `$${row.original.total.toLocaleString("en-US")}` : "Quote later"} />),
    meta: { align: "right", csv: (r) => String((r as JobRow).total) },
  },
  {
    id: "money",
    accessorKey: "money",
    header: "Money",
    // The chip filters by the state; a click on the header sorts by what is unpaid.
    sortFn: (a, b) => (a.original as JobRow).owed - (b.original as JobRow).owed,
    cell: ({ row }) => (row.original.moneyText ? <MoneyCell text={row.original.moneyText} tone={row.original.money === "overdue" ? "past-due" : row.original.money === "failed" ? "failed" : "plain"} /> : null),
    meta: { csv: (r) => (r as JobRow).moneyText },
  },
  {
    id: "next",
    accessorFn: (r) => r.nextDay ?? (r.nextText === "Unscheduled" ? "9999" : ""),
    header: "Next",
    sortUndefined: "last",
    cell: ({ row }) => row.original.nextText,
    meta: { csv: (r) => (r as JobRow).nextText },
  },
]

/** Jobs on a phone: the customer, what the job is, where it stands, the next day, and the money word at the right. */
export const jobCard: GridCardSlots = { title: "name", line: ["kind"], state: "stage", when: ["next"], money: "money" }
