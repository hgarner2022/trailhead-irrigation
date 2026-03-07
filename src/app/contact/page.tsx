"use client"

import { PageBanner } from "@/components/sections/PageBanner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Phone, Mail, MapPin, Clock } from "lucide-react"
import { useState } from "react"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  return (
    <>
      <PageBanner
        title="Contact Us"
        description="Get a free quote or schedule service. We'd love to hear from you."
      />

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Send Us a Message
              </h2>
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
                      Message Sent!
                    </p>
                    <p className="text-muted-foreground">
                      We&apos;ll get back to you as soon as possible.
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
                      <option value="Irrigation System Installation">
                        Irrigation System Installation
                      </option>
                      <option value="Repair & Maintenance">Repair & Maintenance</option>
                      <option value="Winterization">Winterization</option>
                      <option value="Spring Activation">Spring Activation</option>
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
                  <Button type="submit" size="lg">
                    Send Message
                  </Button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6">
                <h2 className="text-2xl font-bold text-foreground">
                  Get In Touch
                </h2>
                <div className="flex flex-col gap-4">
                  <ContactItem
                    icon={Phone}
                    label="Phone"
                    href="tel:9706927270"
                  >
                    (970) 692-7270
                  </ContactItem>
                  <ContactItem
                    icon={Mail}
                    label="Email"
                    href="mailto:rpgarner22@gmail.com"
                  >
                    rpgarner22@gmail.com
                  </ContactItem>
                  <ContactItem icon={MapPin} label="Service Area">
                    Weld County, Erie & Longmont, CO
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
                <div className="relative aspect-square rounded-xl overflow-hidden border border-border">
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
