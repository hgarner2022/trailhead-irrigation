import type { Metadata } from "next"
import { SignInCard } from "@/components/blocks/SignInCard"

export const metadata: Metadata = { title: "Check your email" }

export default async function SignInSentPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams
  return <SignInCard audience="admin" state="sent" email={email} retryHref="/admin/sign-in" />
}
