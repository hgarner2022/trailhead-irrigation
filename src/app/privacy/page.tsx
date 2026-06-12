import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Trailhead Lawn & Irrigation LLC. How we collect, use, and protect your information, including SMS communications and dedicated phone number messaging.",
  alternates: { canonical: `${siteConfig.url}/privacy` },
}

const EFFECTIVE_DATE = "June 12, 2026"

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Privacy Policy", url: `${siteConfig.url}/privacy` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Privacy Policy"
        description="How Trailhead Lawn & Irrigation collects, uses, and protects your information."
      />

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl flex flex-col gap-6 text-muted-foreground leading-relaxed">
          <p className="text-sm">
            <strong className="text-foreground">Effective date:</strong> {EFFECTIVE_DATE}
          </p>

          <p>
            Trailhead Lawn &amp; Irrigation LLC (&quot;Trailhead,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy. This Privacy Policy explains what information we collect when you visit our website, contact us, or hire us for service, how we use that information, and the choices you have. By using our website or services, you agree to the practices described below.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">1. Who We Are</h2>
          <p>
            Trailhead Lawn &amp; Irrigation LLC is a licensed and insured sprinkler contractor based in Erie, Colorado, serving homeowners across Erie, Longmont, Louisville, Lafayette, Firestone, and the surrounding Weld County area. Our business address is 137 Morgan Circle North, Erie, CO 80516.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">2. Information We Collect</h2>
          <p>
            We collect information you provide directly to us and information that is automatically collected when you use our website.
          </p>
          <p>
            <strong className="text-foreground">Information you provide:</strong> Your name, mailing address, service-location address, phone number, email address, details about your property or irrigation system, photos you share with us, and payment information when you hire us for service.
          </p>
          <p>
            <strong className="text-foreground">Information collected automatically:</strong> Standard server logs, your IP address, browser type, device type, pages visited, referral source, and similar usage data through cookies and analytics tools such as Google Analytics 4.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 flex flex-col gap-2">
            <li>Respond to inquiries, schedule service appointments, and provide quotes.</li>
            <li>Perform irrigation services at your property and bill you for completed work.</li>
            <li>Send appointment confirmations, scheduling updates, service reminders, and related communications by phone, email, or SMS text message.</li>
            <li>Improve our website, services, and customer experience.</li>
            <li>Comply with our legal and tax obligations.</li>
            <li>Protect our rights, property, and the safety of our customers and team.</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-6">4. SMS / Text Message Communications</h2>
          <p>
            <strong className="text-foreground">Opt-in.</strong> When you provide your phone number through our website, by phone, in person, or by replying to our messages, you consent to receive text messages from Trailhead Lawn &amp; Irrigation related to your service, including appointment confirmations, scheduling updates, on-the-way notifications, service follow-ups, and quote responses.
          </p>
          <p>
            <strong className="text-foreground">Message frequency.</strong> Message frequency varies based on your service activity. You may receive messages tied to scheduling, dispatching, and follow-up for your jobs.
          </p>
          <p>
            <strong className="text-foreground">Message and data rates.</strong> Standard message and data rates from your wireless carrier may apply. Trailhead does not charge for these messages.
          </p>
          <p>
            <strong className="text-foreground">Opt-out.</strong> You can opt out of SMS communications at any time by replying <strong className="text-foreground">STOP</strong> to any message you receive from us. You will receive a confirmation message that you have been unsubscribed and will not receive further messages.
          </p>
          <p>
            <strong className="text-foreground">Help.</strong> Reply <strong className="text-foreground">HELP</strong> to any message for assistance, or contact us directly at (970) 692-7270 or ryan@trailheadirrigation.com.
          </p>
          <p>
            <strong className="text-foreground">No third-party sharing of SMS data.</strong> We will not share your phone number, SMS opt-in status, or any text message content with third parties or affiliates for marketing or promotional purposes. We share this information only with the platform providers and carriers necessary to deliver our messages to you, including Jobber Software Inc., which we use to send and manage service-related text messages.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">5. Service Providers We Use</h2>
          <p>
            We share information with a small number of trusted service providers who help us run our business. These providers are bound by confidentiality and may only use information for the purposes we authorize. They include:
          </p>
          <ul className="list-disc pl-6 flex flex-col gap-2">
            <li><strong className="text-foreground">Jobber Software Inc.</strong> for scheduling, customer management, invoicing, and SMS communications.</li>
            <li><strong className="text-foreground">Vercel Inc.</strong> for website hosting.</li>
            <li><strong className="text-foreground">Google LLC</strong> for analytics (Google Analytics 4) and Google Business Profile management.</li>
            <li><strong className="text-foreground">Stripe Inc.</strong> or similar payment processors when used for credit card payments.</li>
          </ul>
          <p>
            We do not sell or rent your personal information to anyone for any purpose. We do not share your information with third parties for their own marketing.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">6. Cookies and Analytics</h2>
          <p>
            Our website uses cookies and similar technologies to recognize repeat visitors, measure site performance, and improve the user experience. We use Google Analytics 4 to understand how visitors find and use our site. You can disable cookies in your browser settings, though some site features may not work properly without them.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">7. Data Retention</h2>
          <p>
            We keep customer service records, quotes, and invoices for as long as needed to provide service and to meet our legal, tax, and accounting obligations. SMS opt-in records are retained for as long as you remain opted in, plus the period required by applicable law. If you opt out, your opt-out request is retained so we can honor it going forward.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">8. Your Choices and Colorado Privacy Rights</h2>
          <p>
            Colorado residents have certain rights under the Colorado Privacy Act, including the right to access, correct, or delete personal data we hold about you, and the right to opt out of targeted advertising or the sale of personal data. We do not sell your personal data. To exercise any of these rights, contact us at ryan@trailheadirrigation.com.
          </p>
          <p>
            You can opt out of SMS messages at any time by replying STOP. You can unsubscribe from email communications by replying or contacting us. You can ask us to delete your records by contacting us directly, subject to our legal record-keeping obligations.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">9. Children&apos;s Privacy</h2>
          <p>
            Our website and services are intended for adults aged 18 and older. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will delete it.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">10. Security</h2>
          <p>
            We take reasonable steps to protect the information we collect. No method of transmission over the internet or method of electronic storage is 100 percent secure, however, and we cannot guarantee absolute security.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the effective date at the top of this page. Material changes will be communicated through our website, and where required by law, through direct notice. Your continued use of our website or services after the changes take effect constitutes acceptance of the updated policy.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-6">12. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, want to exercise any of the rights described above, or need help with an opt-out, contact us:
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
