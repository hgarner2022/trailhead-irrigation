import { Droplets, Leaf, Wifi, CloudRain, Timer, Flower2, ScanSearch } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type Rebate = {
  name: string
  amount: string
  icon: LucideIcon
  details: string[]
  brands?: string[]
}

export type CityRebateData = {
  slug: string
  name: string
  state: string
  tagline: string
  badgeText: string
  highlights: string[]
  officialUrl: string
  officialLabel: string
  applicationUrl: string
  applicationLabel: string
  rebates: Rebate[]
  howToApply: {
    steps: string[]
    purchaseWindow?: string
    submissionDeadline?: string
  }
  slowTheFlowRequired: boolean
  slowTheFlowNote: string
  additionalPrograms?: { name: string; description: string; url?: string }[]
  faqs: { question: string; answer: string }[]
}

export const CITIES: CityRebateData[] = [
  {
    slug: "erie",
    name: "Erie",
    state: "CO",
    tagline: "Rebates available for Town of Erie utility customers — while funds last.",
    badgeText: "Up to $100 in rebates",
    highlights: [
      "Smart controllers: $100 rebate",
      "High-efficiency nozzles: $3 each",
      "Drip line conversion: up to $75",
    ],
    officialUrl: "https://www.erieco.gov/574/Water-Efficiency-Rebates",
    officialLabel: "Town of Erie Water Efficiency Rebates",
    applicationUrl: "https://erieco-sustainability.app.transform.civicplus.com/forms/47076",
    applicationLabel: "Erie Rebate Application",
    rebates: [
      {
        name: "Smart Irrigation Controller",
        amount: "$100",
        icon: Wifi,
        details: [
          "Must be WaterSense-labeled",
          "Limit 1 per household",
          "Must be connected to permanent in-ground irrigation system",
        ],
      },
      {
        name: "High-Efficiency Nozzles",
        amount: "$3 per nozzle (up to $72)",
        icon: Droplets,
        details: [
          "Up to 24 nozzles per household",
          "Rebate will not exceed purchase price",
        ],
        brands: ["Hunter", "K Rain", "Orbit", "Rain Bird", "Toro"],
      },
      {
        name: "Drip Line Conversion",
        amount: "50% rebate up to $75",
        icon: Leaf,
        details: [
          "Covers drip equipment and conversion kits",
          "Rebate will not exceed purchase price",
        ],
      },
    ],
    howToApply: {
      steps: [
        "Research qualified fixtures and review rebate limitations on the Town of Erie website.",
        "Purchase and install qualifying items at your Erie service address.",
        "Complete the online rebate application with your utility billing account number, scanned receipts showing purchase date, make, and model, and installation date.",
      ],
      purchaseWindow: "January 1 – December 31, 2026",
      submissionDeadline: undefined,
    },
    slowTheFlowRequired: false,
    slowTheFlowNote: "Erie offers free Slow the Flow sprinkler consultations through Resource Central. While not required for rebates, it is a great way to identify where efficient upgrades will save the most water.",
    faqs: [
      {
        question: "Who is eligible for Erie water rebates?",
        answer: "You must be a current Town of Erie utility customer with a non-delinquent account. Items must be purchased between January 1 and December 31, 2026, and installed at a Town of Erie service address.",
      },
      {
        question: "How do I receive my Erie rebate?",
        answer: "Rebates under $200 are credited to your water bill within one billing cycle. Rebates over $200 are sent as checks. Rebates are processed on a first-come, first-served basis until funding is exhausted.",
      },
      {
        question: "Can renters apply for Erie rebates?",
        answer: "Renters or HOA-billed customers should email rebates@erieco.gov for specific eligibility guidance.",
      },
    ],
  },
  {
    slug: "lafayette",
    name: "Lafayette",
    state: "CO",
    tagline: "Rebates available for City of Lafayette residents — while funds last.",
    badgeText: "Up to $100 + free installs",
    highlights: [
      "Smart controller rebate: up to $100",
      "Free Rachio + rain sensor install (limited)",
      "Nozzle rebates: $3 each",
    ],
    officialUrl: "https://www.lafayetteco.gov/3849/Outdoor-Water-Efficiency-Rebates",
    officialLabel: "City of Lafayette Water Efficiency Rebates",
    applicationUrl: "https://lafayetteco.gov/FormCenter/Sustainability-22/Outdoor-Water-Efficiency-Rebate-April-20-529",
    applicationLabel: "Lafayette Rebate Application",
    rebates: [
      {
        name: "WaterSense Smart Controller",
        amount: "Up to $100",
        icon: Wifi,
        details: [
          "Must be WaterSense certified",
          "Purchase and install, then submit receipt for rebate",
          "Up to $100 per unit credited to utility bill",
          "Separate from the free Rachio install program below",
        ],
      },
      {
        name: "Free Rachio Smart Controller",
        amount: "Free installation",
        icon: Wifi,
        details: [
          "Limited number available per season",
          "2026 applications open now, installs begin mid-June",
          "Must complete Slow the Flow evaluation first",
          "Applied through Resource Central",
        ],
      },
      {
        name: "Free Rain Bird Rain Sensor",
        amount: "Free installation",
        icon: CloudRain,
        details: [
          "Wireless rain sensor installed at no cost",
          "Limited sensors available per season",
          "2026 applications open now, installs begin mid-June",
          "Applied through Resource Central",
        ],
      },
      {
        name: "Rotary / High-Efficiency Nozzles",
        amount: "$3 per nozzle",
        icon: Droplets,
        details: [
          "Minimum 10, maximum 50 per residence",
          "One-time rebate per residence per 10-year period",
        ],
        brands: ["Hunter MP", "Rain Bird", "Toro Precision", "K-Rain"],
      },
      {
        name: "Drip Equipment",
        amount: "Up to $50",
        icon: Leaf,
        details: [
          "Limit 1 rebate per residence",
          "Includes drip conversion kits, drip lines, emitters, pressure reducers, distribution lines, timers, and valves (15-40 psi)",
        ],
      },
    ],
    howToApply: {
      steps: [
        "Complete a sprinkler evaluation through Resource Central's Slow the Flow program (required).",
        "Purchase qualifying equipment within the last 6 months.",
        "Submit legible purchase receipt identifying the approved product.",
        "Provide a legible copy of your Slow the Flow report.",
        "Include an Affidavit of Lawful Presence and identification copy (per Colorado HB 06S-1023).",
        "Upon approval, credit is applied to your utility bill.",
      ],
      purchaseWindow: "Items purchased within last 6 months",
      submissionDeadline: undefined,
    },
    slowTheFlowRequired: true,
    slowTheFlowNote: "Lafayette requires proof of a completed Slow the Flow sprinkler evaluation from Resource Central before you can apply for any outdoor water rebates. Sign up at resourcecentral.org/sprinklers/residential/.",
    additionalPrograms: [
      {
        name: "Lawn Replacement Program",
        description: "Up to $750 in discounts for replacing lawn with low-water landscaping. Includes professional removal service or DIY removal with up to 4 free Garden In A Box kits. Eligible properties need at least 200 sq ft of healthy lawn.",
        url: "https://www.lafayetteco.gov/1419/Water-Efficiency",
      },
      {
        name: "Garden In A Box",
        description: "Discounted low-water garden kits with city discounts applied at checkout. Income-qualified residents receive additional discounts. Designed for Colorado's climate with native and xeric plants.",
        url: "https://www.lafayetteco.gov/1419/Water-Efficiency",
      },
    ],
    faqs: [
      {
        question: "Do I need a Slow the Flow evaluation for Lafayette rebates?",
        answer: "Yes. Lafayette requires proof of a completed Slow the Flow sprinkler evaluation from Resource Central before you can apply for any outdoor water efficiency rebate. This is a free service for Lafayette residents.",
      },
      {
        question: "What's the difference between the free Rachio install and the $100 controller rebate?",
        answer: "Lafayette offers two paths to a smart controller. The free Rachio install is a limited program through Resource Central where they install a Rachio controller at no cost (slots fill up fast). The $100 rebate lets you buy any WaterSense-certified controller yourself and get up to $100 credited to your utility bill. If the free installs are full, the rebate is a great alternative.",
      },
      {
        question: "How do I get a free smart controller or rain sensor in Lafayette?",
        answer: "Book a Slow the Flow evaluation through Resource Central (303-999-3824 or water@resourcecentral.org). 2026 applications are open now. After the evaluation, you will receive a link to the eligibility application. A limited number of free Rachio controllers and Rain Bird rain sensors are available each season, with installations starting mid-June.",
      },
      {
        question: "What is the Affidavit of Lawful Presence?",
        answer: "Per Colorado House Bill 06S-1023, Lafayette requires an Affidavit of Lawful Presence and a copy of your identification with your rebate application. The affidavit form is available on the City of Lafayette website.",
      },
    ],
  },
  {
    slug: "louisville",
    name: "Louisville",
    state: "CO",
    tagline: "Free programs available for City of Louisville water customers.",
    badgeText: "Free smart controllers & evaluations",
    highlights: [
      "Free Rachio 3 smart controller install",
      "Free rain sensor install",
      "Free Slow the Flow evaluation",
    ],
    officialUrl: "https://www.louisvilleco.gov/living-in-louisville/residents/sustainability/water",
    officialLabel: "City of Louisville Water Conservation",
    applicationUrl: "https://slowtheflow.resourcecentral.org",
    applicationLabel: "Sign Up via Resource Central",
    rebates: [
      {
        name: "Free Smart Controller (Rachio 3)",
        amount: "Free",
        icon: Wifi,
        details: [
          "WiFi-enabled, auto-adjusts watering based on weather",
          "Controllable via mobile app",
          "Limited controllers available per season",
          "2026 applications currently open",
        ],
      },
      {
        name: "Free Rain Sensor (Rain Bird WR2)",
        amount: "Free",
        icon: CloudRain,
        details: [
          "Wireless rain sensor",
          "Detects rainfall and pauses sprinklers automatically",
          "Limited sensors available per season",
        ],
      },
      {
        name: "Free Slow the Flow Evaluation",
        amount: "Free",
        icon: Droplets,
        details: [
          "60-90 minute on-site sprinkler evaluation",
          "Custom watering schedule for your property",
          "Efficiency testing and recommendations",
          "Available during irrigation season (starting mid-June)",
        ],
      },
    ],
    howToApply: {
      steps: [
        "Join the 2026 interest list at slowtheflow.resourcecentral.org.",
        "Receive a confirmation email with a link to the eligibility application.",
        "Complete the eligibility form for the program(s) you want.",
        "Resource Central reviews applications and schedules appointments (starting mid-June).",
      ],
      purchaseWindow: undefined,
      submissionDeadline: undefined,
    },
    slowTheFlowRequired: false,
    slowTheFlowNote: "Louisville offers free Slow the Flow evaluations through Resource Central. Signing up also puts you in the queue for free smart controller and rain sensor installations.",
    additionalPrograms: [
      {
        name: "Free Waterwise Yard Seminars",
        description: "Free virtual workshops on low-water landscaping, xeric plants, and smart irrigation. Taught by local landscape professionals.",
        url: "https://resourcecentral.org/seminars/",
      },
    ],
    faqs: [
      {
        question: "How do I get a free smart controller in Louisville?",
        answer: "Sign up at slowtheflow.resourcecentral.org to join the 2026 interest list. You will receive a confirmation email with a link to the eligibility application. A limited number of Rachio 3 controllers are available each season, with installations starting mid-June.",
      },
      {
        question: "What does a Slow the Flow evaluation include in Louisville?",
        answer: "A trained technician visits your home for 60-90 minutes. They inspect all irrigation zones, run efficiency tests with catch cups, create a custom watering schedule for your property, and provide a detailed report with recommendations. The service is completely free for Louisville water customers.",
      },
    ],
  },
  {
    slug: "longmont",
    name: "Longmont",
    state: "CO",
    tagline: "Rebates available for City of Longmont residential water customers — while funds last.",
    badgeText: "Up to $130 per rebate",
    highlights: [
      "Drip conversion: up to $130",
      "Flow sensors: up to $130",
      "Rotary nozzles: $4 each",
    ],
    officialUrl: "https://longmontcolorado.gov/water/rates-and-fees-water-storm-sewer/assistance-rebates-water/",
    officialLabel: "City of Longmont Water Rebates",
    applicationUrl: "https://longmontcityxm.gov1.qualtrics.com/jfe/form/SV_80oznIAPDni8TPg",
    applicationLabel: "Longmont Rebate Application",
    rebates: [
      {
        name: "Weather-Based Irrigation Controller",
        amount: "Up to $65",
        icon: Wifi,
        details: [
          "Must be WaterSense certified",
          "Must be connected to permanent in-ground irrigation system",
          "Proof of purchase with model number required",
        ],
      },
      {
        name: "Rotary / High-Efficiency Nozzles",
        amount: "Up to $4 each",
        icon: Droplets,
        details: [
          "Minimum of 3 nozzles required",
          "Slowly deliver multiple rotating streams to reduce waste",
        ],
      },
      {
        name: "Rain Sensor",
        amount: "$20 (wired) / $40 (wireless)",
        icon: CloudRain,
        details: [
          "Must be connected to permanent in-ground irrigation system",
          "Pauses irrigation during rainfall",
        ],
      },
      {
        name: "Soil Moisture Sensor",
        amount: "Up to $60",
        icon: Leaf,
        details: [
          "Must be connected to permanent in-ground system",
          "Calibrates with controller to irrigate only when moisture is depleted",
        ],
      },
      {
        name: "Flow Sensor",
        amount: "Up to $130",
        icon: Timer,
        details: [
          "Must be connected to a WaterSense irrigation controller",
          "Measures water flow and sends data to controller",
          "Helps detect leaks and overwatering",
        ],
      },
      {
        name: "Drip Conversion Equipment",
        amount: "Up to $130",
        icon: Leaf,
        details: [
          "For converting turf zones to drip irrigation",
          "Eligible: drip hose, conversion heads, emitters, hooks/clamps, risers",
        ],
      },
      {
        name: "Spigot Timer",
        amount: "Up to $65",
        icon: Timer,
        details: [
          "Must have automatic shutoff",
          "Prevents overwatering from hose-end sprinklers",
        ],
      },
    ],
    howToApply: {
      steps: [
        "Purchase qualifying equipment from any retailer.",
        "Install the equipment at your Longmont residential service address.",
        "Submit the online rebate application within 45 days of purchase or installation.",
        "Include proof of purchase with model number.",
        "Rebates are processed on a first-come, first-served basis while funds are available.",
      ],
      purchaseWindow: "Year-round (submit within 45 days of purchase)",
      submissionDeadline: "45 days after purchase/installation",
    },
    slowTheFlowRequired: false,
    slowTheFlowNote: "Longmont offers free Slow the Flow evaluations through Resource Central. After completing an evaluation, you may qualify for a $50 bonus rebate on a Wi-Fi irrigation controller (in addition to the standard rebate).",
    faqs: [
      {
        question: "How long do I have to submit a Longmont rebate application?",
        answer: "You must submit your rebate application within 45 days of purchase or installation. Applications are processed on a first-come, first-served basis while funds are available.",
      },
      {
        question: "Can I combine multiple Longmont rebates?",
        answer: "Yes. You can apply for rebates on multiple qualifying items. Each rebate type has its own limits. For example, you could get rebates on a smart controller, rotary nozzles, and drip conversion equipment all in the same year.",
      },
      {
        question: "Does Longmont require a Slow the Flow evaluation for rebates?",
        answer: "No, but it is recommended. A free Slow the Flow evaluation helps identify where upgrades will save the most water. After completing an evaluation, Longmont residents may also qualify for a $50 bonus rebate on a Wi-Fi irrigation controller.",
      },
      {
        question: "Is Longmont currently in a drought?",
        answer: "As of 2026, Longmont is at a Sustainable Conservation Level — Drought Watch. While no mandatory restrictions are in place, the city strongly encourages voluntary water reduction. This makes irrigation efficiency rebates especially timely.",
      },
    ],
  },
]

export const SLOW_THE_FLOW = {
  name: "Slow the Flow",
  provider: "Resource Central",
  description: "A free sprinkler evaluation program available to homeowners in participating Colorado communities. A trained technician visits your home, tests your sprinkler system efficiency, and creates a custom watering schedule for your property.",
  includes: [
    "60-90 minute on-site evaluation",
    "Visual inspection of all irrigation zones",
    "Efficiency testing with catch cups",
    "Custom watering schedule creation",
    "Detailed report with recommendations",
  ],
  url: "https://resourcecentral.org/sprinklers/residential/",
  signupUrl: "https://slowtheflow.resourcecentral.org",
  phone: "303-999-3824",
  email: "water@resourcecentral.org",
  season: "June through August (sign up for 2026 interest list now)",
  note: "This is a free community resource — not a Trailhead service. Some cities (like Lafayette) require a Slow the Flow evaluation before you can apply for rebates.",
}
