import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { ZipCheck } from "./ZipCheck"

function Held({ attempted }: { attempted?: boolean }) {
  const [zip, setZip] = useState("")
  return <ZipCheck value={zip} onChange={setZip} attempted={attempted} />
}

describe("ZipCheck", () => {
  it("keeps only digits, says the town for a zip we serve and gives the way out for one we do not", async () => {
    const user = userEvent.setup()
    render(<Held />)
    const box = screen.getByLabelText("Zip code")
    await user.type(box, "80a516")
    expect(box).toHaveValue("80516")
    expect(screen.getByText("Good news, we work in Erie.")).toBeInTheDocument()
    await user.clear(box)
    await user.type(box, "80302")
    expect(screen.getByText(/We don't serve 80302 yet/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Call \(970\) 692-7270/ })).toHaveAttribute("href", "tel:9706927270")
  })
  it("writes what to add when Continue was pressed with nothing in the box", () => {
    render(<Held attempted />)
    expect(screen.getByRole("alert")).toHaveTextContent("Add your five-digit zip code so we can check we come to you.")
  })
})
