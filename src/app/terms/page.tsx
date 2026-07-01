import type { Metadata } from "next"
import Link from "next/link"
import { PageBanner } from "@/components/sections/PageBanner"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms & Conditions for Trailhead Lawn & Irrigation LLC services in Erie, Longmont, Louisville, Lafayette, Firestone, and Weld County, CO.",
  alternates: { canonical: `${siteConfig.url}/terms` },
}

const EFFECTIVE_DATE = "June 12, 2026"

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Terms & Conditions", url: `${siteConfig.url}/terms` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Terms & Conditions"
        description="The terms that govern services provided by Trailhead Lawn & Irrigation LLC."
      />

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl flex flex-col gap-6 text-muted-foreground leading-relaxed">
          <p className="text-sm">
            <strong className="text-foreground">Effective date:</strong> {EFFECTIVE_DATE}
          </p>

          <p>
            These Terms &amp; Conditions (&quot;Terms&quot;) govern the services provided by Trailhead Lawn &amp; Irrigation LLC (&quot;Trailhead,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) to the customer (&quot;you&quot; or &quot;your&quot;). By booking, scheduling, or accepting service from Trailhead, you agree to these Terms. If you do not agree, please do not book service. These Terms work together with our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">1. Our Services</h2>
          <p>
            Trailhead provides residential sprinkler and lawn irrigation services, including new system installation, repair, seasonal turn-on and winterization, smart controller installation, drip irrigation, system upgrades, and related work. Specific scope, pricing, and timing are agreed in writing or by electronic confirmation for each job.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">2. Service Area</h2>
          <p>
            We serve Erie, Longmont, Louisville, Lafayette, Firestone, and the surrounding Weld County area in Northern Colorado. We may decline jobs outside this area or charge a travel fee disclosed before service.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">3. Estimates, Pricing, and Quotes</h2>
          <p>
            Prices on our website, including pricing pages and service cards, are starting prices for typical residential properties (up to 8 zones unless noted otherwise) and are subject to change without notice. Final pricing for any job depends on system size, zone count, condition of existing equipment, materials needed, and on-site assessment.
          </p>
          <p>
            For services that require a quote (such as new sprinkler installations or larger projects), the quote we provide is valid for 30 days from the date issued, unless stated otherwise. Quotes are subject to revision if site conditions, scope, or material costs change.
          </p>
          <p>
            Materials and additional repair work discovered during a service visit are billed separately from the base service price unless explicitly included.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">4. Payment Terms</h2>
          <p>
            Payment is due upon completion of service unless other terms are agreed in writing. We accept major credit cards, ACH bank transfer, check, and cash. Invoices issued electronically are payable within 7 days of completion.
          </p>
          <p>
            Past-due balances may be subject to a late fee of 1.5 percent per month (18 percent per year) or the maximum allowed by Colorado law, whichever is less. Trailhead may suspend further service or refer the account to collections for any account in arrears.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">5. Scheduling, Cancellations, and No-Shows</h2>
          <p>
            We do our best to confirm and arrive at scheduled appointments. We ask the same of our customers. The following cancellation policy applies to all scheduled service:
          </p>
          <ul className="list-disc pl-6 flex flex-col gap-2">
            <li><strong className="text-foreground">More than 48 hours notice:</strong> You may reschedule or cancel at no charge.</li>
            <li><strong className="text-foreground">Less than 48 hours notice:</strong> A cancellation fee of up to $75 may be charged at our discretion to cover scheduling, dispatch, and lost opportunity costs.</li>
            <li><strong className="text-foreground">Same-day cancellation, no-show, or no access to the property at the scheduled time:</strong> You may be billed the full price of the scheduled service.</li>
          </ul>
          <p>
            By scheduling service with Trailhead, you acknowledge and accept this cancellation policy. Cancellation fees and full-service charges for missed appointments will be invoiced under the same payment terms as completed services. Weather, equipment failure, illness, or other reasonable circumstances on Trailhead&apos;s end will not result in cancellation fees to you, and we will reschedule promptly.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">6. Customer Responsibilities</h2>
          <p>You agree to:</p>
          <ul className="list-disc pl-6 flex flex-col gap-2">
            <li>Provide reasonable access to the property and irrigation system at the scheduled time.</li>
            <li>Ensure water supply to the irrigation system is on and pressurized for service visits that require it.</li>
            <li>Disclose any known issues with the system, recent repairs, and any underground utilities, hardscape, or structures we should be aware of.</li>
            <li>Mark or identify any sensitive landscaping, pet areas, or property features.</li>
            <li>Be responsible for any HOA approvals, permits, or third-party authorizations required for work on your property.</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-6">7. PVC Pipe Exclusion</h2>
          <p>
            Trailhead does not service sprinkler systems that use PVC pipe running to the spray heads. If we arrive on site and discover that your system uses PVC piping to the heads, we may decline to perform the work, and a trip / dispatch fee may apply. Please confirm your piping type before booking service.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">8. Insurance and Property Damage</h2>
          <p>
            Trailhead carries general liability insurance and takes reasonable care during all work. Nothing in this section constitutes an admission of liability, an assumption of responsibility for property outcomes, or a warranty of any kind. Any claim for property damage must be made in writing within 7 days of the service and is subject to the exclusions below and the limits in Section 9.
          </p>
          <p>
            Trailhead is not responsible for: damage to unmarked or improperly marked underground utilities, irrigation lines, sprinkler heads, or other improvements; damage to existing systems that fail due to age, pre-existing conditions, or normal wear; pre-existing damage; damage caused by weather, freezing, vehicles, animals, third parties, or events outside our control; damage to landscape, plants, lawn, hardscape, or personal property incidental to the work; or any loss, damage, or freeze-related failure of a system that Trailhead did not personally winterize.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">9. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by Colorado law, Trailhead&apos;s total cumulative liability to you for any and all claims arising from or related to our services or these Terms, whether in contract, tort (including negligence), warranty, or otherwise, is limited to the amount paid by you for the specific service that gave rise to the claim. In no event will Trailhead be liable for any indirect, incidental, consequential, special, exemplary, or punitive damages, including but not limited to lost profits, lost data, loss of use, or damage to plants, lawn, or landscape resulting from system performance, watering schedules, or drought conditions.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion of certain damages, so portions of this limitation may not apply to you.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">10. Disclaimer of Warranties</h2>
          <p>
            ALL SERVICES, LABOR, PARTS, AND MATERIALS PROVIDED BY TRAILHEAD ARE FURNISHED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND. Trailhead expressly disclaims all warranties, whether express, implied, statutory, or otherwise, including without limitation any implied warranties of merchantability, fitness for a particular purpose, workmanship, quality, durability, non-infringement, or any warranty arising from course of dealing, course of performance, or trade usage.
          </p>
          <p>
            Without limiting the foregoing, Trailhead does not warrant that its work will be free from defects; that repairs will hold indefinitely or for any period; that any component, part, or installation will operate without failure; that your irrigation system will perform to any specific standard; that watering schedules will produce any particular result; or that your lawn, plants, trees, or landscape will remain green, healthy, or alive. Any statements made by Trailhead about expected performance, longevity, or savings are estimates only, not warranties, and outcomes depend on many factors outside Trailhead&apos;s control including weather, drought stage restrictions, water supply, soil conditions, existing system age and condition, customer maintenance, and plant condition. Parts and materials, if covered at all, are covered only by their respective manufacturer warranties, which the customer must claim directly with the manufacturer.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Trailhead Lawn &amp; Irrigation LLC, its owners, employees, and contractors from any third-party claim, demand, loss, liability, damage, or expense (including reasonable attorneys&apos; fees) arising from your breach of these Terms, your negligent or wrongful acts, or your failure to disclose property conditions or to obtain required HOA or permit approvals.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">12. Force Majeure</h2>
          <p>
            Trailhead is not responsible for delays or failure to perform caused by events outside our reasonable control, including weather, drought-related restrictions, supply chain disruptions, equipment failure, illness, government action, or natural disasters. We will reschedule service as soon as reasonably possible.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">13. Photos and Marketing Use</h2>
          <p>
            Trailhead may take before-and-after photos of work completed at your property for internal records and may use anonymized photos for marketing, training, or social media, provided that the photos do not identify your address or personal information. If you prefer that no photos of your property be used for marketing, please tell us at any time and we will honor that request.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">14. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms are governed by the laws of the State of Colorado, without regard to its conflict-of-laws principles. Any dispute arising from or related to these Terms or our services will be brought exclusively in the state or federal courts located in Boulder or Weld County, Colorado, and you consent to the jurisdiction of those courts.
          </p>
          <p>
            Before filing any lawsuit, you agree to first attempt to resolve the dispute by contacting us directly and giving us a reasonable opportunity to address the concern. Most disputes are resolved this way.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">15. Modifications</h2>
          <p>
            We may update these Terms from time to time. When we do, we will update the effective date at the top of this page. Continued use of our services after the changes take effect constitutes acceptance of the updated Terms.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">16. Severability and Entire Agreement</h2>
          <p>
            If any provision of these Terms is found unenforceable, the remaining provisions will remain in full force and effect. These Terms, together with any written service agreement, invoice, or quote we provide and our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, form the complete agreement between you and Trailhead with respect to our services.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">17. Contact</h2>
          <p>
            Questions about these Terms? Contact us:
          </p>
          <ul className="list-disc pl-6 flex flex-col gap-2">
            <li><strong className="text-foreground">Trailhead Lawn &amp; Irrigation LLC</strong></li>
            <li>137 Morgan Circle North, Erie, CO 80516</li>
            <li>Phone: <a href="tel:9706927270" className="text-primary hover:underline">(970) 692-7270</a></li>
            <li>Email: <a href="mailto:ryan@trailheadirrigation.com" className="text-primary hover:underline">ryan@trailheadirrigation.com</a></li>
          </ul>
        </div>
      </section>
    </>
  )
}
