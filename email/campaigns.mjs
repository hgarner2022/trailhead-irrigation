/**
 * Campaign definitions for Trailhead email sends.
 *
 * One entry per campaign. All branding (logo, colors, header, footer,
 * button, dark mode, Outlook fallbacks) lives in scripts/build-email.mjs,
 * so adding a campaign means writing copy here and nothing else.
 *
 *   npm run email:build -- --campaign=blowout
 *   npm run brevo:draft -- --campaign=blowout --list=3
 *
 * Copy rules for this brand: first person, Ryan's voice, no em dashes,
 * one CTA per email, and every price must match /pricing and pricing.md.
 */

export const CAMPAIGNS = {
  blowout: {
    name: "Blowout 2026 - existing customers",
    subject: "Book your blowout before the first hard freeze",
    preheader: "In 2024 Erie's landed on October 18. Some years it holds off. Not worth guessing at.",
    eyebrow: "Fall schedule",
    headline: "Let's get the water out before it freezes",
    // The old headline was "It is 90 degrees and I want to talk about frozen
    // pipes". True when it was written in August. Retired on 2026-09-14: Erie
    // was 89 that day but 76 the next, then 83, 79, 84, with lows in the
    // fifties. Check the forecast before writing any temperature into a
    // subject or headline again.
    paragraphs: [
      "First, thank you. It has been a good season, and that is down to the people who keep calling us back. I do not take it for granted.",
      "Now the one job that has to happen before winter. The nights are already dropping into the fifties, so I am filling in the blowout schedule and I wanted to come to you first, before October goes. In 2024 Erie's first hard freeze landed on October 18. Some years it holds off until November. It is not something worth guessing at.",
      "If the system does not get cleared, the water sits in it all winter. It corrodes the metal parts from the inside out, and when it freezes it expands and splits pipes and valves. Your backflow assembly sits above ground holding water, so it goes first, and it is one of the more expensive things to put right. You will not find out about any of it until spring, and by then the repair runs $500 to $1,500.",
      "The blowout itself takes 30 to 60 minutes. Every zone gets purged with compressed air, the backflow assembly gets cleared and protected, and you are done until spring.",
    ],
    price: { amount: "$95", note: "up to 6 zones &middot; $10 for each zone after that" },
    // utm params are worth carrying: Jobber's embed snippet reads utm_source,
    // utm_medium and utm_campaign off the page URL and forwards them into the
    // work request, so a booking that started here is attributable in Jobber
    // as well as GA4.
    cta: {
      label: "Book Your Blowout",
      url: "https://www.trailheadirrigation.com/book?service=winterization&utm_source=email&utm_medium=email&utm_campaign=blowout-2026",
    },
    ctaNote: "We start booking in September and October fills fast. By mid October we are usually solid, so the earlier you grab a spot, the more say you have in the day.",
    // Timely, actionable, and about the stretch between this email and the
    // blowout rather than after it. Numbers from the September and October
    // sections of the month-by-month blog post: about an inch a week through
    // September, one deep watering per week in early October.
    tip: {
      title: "Until then, do not cut the water back.",
      body:
        "The air cools off in September but the soil stays warm and the grass is still growing. Backing off too early is the most common reason a lawn goes into winter stressed. Stay around an inch a week through September, drop to one deep watering a week in early October, then stop when a freeze gets close.",
    },
    servicesLabel: "Also this fall",
    services: [
      {
        // Deliberately two short lines. This email exists to sell blowouts,
        // and an aeration blurb with its own booking link competes with that
        // CTA the longer it runs. Hannah asked for the link, so it stays, but
        // it stays subordinate. Price is off per Hannah; the page carries it.
        name: "Core Aeration",
        body:
          "Opens up compacted clay so water and fertilizer reach the roots. Runs through October, and it books on its own form.",
        link: {
          label: "Book core aeration",
          url: "https://www.trailheadirrigation.com/aeration?utm_source=email&utm_medium=email&utm_campaign=blowout-2026",
        },
      },
      {
        name: "Christmas Lights",
        body:
          "You will be able to book it right on the site, and we handle the ladders and the roofline so you do not have to. Reply if you want me to hold you a spot.",
      },
    ],
  },

  "spring-turn-on": {
    name: "Spring turn-on - existing customers",
    subject: "Time to wake your sprinklers up",
    preheader: "Late April through May. Let's get you on the calendar.",
    eyebrow: "Spring",
    headline: "Your sprinklers have been asleep since October",
    paragraphs: [
      "Warm enough now that it is safe to pressurize the system, so I am filling in the spring schedule.",
      "I run every zone, adjust the heads, check for anything that cracked over winter, and set the controller for the season. Pick a day and I will handle it.",
    ],
    price: { amount: "$145", note: "up to 8 zones &middot; $10 for each zone after that" },
    cta: { label: "Book Your Turn-On", url: "https://www.trailheadirrigation.com/book?service=spring-turn-on" },
    ctaNote: "Spring is the busiest stretch of my year. Earlier booking means a better pick of days.",
    tip: {
      title: "Do not turn it on yourself just because it is warm out.",
      body: "One hard freeze after you pressurize the lines and you are looking at a repair bill instead of a turn-on. Wait until overnight lows stay above freezing for a solid week.",
    },
    ps: null,
  },

  "christmas-lights": {
    name: "Christmas lights - existing customers",
    subject: "Want your lights up before Thanksgiving?",
    preheader: "We are doing Christmas lights this year. Spots are limited.",
    eyebrow: "New",
    headline: "We hang Christmas lights now",
    paragraphs: [
      "Same crew you already know, on a ladder instead of in your valve box.",
      "We handle the roofline so you do not have to stand on anything you would rather not stand on.",
    ],
    price: null,
    cta: { label: "Get on the List", url: "https://www.trailheadirrigation.com/contact" },
    ctaNote: "Spots are limited and the good weekends go first.",
    tip: null,
    ps: null,
  },
}
