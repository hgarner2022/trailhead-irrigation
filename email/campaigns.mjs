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
    subject: "Sorry to bring this up while it's 90 out",
    preheader: "October fills up fast. Pick your date while it is still open.",
    eyebrow: "Yes, already",
    headline: "It is 90 degrees and I want to talk about frozen pipes",
    paragraphs: [
      "I know. It is going to hit the low 90s this week and here I am talking about freezing.",
      "But October is the month everybody remembers at once, and I would rather bug you in August than tell you in October that I am full. Pick a day that works and I will take it from there.",
    ],
    price: { amount: "$95", note: "up to 8 zones &middot; $7 for each zone after that" },
    // Linked poster frame, not an embedded player. See build-email.mjs.
    // thumbnail: for a YouTube upload use
    //   https://img.youtube.com/vi/<VIDEO_ID>/maxresdefault.jpg
    // href: point at the page on our own site that holds the video, so the
    // click lands somewhere with a Book button rather than on YouTube.
    video: {
      thumbnail: "https://www.trailheadirrigation.com/images/video-blowout-poster.jpg",
      href: "https://www.trailheadirrigation.com/sprinkler-blowout",
      alt: "Ryan explains why your sprinklers need a blowout",
      label: "Watch: 15 seconds on why this matters",
    },
    cta: { label: "Book Your Blowout", url: "https://www.trailheadirrigation.com/book?service=winterization" },
    ctaNote: "October books up quick every year. The earlier you grab a spot, the more say you have in the day.",
    tip: {
      title: "While I have you: do not cut your watering back yet.",
      body: "September air feels cool but the soil is still warm and the grass is still growing. Most of the sad brown lawns I get called about in October were shut off a month too early. Stay near an inch a week through September, then taper.",
    },
    ps: {
      eyebrow: "One more thing",
      title: "We are doing Christmas lights this year.",
      body: "You will be able to book it right on the site, and we handle the ladders and the roofline so you do not have to. Reply if you want me to hold you a spot.",
    },
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
