import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// The sign-in card for /admin/sign-in and /account/sign-in (docs/DESIGN.md,
// app surfaces): the badge, the title in the display face, one email field,
// one button and an error line. No marketing furniture, nothing from
// src/components/sections. `sent` swaps the form for the "check your email"
// note; `denied` keeps the form and says why. Pure render, server component:
// the page passes the server action.

export type SignInAudience = "admin" | "customer"
export type SignInState = "form" | "sent" | "denied" | "failed"

export interface SignInCardProps {
  audience: SignInAudience
  state?: SignInState
  /** prefilled in the field, and named in the sent note */
  email?: string
  /** the server action behind the button; without one the form does not submit */
  action?: (formData: FormData) => void | Promise<void>
  /** where "Use a different email" goes in the sent state */
  retryHref?: string
  className?: string
}

const FAILED = "We could not send the link. Try again in a minute."

const COPY = {
  admin: {
    title: "Admin sign in",
    lead: "Enter your work email and we will send you a link.",
    denied: "That email is not on the admin list. Ask Hannah or Ryan to add it.",
  },
  customer: {
    title: "Sign in to your pass",
    lead: "Enter the email you bought your Season Pass with and we will send you a link.",
    denied: "We can't find a pass under that email. Try the one you bought it with, or call us.",
  },
} as const

export function SignInCard({ audience, state = "form", email = "", action, retryHref, className }: SignInCardProps) {
  const copy = COPY[audience]
  const sent = state === "sent"
  const error = state === "denied" ? copy.denied : state === "failed" ? FAILED : null
  return (
    <main className={cn("flex min-h-dvh items-center justify-center px-4 py-10", className)}>
      <Card data-slot="sign-in-card" data-audience={audience} data-state={state} className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-12 w-auto self-start" />
          {sent ? (
            <div className="flex flex-col gap-3" role="status">
              <h1 className="font-display text-3xl font-semibold text-navy">Check your email</h1>
              <p className="text-sm text-foreground">
                We sent a sign-in link to {email ? <strong className="break-all font-semibold">{email}</strong> : "your email"}.
              </p>
              <p className="text-sm text-muted-foreground">It works once and for ten minutes.</p>
              {retryHref && (
                <a href={retryHref} className="text-sm font-medium text-primary-dark underline-offset-4 hover:underline">
                  Use a different email
                </a>
              )}
            </div>
          ) : (
            <form action={action} onSubmit={action ? undefined : (e) => e.preventDefault()} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-3xl font-semibold text-navy">{copy.title}</h1>
                <p className="text-sm text-muted-foreground">{copy.lead}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sign-in-email">Email</Label>
                <Input
                  id="sign-in-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  defaultValue={email}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "sign-in-error" : undefined}
                />
                {error && (
                  <p id="sign-in-error" role="alert" data-slot="sign-in-error" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <Button type="submit" size="lg" className="w-full">
                Email me a link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
