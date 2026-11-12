import { describe, it, expect } from "vitest"
import { relativeTime } from "./needs-attention-time"

const now = "2026-11-12T18:00:00Z"

describe("relativeTime", () => {
  it("says just now under a minute", () => {
    expect(relativeTime("2026-11-12T17:59:30Z", now)).toBe("just now")
    expect(relativeTime(now, now)).toBe("just now")
  })

  it("counts minutes under an hour", () => {
    expect(relativeTime("2026-11-12T17:59:00Z", now)).toBe("1 minute ago")
    expect(relativeTime("2026-11-12T17:15:00Z", now)).toBe("45 minutes ago")
  })

  it("counts hours under a day", () => {
    expect(relativeTime("2026-11-12T17:00:00Z", now)).toBe("1 hour ago")
    expect(relativeTime("2026-11-12T15:04:00Z", now)).toBe("2 hours ago")
    expect(relativeTime("2026-11-11T18:30:00Z", now)).toBe("23 hours ago")
  })

  it("counts days from a day on", () => {
    expect(relativeTime("2026-11-11T18:00:00Z", now)).toBe("1 day ago")
    expect(relativeTime("2026-11-10T15:04:00Z", now)).toBe("2 days ago")
    expect(relativeTime("2026-10-01T00:00:00Z", now)).toBe("42 days ago")
  })

  it("treats a time in the future as just now", () => {
    expect(relativeTime("2026-11-12T18:05:00Z", now)).toBe("just now")
  })
})
