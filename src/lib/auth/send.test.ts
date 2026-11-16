import { describe, expect, it, vi } from "vitest"
import { makeSendVerificationRequest } from "./send"

describe("sendVerificationRequest", () => {
  it("sends the sign-in email to the address through the injected sender", async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    await makeSendVerificationRequest(send)({ identifier: "a@b.com", url: "https://www.example.com/cb?token=x" })
    expect(send).toHaveBeenCalledOnce()
    const message = send.mock.calls[0]![0]
    expect(message.to).toBe("a@b.com")
    // the link in the email is the confirm page carrying the callback, never the callback itself
    expect(message.text).toContain("https://www.example.com/sign-in/confirm?to=%2Fcb%3Ftoken%3Dx")
    expect(message.text).not.toContain("https://www.example.com/cb?token=x")
    expect(message.text).toContain("The link works one time and expires in 10 minutes.")
  })
})
