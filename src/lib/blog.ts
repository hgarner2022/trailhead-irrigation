export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "water-optimization-tips-colorado",
    title: "5 Ways to Optimize Water Usage With Your Sprinkler System in Colorado",
    date: "2026-03-07",
    excerpt:
      "Water isn't cheap on the Front Range — and it's only getting more limited. Here are five practical ways to cut your irrigation water usage without sacrificing a green lawn.",
    content: `Water is one of Northern Colorado's most valuable resources. Between semi-arid conditions, growing demand, and rising utility rates, every gallon counts. The good news is that a well-tuned irrigation system can keep your lawn healthy while using significantly less water.

## 1. Upgrade to a Smart Controller

Traditional timers water on a fixed schedule regardless of weather. Smart (Wi-Fi) controllers adjust automatically based on local weather data — skipping cycles when rain is in the forecast and increasing run times during hot, dry stretches. Many Front Range water districts offer rebates for upgrading to an EPA WaterSense-certified controller, which can offset most of the cost.

## 2. Use Cycle-and-Soak Programming

Colorado's clay-heavy soil absorbs water slowly. If you run a zone for 20 minutes straight, most of that water runs off into the gutter. Instead, break your watering into shorter cycles with soak time in between — for example, three 6-minute runs with 30 minutes between each. This lets water penetrate the root zone instead of pooling on the surface.

## 3. Water at the Right Time

The best time to water in Colorado is between 5:00 AM and 9:00 AM. Early morning watering reduces evaporation from sun and wind, and gives grass blades time to dry before nightfall — which helps prevent fungal disease. Midday watering wastes up to 30% of your water to evaporation.

## 4. Zone by Sun Exposure

Not every part of your yard needs the same amount of water. South-facing slopes and full-sun areas dry out much faster than shaded beds under trees. Separate your irrigation zones by sun exposure and soil type so each area gets exactly what it needs — no more, no less.

## 5. Fix Leaks and Upgrade Nozzles

A single leaking head or cracked fitting can waste hundreds of gallons per week. Walk your system at least once a season and check for heads that are broken, tilted, or spraying onto sidewalks and driveways. Upgrading to high-efficiency rotary nozzles can also reduce water use by 30% compared to traditional spray heads, while providing more even coverage.

## The Bottom Line

Small changes to your irrigation system can add up to big water savings over a season. Whether it's upgrading your controller, adjusting your schedule, or fixing a few leaky heads — every improvement helps your lawn, your wallet, and Colorado's water supply.

Need help optimizing your system? Contact Trailhead Lawn & Irrigation for a free assessment. We serve Erie, Longmont, and Weld County.`,
  },
  {
    slug: "when-to-winterize-sprinklers-colorado",
    title:
      "When Should You Winterize Your Sprinklers in Northern Colorado?",
    date: "2026-02-15",
    excerpt:
      "Timing is everything when it comes to protecting your irrigation system from Colorado's freeze-thaw cycles. Here's what every homeowner needs to know.",
    content: `Colorado's Front Range is known for unpredictable weather — sunny and 70 one day, snowing the next. That makes timing your sprinkler winterization critical.

## The Short Answer

In Northern Colorado, you should winterize your irrigation system between **mid-October and early November**. Ideally, get it done before the first hard freeze (when temperatures drop below 28°F for several hours).

## Why Timing Matters

Water left in your irrigation lines can freeze and expand, cracking pipes, breaking valves, and damaging sprinkler heads. A proper blowout removes all water from the system using compressed air.

## What's Involved

Professional winterization includes:
- Shutting off the water supply to the irrigation system
- Blowing compressed air through each zone
- Draining the backflow preventer
- Shutting down and backing up your controller settings

## Don't Wait Too Long

Every year we get calls from homeowners who waited too long and ended up with cracked pipes. The repair bill is always more expensive than the winterization would have been.

## Schedule Your Winterization

Contact Trailhead Lawn & Irrigation to get on our winterization schedule. We serve Weld County, Erie, and Longmont.`,
  },
  {
    slug: "signs-irrigation-system-needs-repair",
    title: "Signs Your Irrigation System Needs Repair",
    date: "2026-01-20",
    excerpt:
      "Brown spots, high water bills, and puddles in your yard? These are common signs your sprinkler system needs attention.",
    content: `Your irrigation system works hard all season long. Over time, wear and tear can lead to problems that waste water and damage your lawn. Here are the top signs to watch for.

## 1. Brown or Dry Patches

If you notice brown spots in an otherwise green lawn, a sprinkler head may be broken, clogged, or misaligned. This is one of the most common issues we see.

## 2. Puddles or Soggy Areas

Standing water around sprinkler heads or in your yard usually means a leak — either a cracked pipe, a broken head, or a stuck valve.

## 3. Unusually High Water Bills

A sudden spike in your water bill during irrigation season often points to an underground leak. Even a small leak can waste thousands of gallons per month.

## 4. Sputtering or Uneven Spray

Heads that sputter, spray unevenly, or don't pop up fully may have debris in the line, low pressure, or internal damage.

## 5. Controller Issues

If zones aren't running on schedule, won't turn off, or skip entirely, your controller may need reprogramming or replacement.

## When to Call a Pro

Some issues are easy to spot but tricky to fix. Underground leaks, valve problems, and wiring issues all require professional diagnosis. Contact us for a repair assessment.`,
  },
  {
    slug: "why-hire-local-irrigation-company",
    title: "Why Hire a Local Irrigation Company?",
    date: "2025-12-10",
    excerpt:
      "When it comes to your sprinkler system, hiring local means faster response times, better knowledge of local conditions, and someone who stands behind their work.",
    content: `You've got plenty of options when it comes to irrigation services. So why go local? Here's why it matters — especially in Northern Colorado.

## We Know the Climate

Colorado's Front Range has unique challenges: clay soil, freeze-thaw cycles, dry summers, and water restrictions. A local company understands these conditions and designs systems accordingly.

## Faster Response Times

When a pipe bursts or a valve fails, you need someone who can get there fast. Local companies don't have to drive across the metro — we're already in your neighborhood.

## Accountability

When you hire a local business, you're hiring a neighbor. We live here, we work here, and our reputation depends on doing right by the community.

## Supporting the Local Economy

Every dollar spent with a local business stays in the community longer. You're supporting local families and helping keep small business alive.

## Get to Know Your Irrigation Pro

At Trailhead, when you call, you get Ryan. Not a call center. Not a random technician. Just a local guy who takes pride in every job.

Ready to work with a local irrigation company that treats your yard like their own? Give us a call.`,
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug)
}
