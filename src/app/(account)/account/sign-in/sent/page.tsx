import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { signIn } from "@/auth"
import { SignInCard } from "@/components/blocks/SignInCard"
import { requestSignIn } from "@/lib/auth/sign-in-action"

export const metadata: Metadata = { title: "Check your email" }

export default async function SignInSentPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams

  // "Send it again": the same address asks for a fresh link and lands here again (or on the form with the reason when it could not be sent).
  async function resend(formData: FormData) {
    "use server"
    redirect(await requestSignIn("/account", formData, signIn))
  }

  return <SignInCard audience="customer" state="sent" email={email} retryHref="/account/sign-in" resendAction={resend} />
}
