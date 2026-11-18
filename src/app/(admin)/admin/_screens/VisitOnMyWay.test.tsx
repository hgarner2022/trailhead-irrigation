import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { OnMyWay } from "./VisitOnMyWay"

const visit = (snapshot as unknown as AdminData & { visits?: Visit[] }).visits?.[0] ?? ({ id: "v1" } as Visit)

describe("OnMyWay", () => {
  it("speaks to the person pressing it: you can send one per visit per day", () => {
    render(<OnMyWay visit={visit} />)
    expect(screen.getByText("Texts the customer that you are coming. You can send one per visit per day.")).toBeInTheDocument()
  })
})
