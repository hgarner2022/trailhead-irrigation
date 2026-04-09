import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { BLOG_POSTS, getReadingTime } from "@/lib/blog"
import Link from "next/link"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Irrigation Tips & Lawn Care Blog | Erie, CO",
  description:
    "Sprinkler tips, seasonal watering schedules, repair guides, and water-saving advice for Northern Colorado homeowners in Erie, Longmont, and Weld County.",
  alternates: { canonical: `${siteConfig.url}/blog` },
}

export default function BlogPage() {
  const sortedPosts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

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
          <p className="text-muted-foreground mb-8">
            Practical irrigation advice from a Northern Colorado contractor. Tips on watering schedules, sprinkler repair, winterization, and saving water in Erie, Longmont, and Weld County.
          </p>
          <div className="flex flex-col gap-6">
            {sortedPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                      <span aria-hidden="true">&middot;</span>
                      <span>{getReadingTime(post.content)} min read</span>
                    </div>
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
