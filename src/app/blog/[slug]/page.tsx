import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BLOG_POSTS, getBlogPost } from "@/lib/blog"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

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
          <p className="text-sm text-muted-foreground mb-2">
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {post.title}
          </h1>
        </header>

        {/* Post content */}
        <div className="flex flex-col gap-4">
          {post.content.split("\n\n").map((block, i) => {
            if (block.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="text-2xl font-bold text-foreground mt-6 mb-2"
                >
                  {block.replace("## ", "")}
                </h2>
              )
            }
            if (block.startsWith("- ")) {
              const items = block
                .split("\n")
                .map((line) => line.replace("- ", ""))
              return (
                <ul
                  key={i}
                  className="list-disc pl-6 flex flex-col gap-2 my-2"
                >
                  {items.map((item, j) => (
                    <li key={j} className="text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              )
            }
            return (
              <p
                key={i}
                className="text-muted-foreground leading-relaxed"
              >
                {block}
              </p>
            )
          })}
        </div>

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
