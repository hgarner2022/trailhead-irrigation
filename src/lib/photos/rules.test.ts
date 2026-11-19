import { describe, expect, it } from "vitest"
import { MAX_PHOTO_BYTES, isPhotoType, photoCount, photoFolder, photoProblem, photoTypeOf, PHOTO_WORDS, safeFileName } from "./rules"

const file = (name: string, type: string, size = 1000) => ({ name, type, size })

describe("photo file rules", () => {
  it("keeps JPEG, PNG, HEIC and WebP under 10 MB", () => {
    for (const [name, type] of [["a.jpg", "image/jpeg"], ["a.png", "image/png"], ["a.heic", "image/heic"], ["a.webp", "image/webp"]] as const) expect(photoProblem(file(name, type))).toBeNull()
    expect(photoProblem(file("a.jpg", "image/jpeg", MAX_PHOTO_BYTES))).toBeNull()
  })
  it("says the photo is over 10 MB by one byte", () => {
    expect(photoProblem(file("a.jpg", "image/jpeg", MAX_PHOTO_BYTES + 1))).toBe(PHOTO_WORDS.tooBig)
  })
  it("refuses a file that is not a photo type", () => {
    expect(photoProblem(file("a.pdf", "application/pdf"))).toBe(PHOTO_WORDS.wrongType)
    expect(photoProblem(file("a.gif", "image/gif"))).toBe(PHOTO_WORDS.wrongType)
    expect(photoProblem(file("noext", ""))).toBe(PHOTO_WORDS.wrongType)
  })
  it("reads a type the browser left empty (HEIC often has none) from the extension", () => {
    expect(photoTypeOf(file("IMG_1.HEIC", ""))).toBe("image/heic")
    expect(photoTypeOf(file("IMG_1.jpeg", "application/octet-stream"))).toBe("image/jpeg")
    expect(photoProblem(file("IMG_1.HEIC", ""))).toBeNull()
  })
  it("knows the types we keep, in any case", () => {
    expect(isPhotoType("IMAGE/JPEG")).toBe(true)
    expect(isPhotoType("text/html")).toBe(false)
  })
  it("counts and names the folder and the file safely", () => {
    expect(photoCount(1)).toBe("1 photo")
    expect(photoCount(2)).toBe("2 photos")
    expect(photoFolder("v1")).toBe("photos/v1/")
    expect(safeFileName("../../my photo (1).jpg")).toBe("my-photo-1-.jpg")
    expect(safeFileName("...")).toBe("photo")
  })
})
