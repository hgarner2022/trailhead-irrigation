import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { TEXT_DELAY_SECONDS, useTextingQueue } from "./use-texting-queue"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useTextingQueue", () => {
  it("waits a minute, then commits once, and counts the seconds down", () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const { result } = renderHook(() => useTextingQueue())
    expect(TEXT_DELAY_SECONDS).toBe(60)
    act(() => result.current.add(["Andrea"], commit, cancel))
    expect(result.current.batches).toHaveLength(1)
    expect(result.current.secondsLeft(result.current.batches[0]!)).toBe(60)
    act(() => void vi.advanceTimersByTime(20_000))
    expect(result.current.secondsLeft(result.current.batches[0]!)).toBe(40)
    expect(commit).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(40_000))
    expect(commit).toHaveBeenCalledOnce()
    expect(cancel).not.toHaveBeenCalled()
    expect(result.current.batches).toHaveLength(0)
  })

  it("Undo inside the minute sends nothing and runs the cancel", () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const { result } = renderHook(() => useTextingQueue())
    act(() => result.current.add(["Andrea"], commit, cancel))
    act(() => result.current.undo(result.current.batches[0]!.id))
    act(() => void vi.advanceTimersByTime(120_000))
    expect(cancel).toHaveBeenCalledOnce()
    expect(commit).not.toHaveBeenCalled()
    expect(result.current.batches).toHaveLength(0)
  })

  it("keeps a batch per Place, each with its own minute", () => {
    const a = vi.fn()
    const b = vi.fn()
    const { result } = renderHook(() => useTextingQueue())
    act(() => result.current.add(["Andrea"], a, () => {}))
    act(() => void vi.advanceTimersByTime(30_000))
    act(() => result.current.add(["Jim"], b, () => {}))
    act(() => void vi.advanceTimersByTime(30_000))
    expect(a).toHaveBeenCalledOnce()
    expect(b).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(30_000))
    expect(b).toHaveBeenCalledOnce()
  })

  it("commits at once with no delay, and sends what is waiting when the screen goes away", () => {
    const now = vi.fn()
    const instant = renderHook(() => useTextingQueue(0))
    act(() => instant.result.current.add(["Andrea"], now, () => {}))
    expect(now).toHaveBeenCalledOnce()
    expect(instant.result.current.batches).toHaveLength(0)
    const waiting = vi.fn()
    const held = renderHook(() => useTextingQueue())
    act(() => held.result.current.add(["Jim"], waiting, () => {}))
    held.unmount()
    expect(waiting).toHaveBeenCalledOnce()
  })

  it("has nothing to undo once the minute has fired", () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const { result } = renderHook(() => useTextingQueue())
    act(() => result.current.add(["Andrea"], commit, cancel))
    const id = result.current.batches[0]!.id
    act(() => void vi.advanceTimersByTime(60_000))
    act(() => result.current.undo(id))
    expect(commit).toHaveBeenCalledOnce()
    expect(cancel).not.toHaveBeenCalled()
  })
})
