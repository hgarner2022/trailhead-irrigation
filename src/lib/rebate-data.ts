import { DollarSign, Droplets, Leaf, Wifi, CloudRain, Timer, Flower2 } from "lucide-react"
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
    badgeText: "Up to $200 in rebates",
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
      {
        name: "Rain Barrels",
        amount: "Up to $50 per barrel",
        icon: CloudRain,
        details: [
          "Up to 2 barrels per household",
          "Must be 55 gallons each",
          "Rebate will not exceed purchase price",
        ],
      },
      {
        name: "High-Efficiency Toilets",
        amount: "$100 per toilet (max $200)",
        icon: DollarSign,
        details: [
          "Must be WaterSense-labeled",
          "1.28 gallons per flush or less",
          "Limit 2 per household",
          "Old toilet must be recycled with proof",
        ],
      },
      {
        name: "Turf Replacement Program",
        amount: "Up to $2,000",
        icon: Flower2,
        details: [
          "Separate program for lawn-to-xeriscape conversion",
          "Contact Erie for full details",
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
    additionalPrograms: [
      {
        name: "Turf Replacement Program",
        description: "Up to $2,000 per household for replacing lawn with water-wise landscaping.",
        url: "https://www.erieco.gov/574/Water-Efficiency-Rebates",
      },
    ],
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
    badgeText: "Free smart controller installs",
    highlights: [
      "Free Rachio smart controller install (limited)",
      "Nozzle rebates: $3 each",
      "Drip equipment: up to $50",
    ],
    officialUrl: "https://www.lafayetteco.gov/3849/Outdoor-Water-Efficiency-Rebates",
    officialLabel: "City of Lafayette Water Efficiency Rebates",
    applicationUrl: "https://lafayetteco.gov/FormCenter/Sustainability-22/Outdoor-Water-Efficiency-Rebate-April-20-529",
    applicationLabel: "Lafayette Rebate Application",
    rebates: [
      {
        name: "Smart Controller (Rachio)",
        amount: "Free installation",
        icon: Wifi,
        details: [
          "Limited number available per season",
          "Installation begins mid-June",
          "Must book evaluation via Resource Central first",
          "Program reviews applications and schedules appointments",
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
    faqs: [
      {
        question: "Do I need a Slow the Flow evaluation for Lafayette rebates?",
        answer: "Yes. Lafayette requires proof of a completed Slow the Flow sprinkler evaluation from Resource Central before you can apply for any outdoor water efficiency rebate. This is a free service for Lafayette residents.",
      },
      {
        question: "How do I get a free smart controller in Lafayette?",
        answer: "Book a Slow the Flow evaluation through Resource Central (303-999-3824 or water@resourcecentral.org). After the evaluation, you will receive a link to the smart controller eligibility application. A limited number of free Rachio controllers are available each season, installed starting mid-June.",
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
          "Available June through August",
        ],
      },
      {
        name: "Lawn Replacement Program",
        amount: "$750 credit",
        icon: Flower2,
        details: [
          "Through Resource Central partnership",
          "Professional removal or DIY with free Garden In A Box kits",
          "Minimum 200 sq ft of lawn replacement",
          "At least 50% water-wise plants required",
        ],
      },
      {
        name: "Garden In A Box",
        amount: "$25 off per kit",
        icon: Leaf,
        details: [
          "Professionally designed, water-wise garden kits",
          "Colorado-adapted perennial plants",
          "Pre-orders: March for spring, June for late summer",
          "Discount applied automatically at checkout",
        ],
      },
    ],
    howToApply: {
      steps: [
        "Join the 2026 interest list at slowtheflow.resourcecentral.org.",
        "Receive a confirmation email with a link to the eligibility application.",
        "Complete the eligibility form for the program(s) you want.",
        "Resource Central reviews applications and schedules appointments (starting mid-June).",
        "For lawn replacement, apply at resourcecentral.org/lawn/apply.",
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
      {
        question: "What is the Louisville lawn replacement program?",
        answer: "Louisville partners with Resource Central to offer a $750 credit toward professional lawn removal, or free Garden In A Box kits if you do it yourself. You must replace at least 200 square feet and use at least 50% water-wise plants. Apply at resourcecentral.org/lawn/apply.",
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
    additionalPrograms: [
      {
        name: "Lawn Replacement Program",
        description: "$750 credit via Resource Central for professional lawn removal, or free Garden In A Box kits for DIY. Minimum 200 sq ft.",
        url: "https://resourcecentral.org/lawn/apply",
      },
      {
        name: "Coloradoscape Design Templates",
        description: "Free downloadable landscape design templates from the City of Longmont. Designs save 10,000-40,000 gallons per year.",
        url: "https://longmontcolorado.gov/water/water-conservation/",
      },
    ],
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
