import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Visit } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { TextsPausedProvider } from "./texts-paused"
import { TextDialog } from "./VisitEditText"
import { OnMyWay } from "./VisitOnMyWay"

const both = { id: "c1", phone: "+13035550142", email: "andrea@example.com" }

const paused = (ui: React.ReactElement) => render(<TextsPausedProvider value>{ui}</TextsPausedProvider>)

describe("Send a text while texts are off the pause", () => {
  it("says it goes by text and sends the words", async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true })
    render(<TextDialog client={both} actions={{ sendText } as unknown as VisitActions} open onOpenChange={() => {}} />)
    expect(screen.getByText(/Goes by text to/)).toBeInTheDocument()
    await userEvent.type(screen.getByRole("textbox"), "Late")
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Send text" }))
    expect(sendText).toHaveBeenCalledWith("c1", undefined, "Late")
  })
})

describe("Send a text while texts are paused", () => {
  it("says where the email goes and sends it through the same action", async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true })
    paused(<TextDialog client={both} actions={{ sendText } as unknown as VisitActions} open onOpenChange={() => {}} />)
    expect(screen.getByText("Texts are paused. This goes by email to andrea@example.com.")).toBeInTheDocument()
    await userEvent.type(screen.getByRole("textbox"), "Late")
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Send email" }))
    expect(sendText).toHaveBeenCalledWith("c1", undefined, "Late")
  })

  it("sends by email to a customer with no mobile", async () => {
    paused(<TextDialog client={{ id: "c1", email: "andrea@example.com" }} open onOpenChange={() => {}} />)
    await userEvent.type(screen.getByRole("textbox"), "Late")
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Send email" })).toBeEnabled()
  })

  it("is disabled, with the reason, when the customer has no email", async () => {
    paused(<TextDialog client={{ id: "c1", phone: "+13035550142" }} open onOpenChange={() => {}} />)
    expect(screen.getByText("Texts are paused and this customer has no email.")).toBeInTheDocument()
    await userEvent.type(screen.getByRole("textbox"), "Late")
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Send email" })).toBeDisabled()
  })

  it("says on my way goes by email", () => {
    paused(<OnMyWay visit={{ id: "v1" } as Visit} open onOpenChange={() => {}} />)
    expect(screen.getByText(/Texts are paused\. This goes by email/)).toBeInTheDocument()
  })
})
