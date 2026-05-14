import type { ReviewItem } from "./seo"

/**
 * REAL Google Business Profile reviews for Trailhead Lawn & Irrigation.
 *
 * These reviews are publicly visible on Trailhead's Google Business Profile
 * and are republished here with attribution to Google. They power both:
 *   1. The visible testimonials section (Testimonials.tsx)
 *   2. Schema.org `Review` JSON-LD for SEO + AI citation
 *
 * Source: https://www.google.com/maps/place/Trailhead+Lawn+%26+Irrigation+LLC
 *
 * ⚠️  Only add reviews here that come from a real, verifiable source.
 *     Do not edit the reviewer's name or rewrite review text — match the
 *     public source exactly so schema data is verifiable.
 *
 * When new Google reviews come in:
 *   1. Add an entry below using the reviewer's name and rating exactly as
 *      shown on Google
 *   2. Convert "X days ago" / "a week ago" to an ISO YYYY-MM-DD date
 *   3. Update the `reviewCount` and (if it changes) `ratingValue` in the
 *      LocalBusiness `aggregateRating` in src/lib/seo.ts
 */
export const REVIEWS: ReviewItem[] = [
  {
    author: "Joe “Tr3m3ndous” Louis",
    rating: 5,
    date: "2026-05-10",
    body: "Excellent service from start to finish! He was prompt, professional, and extremely knowledgeable about our sprinkler system. Not only did he fix the issues, but he also took the time to educate us on how the system works and what to watch for moving forward. It’s rare to find someone so honest and helpful these days. We will definitely use him again for any future sprinkler needs and highly recommend his services to anyone looking for reliable and quality work!",
    source: "Google",
  },
  {
    author: "Brian Taylor",
    rating: 5,
    date: "2026-05-01",
    body: "Great service from the Trailhead team. They turned my system on and installed a Rachio wireless controller. The handoff to my account was seamless and they were really knowledgeable about the app. Highly recommend!",
    source: "Google",
  },
  {
    author: "Lauren Shields",
    rating: 5,
    date: "2026-04-27",
    body: "Highly recommend! I found a leak in my system this spring and they diagnosed the problem and fixed it right away. Very good pricing compared to other companies in town!",
    source: "Google",
  },
  {
    author: "Adam Shearer",
    rating: 5,
    date: "2026-04-23",
    body: "I had a great experience working with Trailhead. They are professional, responsive and got the job done quickly without cutting corners. Highly recommend!",
    source: "Google",
  },
  {
    author: "Josh Drake",
    rating: 5,
    date: "2026-04-21",
    body: "Great experience all around. Ryan came out promptly, adjusted my sprinkler system, and made sure everything was running efficiently and covering the right areas. Super professional, knowledgeable, and easy to work with. Highly recommend if you need sprinkler work done.",
    source: "Google",
  },
]
