export interface CityData {
  slug: string
  name: string
  county: string
  population: string
  elevation: string
  waterProvider: string
  waterProviderPhone?: string
  waterProviderEmail?: string
  restrictionLevel: "mandatory" | "voluntary" | "none"
  restrictionSummary: string
  wateringDays: string
  wateringTimeRestriction: string
  backflowDeadline: string
  backflowDevice: string
  soilType: string
  housingAge: string
  cityNote: string
  /**
   * City-specific winterization context, surfaced in the blowout section on
   * /services/[city]. Written per city rather than templated so the section
   * isn't near-duplicate copy across pages.
   */
  winterNote?: string
  introText: string
  whyLocal: string
  faqs: { question: string; answer: string }[]
  relatedBlogSlugs: string[]
  /**
   * Field-guide content for the Nov 2026 city page template. Optional so a
   * city can ship with the data above and pick these up as photos and
   * Ryan's notes arrive. Sections that need a missing field are skipped.
   */
  guide?: CityGuide
}

export interface CityGuide {
  /** A photo of the town for the "Ryan on {City}" block. */
  placeImage?: string
  placeAlt?: string
  /** Big number on the local sign, e.g. "2". */
  wateringDaysPerWeek?: string
  /** One line on the rebate, with the page it links to. */
  rebate?: { label: string; href: string }
  /** When the watering and backflow rules were last checked. */
  rulesCheckedOn: string
  neighborhoods?: string[]
  /** Ryan, first person, about where he works in this town. */
  ryanNote?: string
  /** One local sentence per service tile, keyed by the tile href. */
  serviceNotes?: Record<string, string>
  /** Authors of Google reviews from customers in this city (see reviews.ts). */
  reviewAuthors?: string[]
}

export const CITY_DATA: CityData[] = [
  {
    slug: "erie",
    name: "Erie",
    county: "Weld & Boulder County",
    population: "42,700+",
    elevation: "5,000 ft",
    waterProvider: "Town of Erie Water Department",
    waterProviderPhone: "303-926-2870",
    restrictionLevel: "voluntary",
    restrictionSummary: "Erie is on a voluntary two-day-a-week schedule right now, and the Town can add a third day during hot stretches.",
    wateringDays: "Even addresses: Monday & Thursday. Odd addresses: Tuesday & Friday. During extreme heat, the Town may authorize a third day (Even adds Saturday, Odd adds Sunday).",
    wateringTimeRestriction: "The Town recommends watering during cool morning hours to reduce evaporation. No formal time-of-day ban published.",
    backflowDeadline: "Colorado state law requires annual testing. Contact the Town of Erie at 303-926-2870 for the local compliance deadline.",
    backflowDevice: "PVB or RPZ assemblies accepted per Colorado state requirements.",
    soilType: "Heavy clay-loam soil that expands when wet and contracts when dry. Cycle-and-soak irrigation is essential to prevent runoff.",
    housingAge: "Predominantly newer construction (post-2000). Major communities include Erie Highlands, Collier's Hill, Flatiron Meadows, Compass, and Brennan.",
    cityNote: "Erie went through a water supply emergency in early 2026 that banned residential sprinkler use through March. The town now asks for two watering days a week.",
    winterNote:
      "Erie is home base, so this is the town we blow out the most systems in every October. The heavy clay holds water against the pipe, so a system that wasn't fully cleared has more standing water sitting in it than a sandier lot would. Most of Erie's newer subdivisions, including Erie Highlands, Collier's Hill and Flatiron Meadows, were also built with the backflow assembly above ground in an exposed spot. That is the part that cracks first in a hard freeze.",
    introText: "Trailhead Lawn & Irrigation is based right here in Erie. We're the local sprinkler company your neighbors call for installations, repairs, winterization, and spring turn-ons. We know Erie's heavy clay soil, the Town's watering schedule, and which neighborhoods need extra attention.",
    whyLocal: "We're based in Erie. When you call us, we're already close. We know the soil, the water restrictions, and the neighborhoods. We've worked in Erie Highlands, Collier's Hill, Flatiron Meadows, and most of the newer developments in town.",
    faqs: [
      {
        question: "What are Erie's watering restrictions in 2026?",
        answer: "Erie is under a voluntary 2-day-per-week schedule. Even addresses water Monday and Thursday, odd addresses water Tuesday and Friday. The Town may authorize a third day during extreme heat. Check erieco.gov/drought for the latest updates.",
      },
      {
        question: "How much does sprinkler installation cost in Erie?",
        answer: "Most residential sprinkler installations in Erie cost between $3,000 and $6,000 depending on yard size, number of zones, and controller type. We quote on-site after walking the property.",
      },
      {
        question: "When should I turn on my sprinklers in Erie?",
        answer: "Late April to early May, once nights stay above freezing for about a week. We run every zone, check every head and set the controller for Erie's schedule while we're there.",
      },
      {
        question: "Does Erie require annual backflow testing?",
        answer: "Yes. Colorado state law requires annual backflow testing for all irrigation systems connected to municipal water. Contact the Town of Erie at 303-926-2870 for your specific deadline.",
      },
    ],
    relatedBlogSlugs: ["spring-sprinkler-startup-colorado", "water-optimization-tips-colorado", "colorado-water-restrictions-2026"],
    guide: {
      placeImage: "/images/erie-old-town-briggs-street.jpg",
      placeAlt: "Looking down Briggs Street in Old Town Erie, Colorado",
      wateringDaysPerWeek: "2",
      rebate: { label: "Town of Erie rebate on WaterSense smart controllers", href: "/water-rebates/erie" },
      rulesCheckedOn: "November 1, 2026",
      neighborhoods: ["Erie Highlands", "Collier's Hill", "Flatiron Meadows", "Compass", "Brennan", "Old Town"],
      ryanNote:
        "Erie is home. I know the clay, the Town's watering schedule and just about every neighborhood here. I've worked in Erie Highlands, Collier's Hill, Flatiron Meadows, Compass and most of the newer developments, and in Old Town too.",
      serviceNotes: {
        "/spring-turn-on": "Erie asks for two watering days a week, so at turn-on we set the controller to the Town's schedule.",
        "/sprinkler-repair": "Most Erie homes were built after 2000 with the original builder system, and we work on all of them.",
        "/sprinkler-blowout": "Many Erie subdivisions have the backflow above ground in an exposed spot, so it is the first thing we clear.",
        "/sprinkler-installation": "Erie's clay-loam swells when wet and shrinks when dry, so we design for cycle-and-soak watering from the start.",
        "/smart-controllers": "The Town of Erie offers a rebate on WaterSense controllers like the Rachio 3.",
        "/water-efficiency": "Rotator nozzles and drip lines stretch Erie's two-day watering schedule further.",
      },
      reviewAuthors: ["Joanna Toy", "Jeremy Hampton", "Brent Bell", "Alyson Tobyne"],
    },
  },
  {
    slug: "longmont",
    name: "Longmont",
    county: "Boulder County",
    population: "98,900+",
    elevation: "4,979 ft",
    waterProvider: "City of Longmont Water Department",
    waterProviderPhone: "303-651-8416",
    waterProviderEmail: "backflow@longmontcolorado.gov",
    restrictionLevel: "voluntary",
    restrictionSummary: "Longmont holds some of the most senior water rights on the South Platte River, giving it more supply security than neighboring communities. The city is currently at a Drought Watch level with voluntary restrictions only.",
    wateringDays: "Voluntary guideline: water no more than twice per week. No mandatory odd/even schedule.",
    wateringTimeRestriction: "Voluntary: water before 10 AM or after 6 PM. The city advises not turning on automatic sprinklers until May.",
    backflowDeadline: "Annual testing required between April and September. The city assigns specific deadlines per property. Results reported to backflow@longmontcolorado.gov.",
    backflowDevice: "RPZ (Reduced Pressure Zone) assemblies required. DCVAs (Double Check Valve Assemblies) are no longer allowed for new irrigation connections.",
    soilType: "Heavy clay-loam soil consistent with the Northern Front Range. Alkaline pH with poor natural drainage. Cycle-and-soak irrigation recommended to prevent runoff on clay.",
    housingAge: "Most homes built in the 1970s-1980s. Many irrigation systems are aging and may need updates, repairs, or full replacements. Newer developments on the south and east edges include Somerset Meadows and Idaho Creek.",
    cityNote: "Longmont's senior water rights mean residents are less likely to face severe mandatory restrictions compared to other Front Range cities. The city's backflow program is well-established and actively enforced.",
    winterNote:
      "Longmont has a lot of established housing with irrigation that predates current standards. Older brass valves, galvanized sections and drain layouts that never fully clear by gravity are common here. Those are the systems where a compressed-air blowout matters most, rather than opening a drain valve and hoping. Longmont also enforces its backflow program actively, so we note the condition of your assembly at winterization and tell you if it looks likely to fail next year's test.",
    introText: "Trailhead serves Longmont. We install, repair, blow out and turn on sprinkler systems across the city. A lot of the homes here have systems from the 1970s and 80s that need repair or upgrading.",
    whyLocal: "We're 15 minutes from Longmont. A lot of the systems here are 30 to 40 years old, and the usual problems are low pressure, worn valves and controllers that predate the current backflow rules. We repair those, and we'll tell you when replacing makes more sense than patching.",
    faqs: [
      {
        question: "Does Longmont have watering restrictions in 2026?",
        answer: "Longmont is at a Drought Watch level with voluntary guidelines: water no more than twice a week, before 10 AM or after 6 PM.",
      },
      {
        question: "How much does sprinkler repair cost in Longmont?",
        answer: "A repair visit is $145 and covers the diagnosis, and we take care of small fixes where we can. Anything bigger is priced before we start.",
      },
      {
        question: "Does Longmont require backflow testing?",
        answer: "Yes. The City of Longmont requires annual backflow testing between April and September. They assign specific deadlines per property. Only RPZ devices are accepted for new installations. Contact backflow@longmontcolorado.gov or 303-651-8416.",
      },
      {
        question: "My sprinkler system in Longmont is old. Should I replace it?",
        answer: "If you're dealing with frequent repairs, low pressure or uneven coverage, a new system can make more sense than patching the old one. We'll come look and tell you honestly which way is right for your yard.",
      },
    ],
    relatedBlogSlugs: ["signs-irrigation-system-needs-repair", "smart-irrigation-controllers-worth-it", "how-much-does-sprinkler-system-cost-colorado"],
    guide: {
      placeImage: "/images/longmont-main-street-aerial.jpg",
      placeAlt: "Main Street in Longmont, Colorado from the air on a summer evening",
      wateringDaysPerWeek: "2",
      rebate: { label: "Longmont rebates on Wi-Fi controllers, nozzles and drip", href: "/water-rebates/longmont" },
      rulesCheckedOn: "November 1, 2026",
      neighborhoods: ["Old Town", "Prospect", "Southmoor Park", "Somerset Meadows", "Idaho Creek", "Ute Creek"],
      ryanNote:
        "Longmont has some of the most established yards around, with big trees and lawns that have been cared for over decades. I enjoy working on those older systems and keeping them running well. I work all over town, from Old Town out to the newer streets on the south and east side.",
      serviceNotes: {
        "/spring-turn-on": "Longmont asks you to hold off on automatic sprinklers until May, so we schedule turn-ons here a little later than in Erie.",
        "/sprinkler-repair": "Many Longmont systems date to the 70s and 80s. We work on the older brass and galvanized parts as well as new PVC.",
        "/sprinkler-blowout": "A lot of Longmont systems were built to drain on their own, and a compressed-air blowout clears what gravity leaves behind.",
        "/sprinkler-installation": "Longmont requires an RPZ backflow on new irrigation connections, and we install to that standard.",
        "/smart-controllers": "Longmont pays a rebate on Wi-Fi controllers, with a bonus after a free Slow the Flow evaluation.",
        "/water-efficiency": "Longmont also pays rebates on rotary nozzles, drip conversion and rain sensors, so these upgrades cost less here.",
      },
      reviewAuthors: ["Scott Przygocki", "Brian Salts-Halcomb", "Lori Larrabee"],
    },
  },
  {
    slug: "louisville",
    name: "Louisville",
    county: "Boulder County",
    population: "20,600+",
    elevation: "5,335 ft",
    waterProvider: "City of Louisville Public Works / Water Division",
    waterProviderPhone: "303-335-4785",
    waterProviderEmail: "backflow@LouisvilleCO.gov",
    restrictionLevel: "voluntary",
    restrictionSummary: "Louisville is under voluntary drought restrictions. The city recommends watering no more than twice per week during evening, night, or early morning hours.",
    wateringDays: "Voluntary guideline: water no more than twice per week. No mandatory odd/even schedule published.",
    wateringTimeRestriction: "Recommended: water during evening, night, or early morning. The city advises not turning on sprinklers until May or June.",
    backflowDeadline: "September 30 each year. Test results must be submitted through BSI Online (bsionline.com). Contact backflow@LouisvilleCO.gov or 303-335-4785.",
    backflowDevice: "RPZ or PVB assemblies accepted. Testing must be performed by a state-licensed backflow tester (required since July 2024).",
    soilType: "Clay-loam soil at the base of the foothills. Terrain is slightly more varied than the plains cities, with some hillier lots near Coal Creek and the western edges of town. Slopes may need different head types and zone configurations.",
    housingAge: "Median home built around 1991. Mix of 1970s-1990s neighborhoods with some newer development. The Marshall Fire (December 2021) destroyed 1,000+ homes in the Louisville/Superior area. Rebuilt homes present opportunities for modern irrigation systems.",
    cityNote: "Louisville has the highest median home value in the area at ~$835,000. Homeowners here invest in their properties. The Marshall Fire rebuilds mean many homes now have brand new irrigation systems with smart controllers.",
    winterNote:
      "Louisville splits into two very different jobs. The Marshall Fire rebuilds have new systems on smart controllers, and those need the controller wintered properly along with the lines cleared. Putting a smart controller into standby is not the same as switching a mechanical timer off. The rest of Louisville is long-established, with mature trees whose roots run alongside the irrigation lines, so a freeze crack there is a harder repair to dig out.",
    introText: "Trailhead serves Louisville. We install, repair, winterize and turn on sprinkler systems across the city, on established yards and brand-new ones.",
    whyLocal: "Louisville's lots near Coal Creek and on the west side of town are hillier than the plains cities, so a head layout that works in Erie doesn't always work here. We lay out zones and pick heads for the slope.",
    faqs: [
      {
        question: "Does Louisville have watering restrictions?",
        answer: "Louisville is under voluntary drought restrictions. The city recommends watering no more than twice per week during evening or early morning hours, and waiting until May or June to turn on sprinklers.",
      },
      {
        question: "When is the backflow testing deadline in Louisville?",
        answer: "September 30 each year. Results must be submitted through BSI Online. Contact backflow@LouisvilleCO.gov or 303-335-4785 with questions.",
      },
      {
        question: "Do you install sprinkler systems for rebuilt homes in Louisville?",
        answer: "Yes. We install new sprinkler systems for rebuilt homes and can design a modern system with smart controllers, efficient rotary nozzles, and drip irrigation for flower beds.",
      },
      {
        question: "How do I winterize my sprinklers in Louisville?",
        answer: "Schedule a professional sprinkler blowout between late September and October, before the first hard freeze. Louisville sits at 5,335 ft, so freezes can come earlier than lower-elevation cities. Our winterization service costs $95 for up to 6 zones.",
      },
    ],
    relatedBlogSlugs: ["when-to-winterize-sprinklers-colorado", "what-to-expect-sprinkler-installation", "smart-irrigation-controllers-worth-it"],
    guide: {
      placeImage: "/images/louisville-flatirons-fall.jpg",
      placeAlt: "Fall color and the Flatirons, looking west from Louisville, Colorado",
      wateringDaysPerWeek: "2",
      rebate: { label: "Free smart controllers and Slow the Flow evaluations through Resource Central", href: "/water-rebates/louisville" },
      rulesCheckedOn: "November 1, 2026",
      neighborhoods: ["Old Town", "Coal Creek Ranch", "Harper Lake", "Centennial Valley", "Steel Ranch", "North End"],
      ryanNote:
        "Louisville has some of the prettiest streets around, with mature trees and yards people really care about. I work all over town, from Old Town out to Coal Creek Ranch and Harper Lake, on brand-new systems and on ones that have been there for decades.",
      serviceNotes: {
        "/spring-turn-on": "Louisville's lots get hillier near Coal Creek, so at turn-on we check the slope zones and the heads at the bottom of them.",
        "/sprinkler-repair": "Louisville's older streets have beautiful mature trees, and we're used to working around their roots when we repair a line.",
        "/sprinkler-blowout": "Plenty of Louisville homes run smart controllers, and we put the controller into its winter setting along with clearing the lines.",
        "/sprinkler-installation": "Louisville's terrain varies more than the plains towns, so we lay out zones and head types by slope.",
        "/smart-controllers": "Resource Central installs a limited number of free smart controllers in Louisville. If you already have one, we can set it up and dial it in.",
        "/water-efficiency": "Louisville residents can get a free Slow the Flow evaluation, and we can do the nozzle and drip upgrades it recommends.",
      },
    },
  },
  {
    slug: "lafayette",
    name: "Lafayette",
    county: "Boulder County",
    population: "30,700+",
    elevation: "5,236 ft",
    waterProvider: "City of Lafayette Water Division",
    waterProviderPhone: "303-665-5588",
    restrictionLevel: "mandatory",
    restrictionSummary: "Lafayette has PERMANENT year-round water conservation restrictions (enacted 2013). These are not drought-triggered. Maximum 3 days per week for outdoor irrigation, with a mandatory ban on watering between 10 AM and 6 PM.",
    wateringDays: "Maximum 3 days per week (applies to all addresses). Low-volume drip irrigation is exempt from the 3-day limit.",
    wateringTimeRestriction: "Mandatory: no outdoor watering between 10 AM and 6 PM. Exception for hand-watering with a shut-off nozzle. Newly planted landscaping may be watered for up to 30 consecutive days from planting.",
    backflowDeadline: "Testing cycle runs January through August. Results submitted through BSI Online (backflow.com, 888-966-6050). Non-compliance can result in fees and water service interruptions.",
    backflowDevice: "PVB (Pressure Vacuum Breaker) for systems without injector pumps. RPZ (Reduced Pressure Assembly) required for systems with injector pumps.",
    soilType: "Clay-loam soil consistent with the Northern Front Range. Western portions closer to the foothills may have rockier, thinner soil that drains faster and needs different irrigation approaches.",
    housingAge: "Mix of older and newer neighborhoods. Popular areas include Indian Peaks, Waneka Lake, White Hawk Ranch, Spring Creek, and Blue Heron.",
    cityNote: "Lafayette is the only city in this area with permanent, year-round watering restrictions. This makes efficient irrigation system design especially important. Smart controllers that comply with the 3-day, no-midday-watering rules are a smart investment here.",
    winterNote:
      "Lafayette's watering restrictions are permanent rather than seasonal, so more homeowners here run smart controllers on tight schedules. At winterization that controller needs to come out of its watering program properly instead of being left to run against a drained system. We also see more drip and low-flow zones in Lafayette than elsewhere, and those get cleared carefully so the emitters stay on the tubing.",
    introText: "Trailhead serves Lafayette. Lafayette's watering restrictions are permanent, three days a week and nothing between 10 AM and 6 PM, so we design and program systems to work inside those rules year-round.",
    whyLocal: "Lafayette's permanent restrictions mean your sprinkler system needs to be efficient from day one. We program controllers to comply with the 3-day limit and 10 AM-6 PM blackout window, and recommend smart controllers that auto-adjust for weather.",
    faqs: [
      {
        question: "What are Lafayette's watering restrictions?",
        answer: "Lafayette has permanent year-round restrictions: maximum 3 days per week, no watering between 10 AM and 6 PM. These are not drought-triggered. Low-volume drip irrigation is exempt from the 3-day limit. Newly planted landscaping gets a 30-day exception.",
      },
      {
        question: "When is the backflow testing deadline in Lafayette?",
        answer: "Lafayette's backflow testing cycle runs January through August, administered through BSI Online. Call 888-966-6050 with questions.",
      },
      {
        question: "Do I need a smart controller in Lafayette?",
        answer: "We strongly recommend it. Lafayette's permanent restrictions mean your controller needs to handle the 3-day limit and avoid the 10 AM-6 PM blackout automatically. Smart controllers like Rachio or Hunter Hydrawise handle this and adjust for rain and temperature.",
      },
      {
        question: "How much does a sprinkler system cost in Lafayette?",
        answer: "Residential sprinkler installation in Lafayette typically runs $3,000-$6,000 depending on yard size and zone count. We can set up a smart controller and program it for Lafayette's three-day schedule.",
      },
    ],
    relatedBlogSlugs: ["smart-irrigation-controllers-worth-it", "colorado-water-restrictions-2026", "drip-irrigation-vs-spray-heads"],
    guide: {
      placeImage: "/images/lafayette-town.jpg",
      placeAlt: "Waneka Lake in Lafayette, Colorado in fall, with snow on the peaks behind it",
      wateringDaysPerWeek: "3",
      rebate: { label: "City of Lafayette smart controller rebate and free Rachio installs", href: "/water-rebates/lafayette" },
      rulesCheckedOn: "November 1, 2026",
      neighborhoods: ["Old Town", "Indian Peaks", "Waneka Lake", "White Hawk Ranch", "Spring Creek", "Blue Heron"],
      ryanNote:
        "I'm in Lafayette most weeks. There's a nice mix here, from the older streets around Old Town to Indian Peaks and Waneka Lake, and a lot of homeowners who take real pride in their gardens and drip beds.",
      serviceNotes: {
        "/spring-turn-on": "Lafayette limits watering to three days a week year-round, so at turn-on we set the controller to fit that schedule.",
        "/sprinkler-repair": "Lafayette mixes 70s neighborhoods with new builds, and we work on the old brass and the new PVC alike.",
        "/sprinkler-blowout": "Lafayette has more drip and low-flow zones than most towns, and we clear those gently so the emitters come through winter fine.",
        "/sprinkler-installation": "Lots on Lafayette's west side can be rockier and drain faster, so we design zones for the soil we actually find.",
        "/smart-controllers": "Lafayette pays a rebate on WaterSense controllers, and Resource Central runs a free Rachio install program.",
        "/water-efficiency": "Drip is exempt from Lafayette's three-day limit, so converting beds to drip gives you more room to water.",
      },
      reviewAuthors: ["Lori Ginn", "Daniel Cooperider", "Nicole Duke", "Todd Camnitz"],
    },
  },
  {
    slug: "firestone",
    name: "Firestone",
    county: "Weld County",
    population: "20,800+",
    elevation: "4,971 ft",
    waterProvider: "Town of Firestone (water supplied by Central Weld County Water District)",
    waterProviderPhone: "303-833-3291",
    restrictionLevel: "none",
    restrictionSummary:
      "Firestone has no mandatory watering schedule right now. The Town asks for sensible conservation, and we set run times to match.",
    wateringDays: "No mandatory schedule published. The Town requests voluntary conservation: water during cool morning hours and avoid overwatering.",
    wateringTimeRestriction: "No formal time-of-day ban. The Town recommends watering during cool morning hours to reduce evaporation.",
    backflowDeadline: "Colorado state law requires annual backflow testing. Contact the Town of Firestone Water Department at 303-833-3291 for local requirements.",
    backflowDevice: "Per Colorado state requirements. Contact the Town for specific device requirements.",
    soilType: "Clay to sandy-loam mix. Firestone sits on the eastern plains side of I-25, where soils trend slightly sandier than foothills communities. Expansive clay is still present in many areas.",
    housingAge: "Almost entirely newer construction (post-2000). Firestone grew from under 2,000 residents in 2000 to over 20,000 today. Most homes are in planned subdivisions with HOA-managed common areas.",
    cityNote: "Firestone's water supply is in transition. The Central Weld County Water District contract ends in August 2028, and the Town is actively securing alternative sources. Water efficiency will become increasingly important as this plays out.",
    winterNote:
      "Firestone is almost entirely post-2000 construction, so the systems here are new enough that homeowners often assume a blowout can wait. Age is not the protection. A two-year-old backflow assembly full of water cracks the same as a twenty-year-old one. Firestone also sits on the plains side of I-25 with more wind exposure, which pulls ground temperature down faster on the first hard freeze night.",
    introText: "Trailhead serves Firestone. Almost every home here was built after 2000, so most systems are fairly new. We handle repairs, blowouts and spring turn-ons across Firestone.",
    whyLocal: "Nearly every system in Firestone is newer construction. New systems still need a blowout each fall, a turn-on each spring, and a head replaced now and then after the mower finds it. We're a few minutes away in Erie.",
    faqs: [
      {
        question: "Does Firestone have watering restrictions?",
        answer: "Firestone has no mandatory watering schedule right now, only voluntary conservation guidelines. We set your run times for the soil and the weather here.",
      },
      {
        question: "Do you service sprinkler systems in Firestone?",
        answer: "Yes. We do sprinkler repair, fall blowouts, spring turn-ons, backflow testing and new installations throughout Firestone.",
      },
      {
        question: "My Firestone home is newer. Does the sprinkler system still need maintenance?",
        answer: "Yes. A newer system still wants a fall blowout and a spring turn-on every year. Heads get clipped by mowers, controllers need a seasonal reset, and a quick check each spring keeps everything running well for years.",
      },
      {
        question: "How much is a sprinkler blowout in Firestone?",
        answer: "Winterization (sprinkler blowout) costs $95 for up to 6 zones, plus $10 for each additional zone. Book between late September and October to get on the schedule before the first freeze.",
      },
    ],
    relatedBlogSlugs: ["when-to-winterize-sprinklers-colorado", "signs-irrigation-system-needs-repair", "how-to-adjust-sprinkler-heads"],
    guide: {
      placeImage: "/images/firestone-fall-pond.jpg",
      placeAlt: "Fall cottonwoods reflected in a pond in Firestone, Colorado",
      rulesCheckedOn: "November 1, 2026",
      neighborhoods: ["Saddleback", "Saint Vrain Ranch", "Booth Farms", "Stoneridge", "Barefoot Lakes", "Historic Firestone"],
      ryanNote:
        "Firestone is growing fast, and most of the yards here are newer, which makes for clean systems that are a pleasure to keep running right. I work in Saddleback, Saint Vrain Ranch and most of the newer subdivisions in town.",
      serviceNotes: {
        "/spring-turn-on": "Firestone has no mandatory watering schedule, so at turn-on we set run times for the sandier soil on this side of I-25.",
        "/sprinkler-repair": "Most Firestone systems went in with the house after 2000, and we know the parts the builders used.",
        "/sprinkler-blowout": "Firestone is open and breezy, so we like to get blowouts here done early in the season while the weather is still nice.",
        "/sprinkler-installation": "Firestone's soil runs sandier than the foothills towns, with pockets of expansive clay, so we check the soil before we lay out zones.",
        "/smart-controllers": "Firestone doesn't run a controller rebate, so a smart controller here pays for itself through the water bill.",
        "/water-efficiency": "Firestone's newer lots are big and open, and rotary nozzles cut wind drift on the wide zones.",
      },
    },
  },
  {
    // Sources (verified 2026-08-17):
    //   broomfield.org/4491/Drought-Levels-and-Status  — Drought Watch declared Feb 9 2026
    //   broomfield.org/4490/Water-Use-Ordinance        — even/odd days, 6pm-10am window
    //   broomfield.org/4249/Water-Use-and-Drought-Levels — 3 days normal / 2 requested
    // Broomfield is a consolidated city-county, so there is no separate county.
    slug: "broomfield",
    name: "Broomfield",
    county: "City and County of Broomfield",
    population: "80,200+",
    elevation: "5,344 ft",
    waterProvider: "City and County of Broomfield (Public Works)",
    waterProviderPhone: "303-469-3301",
    restrictionLevel: "voluntary",
    restrictionSummary:
      "Broomfield has been under a Drought Watch since February 2026. The City asks residents to water two days a week instead of the three the ordinance normally allows, and only between 6 p.m. and 10 a.m.",
    wateringDays:
      "Under the standing ordinance, addresses ending in an even number may water Monday, Wednesday, and Friday. Odd-numbered addresses may water Tuesday, Thursday, and Sunday. Under the current Drought Watch, the City asks you to use no more than two of your allowed days.",
    wateringTimeRestriction:
      "Watering is only permitted between 6 p.m. and 10 a.m. The 10 a.m. to 6 p.m. blackout is part of Broomfield's permanent water use ordinance, not a temporary drought measure. Leaking sprinkler systems must be repaired within 10 days of notice.",
    backflowDeadline:
      "Colorado state law requires annual backflow testing on any irrigation system connected to municipal water. Broomfield administers its cross-connection control program through Public Works. Contact them at 303-469-3301 for your compliance deadline.",
    backflowDevice:
      "PVB or RPZ assemblies per Colorado state requirements. Contact Broomfield Public Works to confirm what's approved for your connection.",
    soilType:
      "Expansive clay that varies noticeably between neighborhoods, sometimes within a few blocks. It swells when wet and shrinks when dry, the same movement that stresses foundations here also shifts sprinkler heads and pipe over time. Cycle-and-soak watering is essential; long single runs mostly become runoff.",
    housingAge:
      "A wide mix. Original Broomfield dates to the 1950s and 60s, while Anthem, Anthem Ranch, Anthem Highlands, The Broadlands, and Wildgrass are largely post-2000. Baseline, the former North Park development in northeast Broomfield, is still building out toward roughly 9,000 homes.",
    cityNote:
      "Broomfield's watering window is tighter than most of our service area. The 10 a.m. to 6 p.m. blackout is permanent, and the Drought Watch asks for two days a week rather than three. That combination means your system has to deliver a full week of water in a narrow overnight window, which makes zone timing and head efficiency matter more here than almost anywhere else nearby.",
    winterNote:
      "Broomfield's south and west sides hold some of the oldest irrigation in our service area. These are 1950s and 60s homes where the valves and backflow assembly have already been through decades of freeze-thaw. Those are the systems where a skipped blowout most often turns into a cracked backflow come spring. The newer Anthem, Broadlands and Baseline systems are more forgiving, but the above-ground backflow still freezes first no matter the build year.",
    introText:
      "Trailhead serves Broomfield. Broomfield has a permanent 10 a.m. to 6 p.m. watering blackout and a Drought Watch asking for two days a week, a tighter window than most Front Range cities, so zone layout and run times matter more here. We handle repairs, blowouts, spring turn-ons, backflow testing and new installations across Broomfield.",
    whyLocal:
      "We work in Broomfield regularly. We know the even/odd schedule, the overnight-only watering window, and how much the clay varies between Original Broomfield and the newer Anthem and Baseline neighborhoods. That matters when you're setting run times or diagnosing why one zone floods while another stays dry.",
    faqs: [
      {
        question: "What days can I water my lawn in Broomfield?",
        answer:
          "Even-numbered addresses may water Monday, Wednesday, and Friday. Odd-numbered addresses may water Tuesday, Thursday, and Sunday. Broomfield has been under a Drought Watch since February 2026 and asks residents to voluntarily use no more than two of those days. Watering is only allowed between 6 p.m. and 10 a.m.",
      },
      {
        question: "Are Broomfield's watering restrictions mandatory?",
        answer:
          "The two-day-a-week reduction is voluntary under the current Drought Watch. The 10 a.m. to 6 p.m. watering blackout is mandatory year-round under Broomfield's permanent water use ordinance. Check broomfield.org for the current status.",
      },
      {
        question: "How much is a sprinkler blowout in Broomfield?",
        answer:
          "Winterization (sprinkler blowout) costs $95 for up to 6 zones, plus $10 for each additional zone. Book in September or October to get a date before the first hard freeze.",
      },
      {
        question: "Do you service older sprinkler systems in Original Broomfield?",
        answer:
          "Yes, happily. The original neighborhoods have systems that have seen a lot of winters, and we keep them running well. We repair, replace and winterize them, and we'll tell you honestly when a part is worth replacing rather than patching.",
      },
      {
        question: "Does Broomfield require annual backflow testing?",
        answer:
          "Yes. Colorado state law requires annual testing on any irrigation system tied to municipal water, and Broomfield runs its program through Public Works. Contact them at 303-469-3301 for your deadline.",
      },
    ],
    relatedBlogSlugs: ["when-to-winterize-sprinklers-colorado", "water-optimization-tips-colorado", "smart-irrigation-controllers-worth-it"],
    guide: {
      placeImage: "/images/broomfield-town.jpg",
      placeAlt: "Broomfield, Colorado with the Flatirons and the snowy Front Range behind it",
      wateringDaysPerWeek: "2",
      rulesCheckedOn: "November 1, 2026",
      neighborhoods: ["Original Broomfield", "Anthem", "Anthem Ranch", "The Broadlands", "Wildgrass", "Baseline"],
      ryanNote:
        "Broomfield has a bit of everything, from the original neighborhoods with their big trees to Anthem, the Broadlands and Baseline. I like the variety. I work all over the city and know how the soil and the watering window change from one part of town to the next.",
      serviceNotes: {
        "/spring-turn-on": "Broomfield only allows watering between 6 p.m. and 10 a.m., so at turn-on we set the controller to finish inside that window.",
        "/sprinkler-repair": "Broomfield asks homeowners to fix leaks within 10 days of notice, and we keep that in mind when we schedule repairs here.",
        "/sprinkler-blowout": "Original Broomfield's systems have seen a lot of winters, and we give the valves and backflows there the extra care they deserve.",
        "/sprinkler-installation": "Broomfield's clay changes noticeably between neighborhoods, so we design zones for the soil on your lot.",
        "/smart-controllers": "A smart controller fits a full week of water into Broomfield's overnight window better than a mechanical timer.",
        "/water-efficiency": "With two watering days under the Drought Watch, efficient nozzles and drip get more out of each day in Broomfield.",
      },
      reviewAuthors: ["Reesa Rennecker", "Pate Katechis", "Jooseok Lee"],
    },
  },
]

export function getCityData(slug: string): CityData | undefined {
  return CITY_DATA.find((c) => c.slug === slug)
}
