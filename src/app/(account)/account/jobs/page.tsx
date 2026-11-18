import { redirect } from "next/navigation"

/** The Jobs list is gone: a customer has visits. The old address goes to the Visits timeline. */
export default function JobsPage(): never {
  redirect("/account/visits")
}
