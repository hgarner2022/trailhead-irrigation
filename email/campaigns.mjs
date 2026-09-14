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
  /**
   * Aeration is the one service with its own Jobber form, so this campaign
   * points at /aeration rather than /book. Facts here are Trailhead's own:
   * the compaction line is Ryan's wording from /aeration and /services, the
   * 25% figure is the Erie soilType entry in city-data.ts, the plug guidance
   * is from the aeration FAQs, and the window runs end of August through
   * October. Trailhead does not offer overseeding, so it is not mentioned.
   */
  aeration: {
    name: "Aeration 2026 - existing customers",
    subject: "Thank you for a great season",
    preheader: "And if you do one more thing for the lawn this fall, make it this.",
    eyebrow: "Thank you",
    headline: "That is another watering season in the books",
    paragraphs: [
      "Before anything else, thank you. It has been a good season, and that is down to the people who keep calling us back. I do not take it for granted.",
      "There is one more thing worth doing before the year closes out, and on our soil it might be the highest value thing on the list. Core aeration.",
      "It reduces soil compaction so water, air, and nutrients can reach your lawn's roots instead of sitting on top of them. Front Range clay packs down hard over a summer, which is why a lawn can be watered right on schedule and still never seem to get a proper drink. Opening it back up is most of the battle, and a lawn that gets aerated every year can need up to 25 percent less water.",
      "The window is open now and runs through October. Cooler soil means the lawn bounces back faster than it would in the heat.",
    ],
    price: {
      amount: "$125",
      note: "lawns up to about 5,000 sq. ft. &middot; $160 up to about 10,000 sq. ft.",
    },
    cta: {
      label: "Book Core Aeration",
      url: "https://www.trailheadirrigation.com/aeration?utm_source=email&utm_medium=email&utm_campaign=aeration-2026",
    },
    ctaNote:
      "Aeration books on its own form, separate from the blowout. You are welcome to do one or the other, you do not have to do both.",
    tip: {
      title: "Leave the plugs where they land.",
      body:
        "They look untidy for a week or two and then they are gone. They break down on their own and put soil and organic matter back on the surface, which is a good part of the benefit. Raking them up is extra work that throws it away.",
    },
    servicesLabel: "Also this fall",
    services: [
      {
        name: "Sprinkler Blowout",
        price: "$95",
        body:
          "Up to 6 zones, then $10 for each zone after that. I am filling in the fall schedule now and October goes quickly, so the earlier you pick a day the more say you have in it.",
        link: {
          label: "Book your blowout",
          url: "https://www.trailheadirrigation.com/book?service=winterization&utm_source=email&utm_medium=email&utm_campaign=aeration-2026",
        },
      },
      {
        name: "Christmas Lights",
        body:
          "We handle the ladders and the roofline so you do not have to. Reply if you want me to hold you a spot.",
      },
    ],
    ps: null,
  },

  blowout: {
    name: "Blowout 2026 - existing customers",
    subject: "Sorry to bring this up while it's 90 out",
    preheader: "Putting the fall schedule together and wanted to give you first pick.",
    eyebrow: "Yes, already",
    headline: "It is 90 degrees and I want to talk about frozen pipes",
    paragraphs: [
      "I know it is 90 out and frozen pipes are the last thing on your mind. Mine too, honestly.",
      "I am putting the fall schedule together though, and I wanted to reach out to you first so you get the pick of the dates before October fills in.",
      "Really though, thank you for trusting us with your sprinklers this year. It means a lot, and I would be glad to keep looking after the system for you.",
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
    ctaNote: "October books up quick every year. The earlier you grab a spot, the more say you have in the day.",
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
        // Aeration now has its own page and its own Jobber form, so this is a
        // real second booking path rather than a teaser. The window is open
        // right now: end of August through October. Price stays off per
        // Hannah; the page carries it.
        name: "Core Aeration",
        body:
          "The window is open right now and runs through October. We pull small plugs of soil out across the lawn so water, air, and fertilizer can reach the roots instead of sitting on top of them. On Front Range clay that is most of the battle. It books on its own form, and you do not have to do both.",
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
