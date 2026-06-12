import type { MetadataRoute } from "next"
import { BLOG_POSTS } from "@/lib/blog"
import { CITY_DATA } from "@/lib/city-data"
import { CITY_RACHIO } from "@/lib/rachio-data"

// Stable lastModified dates per content category.
//
// Why this matters: if every URL claims `lastModified: new Date()` on every
// build, Google treats the freshness signal as noise and slows crawl. The
// site went from 4 not-indexed pages to 35 in late April 2026 — most of the
// new pages had never been crawled at all (1969-12-31 last-crawled date in
// GSC). Stable dates let Google trust the signal and prioritize crawl.
//
// Bump the date on a category only when content in that category actually
// changes in a way Google should re-crawl for.
const STATIC_PAGES_UPDATED = "2026-05-15" // last meaningful homepage/meta rewrite
const CITY_PAGES_UPDATED = "2026-05-01" // last meaningful city-page revision
const CALCULATOR_UPDATED = "2026-04-15" // water savings calculator rebate data
const BLOG_INDEX_UPDATED = "2026-05-19" // most recent blog post date

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.trailheadirrigation.com"

  const staticPages = [
    { url: baseUrl, lastModified: new Date(STATIC_PAGES_UPDATED), changeFrequency: "monthly" as const, priority: 1 },
    { url: `${baseUrl}/services`, lastModified: new Date(STATIC_PAGES_UPDATED), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(STATIC_PAGES_UPDATED), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: new Date(STATIC_PAGES_UPDATED), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(STATIC_PAGES_UPDATED), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(BLOG_INDEX_UPDATED), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/book`, lastModified: new Date(STATIC_PAGES_UPDATED), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/smart-controllers`, lastModified: new Date(CITY_PAGES_UPDATED), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/smart-controllers/water-savings-calculator`, lastModified: new Date(CALCULATOR_UPDATED), changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(STATIC_PAGES_UPDATED), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(STATIC_PAGES_UPDATED), changeFrequency: "yearly" as const, priority: 0.3 },
  ]

  const cityPages = CITY_DATA.map((city) => ({
    url: `${baseUrl}/services/${city.slug}`,
    lastModified: new Date(CITY_PAGES_UPDATED),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }))

  const smartControllerCityPages = CITY_RACHIO.map((city) => ({
    url: `${baseUrl}/smart-controllers/${city.slug}`,
    lastModified: new Date(CITY_PAGES_UPDATED),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }))

  const blogPages = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }))

  return [...staticPages, ...cityPages, ...smartControllerCityPages, ...blogPages]
}
