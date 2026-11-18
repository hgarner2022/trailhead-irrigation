import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { OnMyWay } from "./VisitOnMyWay"

const visit = (snapshot as unknown as AdminData & { visits?: Visit[] }).visits?.[0] ?? ({ id: "v1" } as Visit)

describe("OnMyWay", () => {
  it("speaks to the person pressing it: you can send one per visit per day", () => {
    render(<OnMyWay visit={visit} open onOpenChange={() => {}} />)
    expect(screen.getByText("Texts the customer that you are coming. You can send one per visit per day.")).toBeInTheDocument()
  })

  it("sends the text from its one button and says the API's words when it is refused", async () => {
    const sendOnTheWay = vi.fn().mockResolvedValue({ ok: false, message: "An on the way text already went today." })
    render(<OnMyWay visit={visit} actions={{ sendOnTheWay } as unknown as VisitActions} open onOpenChange={() => {}} />)
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Send text" }))
    expect(sendOnTheWay).toHaveBeenCalledWith(visit.id)
    expect(await screen.findByRole("alert")).toHaveTextContent("An on the way text already went today.")
  })
})
