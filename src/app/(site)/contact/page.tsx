"use client"

import { PageBanner } from "@/components/sections/PageBanner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Phone, Mail, MapPin, Clock } from "lucide-react"
import { useState } from "react"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { PHONE_TEL } from "@/lib/nav"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Contact", url: `${siteConfig.url}/contact` },
            ])
          ),
        }}
      />
      <PageBanner
        title="Contact Us"
        description="Tell us what the yard needs. Call (970) 692-7270 or use the form."
      />

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Form */}
            <div>
              <SectionHeader title="Send us a message" align="left" className="mb-6" />
              {submitted ? (
                <Card className="p-8">
                  <CardContent className="p-0 text-center flex flex-col gap-4 items-center">
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                      <svg
                        className="h-6 w-6 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      Message sent.
                    </p>
                    <p className="text-muted-foreground">
                      We&apos;ll call or email you back. If it&apos;s urgent, call (970) 692-7270.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <form
                  className="flex flex-col gap-5"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setError("")
                    const form = e.currentTarget
                    const data = new FormData(form)
                    try {
                      const res = await fetch("/api/contact", {
                        method: "POST",
                        body: data,
                      })
                      if (res.ok) {
                        setSubmitted(true)
                        // GA4 conversion event
                        if (
                          typeof window !== "undefined" &&
                          // @ts-expect-error gtag injected globally
                          typeof window.gtag === "function"
                        ) {
                          // @ts-expect-error gtag injected globally
                          window.gtag("event", "contact_form_submit", {
                            service_requested: data.get("service") ?? "",
                            page_path: window.location.pathname,
                          })
                        }
                      } else {
                        setError("Something went wrong. Please try calling us instead.")
                      }
                    } catch {
                      setError("Something went wrong. Please try calling us instead.")
                    }
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input name="name" label="Name" placeholder="Your name" required />
                    <Input
                      name="phone"
                      label="Phone"
                      type="tel"
                      placeholder="(970) 555-0123"
                      required
                    />
                  </div>
                  <Input
                    name="email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                  <Input
                    name="address"
                    label="Address"
                    placeholder="Service location address"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="service"
                      className="text-sm font-medium text-foreground"
                    >
                      Service Needed
                    </label>
                    <select
                      id="service"
                      name="service"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      required
                    >
                      <option value="">Select a service...</option>
                      <option value="Full Irrigation Installs">
                        Full Irrigation Installs
                      </option>
                      <option value="Season Pass (3 visits)">Season Pass (3 visits)</option>
                      <option value="Repair">Repair</option>
                      <option value="Winterization">Winterization</option>
                      <option value="Spring Activation and System Check">Spring Activation and System Check</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <Textarea
                    name="message"
                    label="Message"
                    placeholder="Tell us about your project or issue..."
                    rows={5}
                  />
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By submitting this form, you agree to our{" "}
                    <a href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </a>{" "}
                    and{" "}
                    <a href="/terms" className="text-primary hover:underline">
                      Terms &amp; Conditions
                    </a>
                    , and consent to receive scheduling and service-related
                    text messages and emails from Trailhead Lawn &amp;
                    Irrigation about your inquiry. Message and data rates may
                    apply. Reply STOP at any time to opt out.
                  </p>
                  <Button type="submit" size="lg">
                    Send Message
                  </Button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6">
                <SectionHeader title="Get in touch" align="left" />
                <div className="flex flex-col gap-4">
                  <ContactItem
                    icon={Phone}
                    label="Phone"
                    href={PHONE_TEL}
                  >
                    (970) 692-7270
                  </ContactItem>
                  <ContactItem
                    icon={Mail}
                    label="Email"
                    href="mailto:ryan@trailheadirrigation.com"
                  >
                    ryan@trailheadirrigation.com
                  </ContactItem>
                  <ContactItem icon={MapPin} label="Service Area">
                    Erie, Longmont, Louisville, Lafayette, Firestone, Broomfield &amp; Weld County, CO
                  </ContactItem>
                  <ContactItem icon={Clock} label="Hours">
                    Mon&ndash;Fri: 7:00 AM &ndash; 6:00 PM
                  </ContactItem>
                </div>
              </div>

              {/* Service Area Map */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Service Area
                </h3>
                <div className="relative aspect-square rounded-lg overflow-hidden border border-border">
                  <Image
                    src="/images/service-area.png"
                    alt="Service area map"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Erie accent image */}
      <section className="relative h-72 md:h-96">
        <Image
          src="/images/erie.jpg"
          alt="Erie, Colorado"
          fill
          className="object-cover object-[center_70%]"
        />
        <div className="absolute inset-0 bg-navy/40" />
      </section>
    </>
  )
}

function ContactItem({
  icon: Icon,
  label,
  href,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  children: React.ReactNode
}) {
  const content = (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-foreground font-medium">{children}</p>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </a>
    )
  }
  return content
}
