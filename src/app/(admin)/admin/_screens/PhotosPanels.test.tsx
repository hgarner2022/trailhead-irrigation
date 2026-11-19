import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import type { AdminData } from "@/lib/admin/types"
import type { PhotoItem } from "@/lib/photos/types"
import type { PhotoActions } from "./action-types"
import type { JobActions } from "./job-actions-types"
import { JobsScreen } from "./JobsScreen"
import { jobsData, JOBS_TODAY } from "./jobs-fixture"
import { VisitsScreen } from "./list-fixture"
import type { VisitActions } from "./visit-actions-types"
import { VISITS_TODAY, visitsData } from "./visits-fixture"

// The Photos block in the visit panel and the job panel: the visit's photos under its facts and before Notes and history, Add photo behind the
// panel's `photos.add`, the box behind `photos.show`, a tech with no box, the job panel's groups by visit, and "2 photos added" in the Done step's second beat.

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const photo = (n: number, visitId: string, over: Partial<PhotoItem> = {}): PhotoItem => ({
  id: `photo_${n}`, visitId, jobId: "job-e", customerId: "c-joe", url: `/api/photos/photo_${n}`, contentType: "image/jpeg", bytes: 1000,
  addedBy: "ryan@example.com", addedByName: "Ryan Garner", byCustomer: false, shownToCustomer: false, canRemove: true, createdAt: "2026-11-09T17:00:00Z", ...over,
})
const dataWith = (base: AdminData, photos: PhotoItem[] | undefined, configured?: boolean): AdminData => ({ ...base, ...(photos ? { photos } : {}), ...(configured === undefined ? {} : { photosConfigured: configured }) })

const ok = { ok: true as const, data: undefined }
const photoActions = (over: Partial<PhotoActions> = {}): PhotoActions => ({
  add: vi.fn().mockResolvedValue({ ok: true, data: photo(90, "office-paid") }),
  show: vi.fn().mockResolvedValue({ ok: true, data: photo(1, "office-paid", { shownToCustomer: true }) }),
  remove: vi.fn().mockResolvedValue(ok),
  ...over,
})
const visitActions = (photos?: PhotoActions): VisitActions =>
  ({ move: vi.fn(), confirmDay: vi.fn(), putBack: vi.fn(), markDone: vi.fn(), undoDone: vi.fn(), chargeCard: vi.fn(), recordPayment: vi.fn(), refundPayment: vi.fn(), sendBill: vi.fn(), remindBill: vi.fn(), markNotDone: vi.fn(), edit: vi.fn(), addNote: vi.fn(), cancel: vi.fn(), updateProperty: vi.fn(), sendText: vi.fn(), sendOnTheWay: vi.fn(), resendConfirmation: vi.fn(), sendCardUpdateLink: vi.fn(), createVisit: vi.fn(), sellPass: vi.fn(), ...(photos ? { photos } : {}) }) as unknown as VisitActions

const renderVisit = (data: AdminData, visitId: string, actions?: VisitActions, readOnly = false) =>
  render(
    <UndoToastProvider>
      <VisitsScreen data={data} today={VISITS_TODAY} defaultVisitId={visitId} readOnly={readOnly} actions={actions} />
    </UndoToastProvider>,
  )
const panel = () => within(screen.getByRole("dialog"))

describe("the visit panel's Photos", () => {
  it("shows the visit's photos under its facts and before Notes and history, and only that visit's", () => {
    renderVisit(dataWith(visitsData, [photo(1, "office-paid"), photo(2, "office-paid"), photo(3, "office-owed")]), "office-paid", visitActions(photoActions()))
    const headings = panel().getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    expect(headings.indexOf("Photos")).toBeGreaterThan(headings.indexOf("At the property"))
    expect(headings.indexOf("Photos")).toBeLessThan(headings.indexOf("Notes and history") === -1 ? 99 : headings.indexOf("Notes and history"))
    expect(document.querySelectorAll('[data-slot="photo"]')).toHaveLength(2)
  })

  it("has no Photos section when the data carries none (the catalog's fixtures)", () => {
    renderVisit(dataWith(visitsData, undefined), "office-paid", visitActions())
    expect(panel().queryByRole("heading", { name: "Photos" })).toBeNull()
  })

  it("says photos are not set up while the store has no token, and offers no Add", () => {
    renderVisit(dataWith(visitsData, [], false), "office-paid", visitActions(photoActions()))
    expect(panel().getByText("Photos are not set up yet.")).toBeInTheDocument()
    expect(panel().queryByRole("button", { name: "Add photo" })).toBeNull()
  })

  it("turns Show to customer on through the panel's action", async () => {
    const photos = photoActions()
    renderVisit(dataWith(visitsData, [photo(1, "office-paid")]), "office-paid", visitActions(photos))
    await userEvent.click(panel().getByRole("checkbox", { name: "Show to customer" }))
    await waitFor(() => expect(photos.show).toHaveBeenCalledWith("photo_1", true))
  })

  it("adds a file through the panel: the upload first, then photos.add with the key the store answered", async () => {
    const photos = photoActions()
    const upload = await import("@/lib/photos/upload")
    const sent = vi.spyOn(upload, "addPhotoFlow").mockImplementation(async (_file, opts) => {
      const out = await opts.confirm(opts.visitId, `photos/${opts.visitId}/pic-1.jpg`)
      return out
    })
    renderVisit(dataWith(visitsData, []), "office-paid", visitActions(photos))
    fireEvent.change(panel().getByLabelText("Choose photos"), { target: { files: [new File(["x"], "pic.jpg", { type: "image/jpeg" })] } })
    await waitFor(() => expect(photos.add).toHaveBeenCalledWith("office-paid", "photos/office-paid/pic-1.jpg"))
    expect(sent).toHaveBeenCalled()
    await waitFor(() => expect(document.querySelectorAll('[data-slot="photo"]')).toHaveLength(1))
    sent.mockRestore()
  })

  it("lets a tech see the photos and add one, with no Show to customer box", () => {
    renderVisit(dataWith(visitsData, [photo(1, "office-paid")]), "office-paid", visitActions(photoActions()), true)
    expect(document.querySelectorAll('[data-slot="photo"]')).toHaveLength(1)
    expect(panel().queryByRole("checkbox")).toBeNull()
    expect(panel().getByRole("button", { name: "Add photo" })).toBeInTheDocument()
  })

  it("reads \"2 photos added\" in the Done step's second beat when staff added two, and nothing when none", async () => {
    const { unmount } = renderVisit(dataWith(visitsData, [photo(1, "office-owed"), photo(2, "office-owed"), photo(3, "office-owed", { addedBy: "customer", byCustomer: true })]), "office-owed", visitActions(photoActions()))
    await userEvent.click(panel().getByRole("button", { name: /^Collect/ }))
    expect(await screen.findByText("2 photos added")).toBeInTheDocument()
    unmount()
    renderVisit(dataWith(visitsData, []), "office-owed", visitActions(photoActions()))
    await userEvent.click(panel().getByRole("button", { name: /^Collect/ }))
    await screen.findByRole("heading", { name: "How is this paid?" })
    expect(document.querySelector('[data-slot="photos-added"]')).toBeNull()
  })
})

describe("the job panel's Photos", () => {
  const jobActions = (photos?: PhotoActions): JobActions => ({ addLine: vi.fn(), updateLine: vi.fn(), cancelLine: vi.fn(), recordPayment: vi.fn(), addVisit: vi.fn(), cancelJob: vi.fn(), addNote: vi.fn(), ...(photos ? { photos } : {}) }) as unknown as JobActions
  const view = (data: AdminData, actions?: JobActions, readOnly = false) =>
    render(
      <UndoToastProvider>
        <JobsScreen data={data} today={JOBS_TODAY} defaultJobId="job-e" readOnly={readOnly} actions={actions} />
      </UndoToastProvider>,
    )

  it("shows the photos of the job's visits, grouped by visit, under one heading, with no Add photo", () => {
    view(dataWith(jobsData, [photo(1, "office-paid"), photo(2, "office-paid")]), jobActions(photoActions()))
    const section = panel().getByRole("heading", { name: "Photos" }).closest("section")!
    expect(within(section).getByText(/Repair/)).toBeInTheDocument()
    expect(section.querySelectorAll('[data-slot="photo"]')).toHaveLength(2)
    expect(within(section).queryByRole("button", { name: "Add photo" })).toBeNull()
  })

  it("has no Photos section for a job whose visits have none", () => {
    view(dataWith(jobsData, []), jobActions(photoActions()))
    expect(panel().queryByRole("heading", { name: "Photos" })).toBeNull()
  })

  it("lets a manager turn a photo on for the customer and a tech only look", async () => {
    const photos = photoActions()
    const { unmount } = view(dataWith(jobsData, [photo(1, "office-paid")]), jobActions(photos))
    await userEvent.click(panel().getByRole("checkbox", { name: "Show to customer" }))
    await waitFor(() => expect(photos.show).toHaveBeenCalledWith("photo_1", true))
    unmount()
    view(dataWith(jobsData, [photo(1, "office-paid")]), jobActions(photos), true)
    expect(panel().queryByRole("checkbox")).toBeNull()
  })
})
