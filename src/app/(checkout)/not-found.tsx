import { Header } from "@/components/sections/Header"
import { Footer } from "@/components/sections/Footer"
import NotFound from "../(site)/not-found"

// The checkout's off state (SEASON_PASS_CHECKOUT unset) calls notFound(). This
// group has no marketing chrome of its own, so the same "Page not found" page
// gets the marketing Header and Footer here and the 404 is branded.
export default function CheckoutNotFound() {
  return (
    <>
      <Header />
      <NotFound />
      <Footer />
    </>
  )
}
