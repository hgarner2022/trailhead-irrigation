import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { PageBanner } from "@/components/sections/PageBanner"
import { BLOG_POSTS, type BlogPost } from "@/lib/blog"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Irrigation Tips & Lawn Care Blog | Erie, CO",
  description:
    "Sprinkler tips, seasonal watering schedules, repair guides, and water-saving advice for Northern Colorado homeowners in Erie, Longmont, and Weld County.",
  alternates: { canonical: `${siteConfig.url}/blog` },
}

const AUTHOR = {
  name: "Ryan Garner",
  role: "Founder",
  avatar: "/images/ryan-avatar.jpg",
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function AuthorByline({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-white/30 shrink-0">
        <Image
          src={AUTHOR.avatar}
          alt={AUTHOR.name}
          fill
          sizes="36px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col leading-tight min-w-0">
        <span
          className={
            light
              ? "text-sm font-semibold text-white whitespace-nowrap"
              : "text-sm font-semibold text-foreground whitespace-nowrap"
          }
        >
          {AUTHOR.name}
        </span>
        <span
          className={
            light
              ? "text-xs text-white/80 whitespace-nowrap"
              : "text-xs text-muted-foreground whitespace-nowrap"
          }
        >
          {AUTHOR.role}
        </span>
      </div>
    </div>
  )
}

function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-primary-light via-primary to-primary-dark shadow-lg hover:shadow-xl transition-shadow"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />

      <div className="relative p-6 md:p-8 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-white/90">
          <span>Latest Post</span>
          <time dateTime={post.date} className="font-normal normal-case tracking-normal text-white/80">
            {formatDate(post.date)}
          </time>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight max-w-3xl">
          {post.title}
        </h2>

        <p className="text-white/85 text-base leading-relaxed max-w-3xl line-clamp-2">
          {post.excerpt}
        </p>

        <div className="pt-2">
          <AuthorByline light />
        </div>
      </div>
    </Link>
  )
}

function StandardCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-background p-5 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex flex-col gap-3 grow">
        <time
          dateTime={post.date}
          className="text-xs text-muted-foreground"
        >
          {formatDate(post.date)}
        </time>
        {post.category && (
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {post.category}
          </span>
        )}

        <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
          {post.title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 grow">
          {post.excerpt}
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <AuthorByline />
      </div>
    </Link>
  )
}

export default function BlogPage() {
  const sortedPosts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const [featured, ...rest] = sortedPosts

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
        <div className="container-padding-x mx-auto max-w-6xl">
          <p className="text-muted-foreground mb-10 max-w-3xl">
            Practical irrigation advice from a Northern Colorado contractor. Tips on watering schedules, sprinkler repair, winterization, and saving water in Erie, Longmont, and Weld County.
          </p>

          <div className="flex flex-col gap-8">
            {featured && <FeaturedCard post={featured} />}

            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((post) => (
                  <StandardCard key={post.slug} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
