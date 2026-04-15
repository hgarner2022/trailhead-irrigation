import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BLOG_POSTS, getBlogPost, getReadingTime } from "@/lib/blog"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { blogPostJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: "Post Not Found" }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${siteConfig.url}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: ["Ryan Garner"],
    },
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-foreground font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

function getHeadings(content: string): { text: string; id: string }[] {
  return content
    .split("\n\n")
    .filter((block) => block.startsWith("## "))
    .map((block) => {
      const text = block.replace("## ", "")
      return { text, id: slugify(text) }
    })
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const headings = getHeadings(post.content)
  const showToc = headings.length >= 4
  const readingTime = getReadingTime(post.content)

  const relatedPosts = post.relatedSlugs
    ? BLOG_POSTS.filter((p) => post.relatedSlugs!.includes(p.slug)).slice(0, 3)
    : BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3)

  return (
    <article className="bg-background section-padding-y">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogPostJsonLd(post)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Blog", url: `${siteConfig.url}/blog` },
              { name: post.title, url: `${siteConfig.url}/blog/${post.slug}` },
            ])
          ),
        }}
      />
      <div className="container-padding-x mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Post header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span aria-hidden="true">&middot;</span>
            <span>{readingTime} min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {post.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            By <Link href="/about" className="text-primary hover:underline font-medium">Ryan Garner</Link>, Founder &middot; Trailhead Lawn &amp; Irrigation
          </p>
        </header>

        {/* Table of contents */}
        {showToc && (
          <nav
            aria-label="Table of contents"
            className="mb-10 p-5 bg-stone rounded-lg border border-border"
          >
            <p className="text-sm font-semibold text-foreground mb-3">
              In this article
            </p>
            <ul className="flex flex-col gap-1.5">
              {headings.map((heading) => (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Post content */}
        <div className="flex flex-col gap-4">
          {post.content.split("\n\n").map((block, i) => {
            if (block.startsWith("## ")) {
              const text = block.replace("## ", "")
              return (
                <h2
                  key={i}
                  id={slugify(text)}
                  className="text-2xl font-bold text-foreground mt-6 mb-2 scroll-mt-24"
                >
                  {text}
                </h2>
              )
            }
            if (block.startsWith("### ")) {
              const text = block.replace("### ", "")
              return (
                <h3
                  key={i}
                  className="text-xl font-semibold text-foreground mt-4 mb-1"
                >
                  {text}
                </h3>
              )
            }
            if (block.startsWith("- ")) {
              const items = block
                .split("\n")
                .map((line) => line.replace(/^- /, ""))
              return (
                <ul
                  key={i}
                  className="list-disc pl-6 flex flex-col gap-2 my-2"
                >
                  {items.map((item, j) => (
                    <li key={j} className="text-muted-foreground">
                      {renderInlineFormatting(item)}
                    </li>
                  ))}
                </ul>
              )
            }
            if (/^\d+\. /.test(block)) {
              const items = block
                .split("\n")
                .map((line) => line.replace(/^\d+\.\s*/, ""))
              return (
                <ol
                  key={i}
                  className="list-decimal pl-6 flex flex-col gap-2 my-2"
                >
                  {items.map((item, j) => (
                    <li key={j} className="text-muted-foreground">
                      {renderInlineFormatting(item)}
                    </li>
                  ))}
                </ol>
              )
            }
            return (
              <p
                key={i}
                className="text-muted-foreground leading-relaxed"
              >
                {renderInlineFormatting(block)}
              </p>
            )
          })}
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <>
            <Separator className="my-12" />
            <div className="mb-12">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Related Articles
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedPosts.map((related) => (
                  <Link key={related.slug} href={`/blog/${related.slug}`}>
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          {new Date(related.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {related.title}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator className="my-12" />

        {/* CTA */}
        <div className="text-center flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-foreground">
            Need Irrigation Help?
          </h2>
          <p className="text-muted-foreground">
            Contact Trailhead Lawn & Irrigation for professional service in
            Weld County, Erie & Longmont.
          </p>
          <div className="flex gap-3">
            <Link
              href="/contact"
              className={buttonVariants()}
            >
              Contact Us
            </Link>
            <a
              href="tel:9706927270"
              className={buttonVariants({ variant: "outline" })}
            >
              Call (970) 692-7270
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
