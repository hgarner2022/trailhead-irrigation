import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { PageBanner } from "@/components/sections/PageBanner"
import { BLOG_POSTS, getReadingTime, type BlogPost } from "@/lib/blog"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { ArrowRight } from "lucide-react"

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
      <div className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-white/30 shrink-0">
        <Image
          src={AUTHOR.avatar}
          alt={AUTHOR.name}
          fill
          sizes="40px"
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
      {/* subtle radial highlight to give the gradient depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />

      <div className="relative p-8 md:p-10 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wider text-white/90">
          <span className="px-3 py-1 rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
            Latest Post
          </span>
          {post.category && (
            <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/20">
              {post.category}
            </span>
          )}
          <span className="text-white/80 normal-case tracking-normal">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden="true" className="mx-2">
              &middot;
            </span>
            {getReadingTime(post.content)} min read
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight group-hover:opacity-95 transition-opacity">
          {post.title}
        </h2>

        <p className="text-white/90 text-base md:text-lg leading-relaxed max-w-3xl">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between gap-4 pt-2">
          <AuthorByline light />
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white whitespace-nowrap shrink-0">
            <span className="hidden sm:inline">Read post</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

function StandardCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-2xl border border-border bg-background p-6 md:p-7 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {post.category && (
            <span className="px-3 py-1 rounded-full bg-cream ring-1 ring-border text-foreground">
              {post.category}
            </span>
          )}
          <span className="normal-case tracking-normal">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden="true" className="mx-2">
              &middot;
            </span>
            {getReadingTime(post.content)} min read
          </span>
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
          {post.title}
        </h3>

        <p className="text-muted-foreground leading-relaxed">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between gap-4 pt-1">
          <AuthorByline />
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary whitespace-nowrap shrink-0">
            <span className="hidden sm:inline">Read post</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
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
        <div className="container-padding-x mx-auto max-w-4xl">
          <p className="text-muted-foreground mb-10">
            Practical irrigation advice from a Northern Colorado contractor. Tips on watering schedules, sprinkler repair, winterization, and saving water in Erie, Longmont, and Weld County.
          </p>

          <div className="flex flex-col gap-6">
            {featured && <FeaturedCard post={featured} />}
            {rest.map((post) => (
              <StandardCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
