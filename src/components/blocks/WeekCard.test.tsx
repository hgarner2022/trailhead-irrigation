import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { BlowoutWeek } from "@/lib/admin/types"
import { WeekCard } from "./WeekCard"

const week: BlowoutWeek = { season: 2027, weekStart: "2027-10-04", capacity: 20, taken: 2, towns: ["Erie", "Longmont"] }
const full: BlowoutWeek = { ...week, weekStart: "2027-10-11", taken: 20 }

const card = () => document.querySelector<HTMLElement>('[data-slot="week-card"]') as HTMLElement
const number = () => card().querySelector<HTMLElement>('[data-slot="week-spots"]') as HTMLElement

describe("WeekCard", () => {
  it("names the week from its Monday and counts the spots left", () => {
    render(<WeekCard week={week} />)
    expect(screen.getByText("Week of Oct 4")).toBeInTheDocument()
    expect(screen.getByText("Season 2027")).toBeInTheDocument()
    expect(number()).toHaveTextContent("18")
    expect(screen.getByText("spots left")).toBeInTheDocument()
    expect(screen.getByText("2 of 20 taken")).toBeInTheDocument()
    expect(card().tagName).toBe("DIV")
    expect(card()).not.toHaveAttribute("aria-pressed")
  })

  it("lists the towns as chips", () => {
    render(<WeekCard week={week} />)
    const chips = Array.from(card().querySelectorAll('[data-slot="week-town"]')).map((c) => c.textContent)
    expect(chips).toEqual(["Erie", "Longmont"])
  })

  it("marks a full week with a warning number and a Full chip", () => {
    render(<WeekCard week={full} />)
    expect(number()).toHaveTextContent("0")
    expect(number()).toHaveClass("text-warning")
    expect(screen.getByText("Full")).toBeInTheDocument()
    expect(card()).toHaveAttribute("data-full", "true")
  })

  it("keeps the number navy with a spot left", () => {
    render(<WeekCard week={{ ...week, taken: 19 }} />)
    expect(number()).toHaveTextContent("1")
    expect(number()).not.toHaveClass("text-warning")
    expect(screen.queryByText("Full")).not.toBeInTheDocument()
  })

  it("edits the capacity from a numeric input", () => {
    const onCapacityChange = vi.fn()
    render(<WeekCard week={week} editable onCapacityChange={onCapacityChange} />)
    const input = screen.getByRole("spinbutton", { name: "Capacity" })
    expect(input).toHaveValue(20)
    expect(input).toHaveAttribute("min", "0")
    expect(screen.queryByText("2 of 20 taken")).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: "24" } })
    expect(onCapacityChange).toHaveBeenCalledWith(24)
  })

  it("becomes a pressed button when it can be selected", () => {
    const onSelect = vi.fn()
    const { unmount } = render(<WeekCard week={week} selected onSelect={onSelect} />)
    const button = screen.getByRole("button", { pressed: true })
    expect(button).toBe(card())
    expect(button).toHaveAttribute("data-selected", "true")
    expect(button).toHaveClass("ring-2", "ring-primary")
    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledTimes(1)
    unmount()
    render(<WeekCard week={week} onSelect={onSelect} />)
    expect(screen.getByRole("button", { pressed: false })).not.toHaveClass("ring-2")
  })
})
