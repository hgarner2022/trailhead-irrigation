import type { MetadataRoute } from "next"
import { BLOG_POSTS } from "@/lib/blog"
import { CITY_DATA } from "@/lib/city-data"
import { CITY_RACHIO } from "@/lib/rachio-data"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://trailheadirrigation.com"

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 1 },
    { url: `${baseUrl}/services`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/book`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/smart-controllers`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/smart-controllers/water-savings-calculator`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.85 },
  ]

  const cityPages = CITY_DATA.map((city) => ({
    url: `${baseUrl}/services/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }))

  const smartControllerCityPages = CITY_RACHIO.map((city) => ({
    url: `${baseUrl}/smart-controllers/${city.slug}`,
    lastModified: new Date(),
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
