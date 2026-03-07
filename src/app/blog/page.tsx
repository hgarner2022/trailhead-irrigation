import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { BLOG_POSTS } from "@/lib/blog"
import Link from "next/link"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Irrigation & Lawn Care Blog",
  description:
    "Irrigation tips, seasonal advice, and lawn care insights for Northern Colorado homeowners. Learn when to winterize, signs of repair, and more.",
  alternates: { canonical: `${siteConfig.url}/blog` },
}

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Blog", url: `${siteConfig.url}/blog` },
            ])
          ),
        }}
      />
      <PageBanner
        title="Blog"
        description="Tips, advice, and insights on irrigation and lawn care in Northern Colorado."
      />

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <div className="flex flex-col gap-6">
            {BLOG_POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <p className="text-sm text-muted-foreground">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <CardTitle className="text-xl hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {post.excerpt}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
