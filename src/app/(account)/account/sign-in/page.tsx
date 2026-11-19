import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth, signIn } from "@/auth"
import { SignInCard } from "@/components/blocks/SignInCard"
import { requestSignIn, signedInLanding } from "@/lib/auth/sign-in-action"

export const metadata: Metadata = { title: "Sign in" }

type Params = Promise<{ email?: string; error?: string; next?: string }>

export default async function SignInPage({ searchParams }: { searchParams: Params }) {
  const { email, error, next } = await searchParams

  // Someone who is already signed in has nothing to do here (UX audit row 17): on to the page they were after, else their account.
  if ((await auth())?.principal) redirect(signedInLanding(next))

  async function requestLink(formData: FormData) {
    "use server"
    redirect(await requestSignIn("/account", formData, signIn, next))
  }

  return <SignInCard audience="customer" state={error === "AccessDenied" ? "denied" : error ? "failed" : "form"} email={email} action={requestLink} />
}
