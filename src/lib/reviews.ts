import type { ReviewItem, ReviewTopic } from "./seo"

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
 * Last full sync: 2026-10-28, read from Business Profile Manager while signed
 * in as an owner of the profile. At that point Google reported 5.0 from 39
 * ratings. Two of those 39 are star-only with no written text, so 37 appear
 * below. The 39 figure is what `aggregateRating.reviewCount` in seo.ts must
 * match -- it counts ratings, not written reviews.
 *
 * About the dates: Google never exposes an exact timestamp, only a relative
 * one ("15 weeks ago"). Every date below is derived from that relative value
 * against the sync date, so it is accurate to within about a week. That is
 * good enough for `datePublished` and it is the best Google offers.
 *
 * WARNING: Only add reviews here that come from a real, verifiable source.
 *     Do not edit the reviewer's name or rewrite review text -- match the
 *     public source exactly so schema data is verifiable.
 *
 * To re-sync: sign in to business.google.com as a profile owner, open
 * Reviews, page through the list, and update both this file and the
 * `reviewCount` in src/lib/seo.ts.
 */
export const REVIEWS: ReviewItem[] = [
  {
    author: "Dylon Lusin",
    rating: 5,
    date: "2026-10-21",
    body: "Ryan was super cool and professional. He did a great job and was more extensive than what my HOA use to do. I would highly recommend him and will be hiring him again!",
    source: "Google",
  },
  {
    author: "Daniel Cooperider",
    rating: 5,
    date: "2026-10-14",
    body: "Hired Ryan for sprinkler blowout/winterization. Ryan was friendly and knowledgeable and was able to complete this service before our first Colorado freeze! I will definitely book Ryan again. Thanks!",
    source: "Google",
    tags: ["blowout"],
  },
  {
    author: "Kirby Moughon",
    rating: 5,
    date: "2026-10-14",
    body: "Easy to schedule online, showed up on time and performed service quickly and easily and answered a few questions of mine as a new homeowner.",
    source: "Google",
  },
  {
    author: "Kevin Bull",
    rating: 5,
    date: "2026-10-07",
    body: "Great job! Easy to work with.",
    source: "Google",
  },
  {
    author: "Romulus",
    rating: 5,
    date: "2026-10-07",
    body: "Helped out my parents and I. Quick, knowledgeable and professional. Highly recommend",
    source: "Google",
  },
  {
    author: "Jen Wilbers",
    rating: 5,
    date: "2026-09-30",
    body: "Everything about their service was easy and seamless. Ryan was very nice and gladly answered questions I had. He winterized my sprinklers and I will be having them help me in the Spring as well. Highly recommend!",
    source: "Google",
    tags: ["blowout"],
  },
  {
    author: "Alexandra Nicole",
    rating: 5,
    date: "2026-09-30",
    body: "Ryan is amazing! Quick service at an unbeatable price in Erie! I had a bad experience with a creepy sprinkler guy prior to Ryan who made me feel uncomfortable, but Ryan was professional and took care of my needs with out any weird behavior. I’d recommend him to anyone! And if you’re a woman, you’re in great hands with Ryan at Trailhead Irrigation!",
    source: "Google",
    tags: ["value"],
  },
  {
    author: "Jooseok Lee",
    rating: 5,
    date: "2026-09-30",
    body: "Knowledgeable and explain a lot. Thank you! Satisfied with the service",
    source: "Google",
  },
  {
    author: "Todd Camnitz",
    rating: 5,
    date: "2026-09-30",
    body: "Timely and reliable. Working with Ryan was an excellent experience, glad to have found him.",
    source: "Google",
  },
  {
    author: "Paul Griffin",
    rating: 5,
    date: "2026-09-09",
    body: "Ryan, did a great job winterizing my sprinklers. Showed up on time, explained the process and was fairly priced. I will use Ryan to turn on my sprinklers next spring",
    source: "Google",
    tags: ["blowout", "value"],
  },
  {
    author: "Jeremy Hampton",
    rating: 5,
    date: "2026-08-26",
    body: "I cannot say enough good things about my experience with Trailhead Lawn & Irrigation LLC, especially Ryan. From start to finish, Ryan went above and beyond to make sure everything was taken care of and that I had exactly what I needed. What impressed me most was his commitment to customer service. He didn't just complete the job and move on. He took the time to answer questions, explain my options, and ensure that everything was working properly before he left. This included the setup of my new Rachio system (the app and the wall unit) as well as the sprinklers, drip line, and new valve he installed. Ryan designed my sprinkler layout to be as efficient and effective as possible, replaced the sprinklers I already had with water efficient heads, and took the time to make sure I knew how to maintain and fix any of the minor issues myself. His attention to detail, professionalism, and willingness to go the extra mile were obvious throughout the entire process. If you're looking for a reliable irrigation and lawn company that stands behind its work, I highly recommend Trailhead Lawn & Irrigation LLC. Ryan's outstanding service is exactly what every customer hopes for and rarely finds.",
    source: "Google",
    tags: ["installation", "smart-controller"],
  },
  {
    author: "Coreen Larson",
    rating: 5,
    date: "2026-08-16",
    body: "Ryan is just great! Knows his stuff and always has a great attitude and a pleasure to work with. Highly recommend!",
    source: "Google",
  },
  {
    author: "Brian Salts-Halcomb",
    rating: 5,
    date: "2026-08-16",
    body: "Trailhead is knowledgeable, professional, timely. Ryan came out for a couple jobs that have been nagging us for years and he talked through options and got us on track - highly recommend!",
    source: "Google",
  },
  {
    author: "Pate Katechis",
    rating: 5,
    date: "2026-07-22",
    body: "Ryan was great - friendly, professional, and knowledgeable.Took care of a valve replacement, sprinkler head repair, and timer programming in about 30 min.",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Lori Larrabee",
    rating: 5,
    date: "2026-07-15",
    body: "We had a great experience. Ryan was very friendly and professional. He diagnosed the problem and got it repaired in no time. I would highly recommend his services.",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Lori Ginn",
    rating: 5,
    date: "2026-07-15",
    body: "Ryan is awesome. He tested all our sprinklers and made repairs. He also added a few more sprinklers to the new trees we planted last month. He was very honest and thorough. He knows exactly what he’s doing! And, the best part was the cost. I really appreciated the reasonable price for his service. Super happy we found him!",
    source: "Google",
    tags: ["repair", "value"],
  },
  {
    author: "Matt L",
    rating: 5,
    date: "2026-07-08",
    body: "Great service and went above and beyond to fix my sprinkler issues. Highly recommend!",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Aaron Connors",
    rating: 5,
    date: "2026-07-08",
    body: "Ryan came out promptly, quickly diagnosed and fixed the problem with our sprinkler system and made sure everything was working properly. He also adjusted the sprinkler heads to ensure our lawn was getting full coverage and shared helpful tips to improve our watering efficiency. He was knowledgeable, professional and clearly experienced with sprinkler systems. I would highly recommend him.",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Ed K",
    rating: 5,
    date: "2026-07-01",
    body: "Ryan knows his stuff. He replaced several heads to new and improved versions that will save me money. He adjusted things around the rest of my yard to help get the most out of my system with our current drought restrictions. Very pleased with his work.",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Karthik Ramadas",
    rating: 5,
    date: "2026-07-01",
    body: "Great initial experience with Ryan @Trailhead Lawn & Irrigation today. He really helped thoroughly review all of our home's sprinkler system and coverage including a quick fix on a leaking valve. I love that Ryan is local and easily accessible in Erie, CO. Highly recommend if you need help with your lawn care and irrigation systems/projects. Professional, friendly and takes the right approach of let's fix what you've got first before proposing additional expansions or projects. Ryan, thank you for your help today! It was a pleasure meeting and getting to know the work you do.",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Joanna Toy",
    rating: 5,
    date: "2026-07-01",
    body: "I am so glad I found Trailhead Lawn & Irrigation. Ryan took time and care to make sure my sprinklers were working efficiently and was able to make the proper adjustments on the spot. He made sure I understood the new system he installed and is fairly priced. I highly recommend his services.",
    source: "Google",
    tags: ["installation", "value"],
  },
  {
    author: "Brent Bell",
    rating: 5,
    date: "2026-07-01",
    body: "Ryan was fantastic. I am very glad I booked him to do my sprinkler work. He installed a new vacuum breaker, a new controller, fixed some wiring issues, and changed a head for me.",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Jerry",
    rating: 5,
    date: "2026-07-01",
    body: "The tech Ryan was amazingly friendly, knowledgeable, quick, and thorough! My sprinkler system has never worked better!",
    source: "Google",
  },
  {
    author: "Jodi L",
    rating: 5,
    date: "2026-06-17",
    body: "Outstanding service and attention to detail. Ryan was on time, explained everything clearly, and got our sprinkler system running better than ever. Super friendly and took the time to explain what the issues were and how to resolve them. Learned more about my system than was explained by the contractor who installed it. I highly recommend Trailhead!",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Reesa Rennecker",
    rating: 5,
    date: "2026-06-17",
    body: "Ryan was very responsive to get scheduled. He was right on time, great communication. Very thorough and explained every step of the way. I highly recommend using him.",
    source: "Google",
  },
  {
    author: "Nicole Duke",
    rating: 5,
    date: "2026-06-10",
    body: "Ryan is friendly and knowledgeable. He was on time, fixed everything I needed and was affordable. I highly recommend him if you need sprinkler work.",
    source: "Google",
    tags: ["repair", "value"],
  },
  {
    author: "Tyler Adams",
    rating: 5,
    date: "2026-06-03",
    body: "Great, knowledgeable service!",
    source: "Google",
  },
  {
    author: "Nangchen",
    rating: 5,
    date: "2026-06-03",
    body: "Excellent service! He did a great job with our sprinkler system, was very friendly, and took the time to teach us how everything works. Professional, knowledgeable, and honest. Highly recommend!",
    source: "Google",
  },
  {
    author: "Alyson Tobyne",
    rating: 5,
    date: "2026-05-13",
    body: "Ryan at Trailhead Irrigation was awesome! He was prompt, reliable, down to earth, and reasonably priced. He helped fix some sprinkler heads and modify some drip lines on my backyard irrigation system, and the work was done really well. What stood out most was how responsive and thorough he was. He triple checked everything and even came back out when we thought there might be a leak just to make sure everything was working properly. As a female homeowner, I also really appreciated that he wasn’t condescending, trying to mansplain things, or upsell unnecessary work. He genuinely wanted to help fix the problem and make sure it was done right. I originally called him just to help turn my sprinkler system on for the season, but ended up hiring him for the additional work because I was so happy with the experience. Strongly recommend Ryan and Trailhead Irrigation.",
    source: "Google",
    tags: ["repair", "value"],
  },
  {
    author: "Joe “Tr3m3ndous” Louis",
    rating: 5,
    date: "2026-05-10",
    body: "Excellent service from start to finish! He was prompt, professional, and extremely knowledgeable about our sprinkler system. Not only did he fix the issues, but he also took the time to educate us on how the system works and what to watch for moving forward. It’s rare to find someone so honest and helpful these days. We will definitely use him again for any future sprinkler needs and highly recommend his services to anyone looking for reliable and quality work!",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Brian Taylor",
    rating: 5,
    date: "2026-05-01",
    body: "Great service from the Trailhead team. They turned my system on and installed a Rachio wireless controller. The handoff to my account was seamless and they were really knowledgeable about the app. Highly recommend!",
    source: "Google",
    tags: ["smart-controller"],
  },
  {
    author: "Chris Nomad",
    rating: 5,
    date: "2026-04-29",
    body: "Ryan is top notch and knows his stuff. He does great work and has great customer service. Thanks Ryan!",
    source: "Google",
  },
  {
    author: "Christian Mayled",
    rating: 5,
    date: "2026-04-29",
    body: "Trailhead is reliable, knowledgeable, and committed to providing top-quality service, which they did prepping, repairing, and adjusting my irrigation system. It's great when you find a trusted \"go-to\" expert like Trailhead that you can rely on for years to come.",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Scott Przygocki",
    rating: 5,
    date: "2026-04-29",
    body: "Ryan did a great job adjusting the sprinklers so I won’t be wasting water.",
    source: "Google",
    tags: ["repair"],
  },
  {
    author: "Lauren Shields",
    rating: 5,
    date: "2026-04-27",
    body: "Highly recommend! I found a leak in my system this spring and they diagnosed the problem and fixed it right away. Very good pricing compared to other companies in town!",
    source: "Google",
    tags: ["repair", "value"],
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
    tags: ["repair"],
  },
]

/**
 * Reviews that actually talk about `topic`, newest first.
 *
 * REVIEWS is already stored newest-first, so this preserves that order and
 * just takes the freshest `limit`. Pages should emit Review schema for the
 * same subset they display -- Google expects review markup to match what a
 * visitor can see on the page.
 */
export function reviewsFor(topic: ReviewTopic, limit = 3): ReviewItem[] {
  return REVIEWS.filter((r) => r.tags?.includes(topic)).slice(0, limit)
}

/** The freshest `limit` reviews regardless of topic. */
export function recentReviews(limit = 9): ReviewItem[] {
  return REVIEWS.slice(0, limit)
}

/**
 * Hand-picked reviews, in the order given.
 *
 * Placement is an editorial decision, not a sort. Picking by recency puts
 * whatever came in last on the homepage, and that turned out to include
 * several one-line reviews ("Great job! Easy to work with.") sitting next
 * to detailed ones, which makes the whole section look weak.
 *
 * Two things matter when choosing: the review should say something specific
 * about the work, and the lengths in a single row should be roughly even,
 * because the cards stretch to match the tallest one.
 *
 * Throws on a name that is not in REVIEWS so a typo or a renamed reviewer
 * fails the build instead of silently dropping a card.
 */
export function pickReviews(...authors: string[]): ReviewItem[] {
  return authors.map((name) => {
    const found = REVIEWS.find((r) => r.author === name)
    if (!found) throw new Error(`pickReviews: no review by "${name}"`)
    return found
  })
}
