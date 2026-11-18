import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { AccountNav } from "@/components/blocks/AccountNav"
import type { Pass } from "@/lib/admin/types"
import { andrea as andreaCustomer, dana as danaCustomer, invoicedJob, partPaidJob, passJob, pastDueJob, repairJob, TODAY } from "./account-fixtures"
import { DetailsScreen } from "./DetailsScreen"
import { HomeScreen } from "./HomeScreen"
import { JobScreen } from "./JobScreen"
import { JobsScreen } from "./JobsScreen"
import { ReceiptScreen } from "./ReceiptScreen"
import { VisitsScreen } from "./VisitsScreen"

// Every account screen at 375 and 1280, on fixtures: Home (next visit, no visit, invoice sent, past due, no pass), Visits, Jobs, a job (paid, part paid,
// invoice out, a Season Pass), Details, the receipt, and Change my day in its states (success runs live in the story; cut-off passed and nothing open
// are the NextVisitCard and ChangeMyDay states). The pass is passes[0] of the pass stories' snapshot, with a 2027 season.
const pass = snapshot.passes[0] as Pass
const days = { v1: ["2027-04-27", "2027-04-29", "2027-05-04"], v2: ["2027-10-05", "2027-10-07", "2027-10-12"] }
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const onChangeDay = fn(async () => ({ ok: true as const }))

const meta = {
  title: "Screens/Account",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, { args }) => (
      <div className="min-h-svh bg-cream">
        <AccountNav firstName={(args as { hasPass?: boolean }).hasPass === false ? "Dana" : "Andrea"} hasPass={(args as { hasPass?: boolean }).hasPass !== false} current="/account" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta
export default meta
type Story = StoryObj

const home = { render: () => <HomeScreen jobs={[passJob, repairJob]} today={TODAY} pass={pass} days={days} onChangeDay={onChangeDay} /> }
export const HomePhone: Story = { ...phone, ...home }
export const HomeLaptop: Story = { ...laptop, ...home }
/** The booked day is within two days: Change my day becomes the phone number. */
export const HomeCallRyanPhone: Story = { ...phone, render: () => <HomeScreen jobs={[passJob, repairJob]} today="2027-04-27" pass={pass} onChangeDay={onChangeDay} /> }
export const HomeInvoiceSentPhone: Story = { ...phone, render: () => <HomeScreen jobs={[passJob, invoicedJob, repairJob]} today={TODAY} pass={pass} days={days} onChangeDay={onChangeDay} /> }
export const HomeInvoiceSentLaptop: Story = { ...laptop, render: () => <HomeScreen jobs={[passJob, invoicedJob, repairJob]} today={TODAY} pass={pass} days={days} onChangeDay={onChangeDay} /> }
export const HomePastDueLaptop: Story = { ...laptop, render: () => <HomeScreen jobs={[pastDueJob, repairJob]} today={TODAY} onChangeDay={onChangeDay} /> }
/** A customer with one-off jobs and no pass: no pass card, nothing booked. */
export const HomeNoPassNoVisitPhone: Story = { ...phone, args: { hasPass: false }, render: () => <HomeScreen jobs={[repairJob]} today={TODAY} /> }
export const HomeNoPassNoVisitLaptop: Story = { ...laptop, args: { hasPass: false }, render: () => <HomeScreen jobs={[repairJob]} today={TODAY} /> }
export const HomeNoJobsPhone: Story = { ...phone, args: { hasPass: false }, render: () => <HomeScreen jobs={[]} today={TODAY} /> }

const visits = { render: () => <VisitsScreen jobs={[passJob, repairJob, invoicedJob]} today={TODAY} days={days} onChangeDay={onChangeDay} /> }
export const VisitsPhone: Story = { ...phone, ...visits }
export const VisitsLaptop: Story = { ...laptop, ...visits }
/** Every offered day taken: the row says so and gives the phone number. */
export const VisitsNothingOpenPhone: Story = { ...phone, render: () => <VisitsScreen jobs={[passJob]} today={TODAY} days={{ v1: [], v2: [] }} onChangeDay={onChangeDay} /> }
export const VisitsEmptyPhone: Story = { ...phone, args: { hasPass: false }, render: () => <VisitsScreen jobs={[]} today={TODAY} /> }

const jobs = { render: () => <JobsScreen jobs={[invoicedJob, passJob, partPaidJob, repairJob, { ...repairJob, id: "job_c", canceled: true, stage: "cancelled", name: "Installation", total: 0, soldOn: "2025-06-04" }]} /> }
export const JobsPhone: Story = { ...phone, ...jobs }
export const JobsLaptop: Story = { ...laptop, ...jobs }
export const JobsEmptyPhone: Story = { ...phone, args: { hasPass: false }, render: () => <JobsScreen jobs={[]} /> }

export const JobPaidPhone: Story = { ...phone, render: () => <JobScreen job={repairJob} today={TODAY} /> }
export const JobPaidLaptop: Story = { ...laptop, render: () => <JobScreen job={repairJob} today={TODAY} /> }
export const JobPartPaidPhone: Story = { ...phone, render: () => <JobScreen job={partPaidJob} today={TODAY} /> }
export const JobPartPaidLaptop: Story = { ...laptop, render: () => <JobScreen job={partPaidJob} today={TODAY} /> }
export const JobInvoiceOutPhone: Story = { ...phone, render: () => <JobScreen job={invoicedJob} today={TODAY} /> }
export const JobInvoiceOutLaptop: Story = { ...laptop, render: () => <JobScreen job={invoicedJob} today={TODAY} /> }
export const JobSeasonPassPhone: Story = { ...phone, render: () => <JobScreen job={passJob} today={TODAY} pass={pass} days={days} onChangeDay={onChangeDay} /> }
export const JobSeasonPassLaptop: Story = { ...laptop, render: () => <JobScreen job={passJob} today={TODAY} pass={pass} days={days} onChangeDay={onChangeDay} /> }

export const DetailsPhone: Story = { ...phone, render: () => <DetailsScreen customer={andreaCustomer} /> }
export const DetailsLaptop: Story = { ...laptop, render: () => <DetailsScreen customer={andreaCustomer} /> }
export const DetailsNoCardPhone: Story = { ...phone, args: { hasPass: false }, render: () => <DetailsScreen customer={danaCustomer} /> }

const receipt = { id: "pay_2", business: { name: "Trailhead Lawn & Irrigation LLC", phone: "(970) 692-7270" }, customerName: "Andrea Lopez", address: "412 Briggs Street", jobName: "Repair", lines: [{ name: "Repair", quantity: 1, unitPrice: 145 }], amount: 80, method: "check" as const, reference: "1043", paidOn: "2027-02-12", receiptUrl: null }
export const ReceiptPhone: Story = { ...phone, render: () => <ReceiptScreen receipt={receipt} /> }
export const ReceiptLaptop: Story = { ...laptop, render: () => <ReceiptScreen receipt={receipt} /> }
