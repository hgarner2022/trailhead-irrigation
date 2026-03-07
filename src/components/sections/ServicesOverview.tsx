import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Wrench, Droplets, Snowflake } from "lucide-react"

const SERVICES = [
  {
    title: "Irrigation System Installation",
    description: "Complete sprinkler system design and installation for residential and commercial properties. Built to last with quality parts.",
    icon: Droplets,
    image: "/images/sprinkler-head.jpg",
  },
  {
    title: "Repair & Maintenance",
    description: "Fast, reliable diagnosis and repair of broken sprinkler heads, leaking valves, controller issues, and more.",
    icon: Wrench,
    image: "/images/lawn.jpg",
  },
  {
    title: "Winterization & Spring Startup",
    description: "Protect your investment with professional blowouts in fall and full system activation in spring.",
    icon: Snowflake,
    image: "/images/boulder.jpg",
  },
]

export function ServicesOverview() {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="services-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-12">
          <div className="text-center flex flex-col gap-3">
            <h2 id="services-heading" className="text-3xl md:text-4xl font-bold text-foreground">
              Our Irrigation Services
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From new installations to seasonal maintenance, we keep your lawn healthy year-round.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {SERVICES.map((service) => (
              <Card key={service.title} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-48">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <service.icon className="h-5 w-5 text-primary" />
                    <CardTitle>{service.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{service.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button variant="secondary" size="lg">
            <Link href="/services">View All Services</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
