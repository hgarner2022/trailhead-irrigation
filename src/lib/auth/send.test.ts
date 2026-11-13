import { describe, expect, it, vi } from "vitest"
import { makeSendVerificationRequest } from "./send"

describe("sendVerificationRequest", () => {
  it("sends the sign-in email to the address through the injected sender", async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    await makeSendVerificationRequest(send)({ identifier: "a@b.com", url: "https://www.example.com/cb?token=x" })
    expect(send).toHaveBeenCalledOnce()
    const message = send.mock.calls[0]![0]
    expect(message.to).toBe("a@b.com")
    expect(message.text).toContain("https://www.example.com/cb?token=x")
    expect(message.text).toContain("It works once and for ten minutes.")
  })
})
