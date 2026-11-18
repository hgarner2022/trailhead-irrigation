import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { JobRow } from "./JobRow"

const props = { href: "/account/jobs/job_1", name: "Season Pass 2027", soldOn: "2026-11-03", visitsLine: "2 visits", total: 240 }
const inList = (ui: React.ReactElement) => render(<ul>{ui}</ul>)

describe("JobRow", () => {
  it("links the whole row to the job and shows what it came to and the money word", () => {
    inList(<JobRow {...props} money={{ tone: "paid", label: "Paid" }} />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/account/jobs/job_1")
    expect(screen.getByText("Sold November 3, 2026 · 2 visits")).toBeInTheDocument()
    expect(screen.getByText("$240")).toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
  })

  it("shows the money words as the customer reads them", () => {
    inList(<JobRow {...props} money={{ tone: "past-due", label: "Past due since Dec 1" }} />)
    expect(screen.getByText("Past due since Dec 1")).toBeInTheDocument()
  })

  it("reads Canceled in place of the money for a canceled job", () => {
    inList(<JobRow {...props} total={0} money={{ tone: "none", label: "" }} canceled />)
    expect(screen.getByText("Canceled")).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).toBeNull()
  })
})
