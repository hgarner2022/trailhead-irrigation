"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Shield,
  Star,
  Check,
  CalendarCheck,
  Percent,
  ArrowRight,
  ChevronDown,
} from "lucide-react"

const ZONE_TIERS = [
  { value: "1-7", label: "1–7 zones", basic: 214, pro: 311 },
  { value: "8-10", label: "8–10 zones", basic: 271, pro: 397 },
  { value: "11-13", label: "11–13 zones", basic: 328, pro: 483 },
  { value: "14-16", label: "14–16 zones", basic: 385, pro: 570 },
]

export function MaintenancePlans() {
  const [selectedTier, setSelectedTier] = useState(ZONE_TIERS[0].value)
  const tier = ZONE_TIERS.find((t) => t.value === selectedTier) ?? ZONE_TIERS[0]

  return (
    <section className="relative bg-navy section-padding-y overflow-hidden">
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative container-padding-x mx-auto max-w-7xl">
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-primary/20 text-primary-light border-primary/30">
            Save with a Plan
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Annual Maintenance Plans
          </h2>
          <p className="mt-3 text-white/70 max-w-2xl mx-auto">
            Lock in your seasonal services at a discounted rate. Priority
            scheduling, guaranteed service dates, and peace of mind all year.
          </p>
        </div>

        {/* Zone selector */}
        <div className="flex justify-center mb-8">
          <div className="relative inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-3 border border-white/10">
            <span className="text-white/80 text-sm font-medium whitespace-nowrap">
              How many zones?
            </span>
            <div className="relative">
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="appearance-none bg-white text-foreground font-semibold text-sm rounded-full pl-4 pr-9 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              >
                {ZONE_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* BASIC PLAN */}
          <Card className="rounded-2xl overflow-hidden border-0 shadow-lg">
            <CardContent className="flex flex-col gap-6 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-navy/10">
                  <Shield className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Basic Plan
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Essential seasonal coverage
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-bold tracking-tight text-foreground transition-all duration-300">
                    ${tier.basic}
                  </span>
                  <span className="text-muted-foreground text-base mb-1">
                    /year
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  For {tier.label}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">
                  What&apos;s included:
                </p>
                <div className="flex flex-col gap-2.5">
                  <PlanFeature>Spring turn-on + system check</PlanFeature>
                  <PlanFeature>Winterization (blowout)</PlanFeature>
                  <PlanFeature icon={<CalendarCheck className="w-4 h-4 text-success" />}>
                    Priority scheduling
                  </PlanFeature>
                  <PlanFeature icon={<Percent className="w-4 h-4 text-success" />}>
                    5% off all services
                  </PlanFeature>
                </div>
              </div>

              <Link
                href="/contact"
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-auto w-full")}
              >
                Get Started
              </Link>
            </CardContent>
          </Card>

          {/* PRO PLAN */}
          <Card className="rounded-2xl overflow-hidden border-0 shadow-lg ring-2 ring-primary">
            <div className="bg-primary text-white text-center py-2.5 text-sm font-semibold tracking-wide">
              Most Popular — Best Value
            </div>
            <CardContent className="flex flex-col gap-6 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Pro Plan
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Complete season coverage
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-bold tracking-tight text-foreground transition-all duration-300">
                    ${tier.pro}
                  </span>
                  <span className="text-muted-foreground text-base mb-1">
                    /year
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  For {tier.label}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">
                  Everything in Basic, plus:
                </p>
                <div className="flex flex-col gap-2.5">
                  <PlanFeature highlight>Sprinkler inspection & tune-up</PlanFeature>
                  <PlanFeature icon={<CalendarCheck className="w-4 h-4 text-success" />}>
                    Priority scheduling
                  </PlanFeature>
                  <PlanFeature icon={<Percent className="w-4 h-4 text-success" />}>
                    10% off all services
                  </PlanFeature>
                </div>
              </div>

              <Link
                href="/contact"
                className={cn(buttonVariants({ size: "lg" }), "mt-auto w-full")}
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Note */}
        <div className="text-center mt-8 max-w-2xl mx-auto">
          <p className="text-white/50 text-sm">
            All plans are annual. No contracts — cancel anytime. Priority
            scheduling means guaranteed service windows during peak season.
          </p>
          <p className="text-white/40 text-xs mt-3">
            Plans cover only the services listed above. Cost of materials is not
            included. Any additional repairs or work beyond what is listed will
            be invoiced separately.
          </p>
        </div>
      </div>
    </section>
  )
}

function PlanFeature({
  children,
  icon,
  highlight,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {icon || <Check className="w-4 h-4 text-success shrink-0" />}
      <span
        className={cn(
          "text-muted-foreground font-medium",
          highlight && "font-semibold text-primary"
        )}
      >
        {children}
      </span>
    </div>
  )
}
