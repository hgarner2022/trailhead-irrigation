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
  introText: string
  whyLocal: string
  faqs: { question: string; answer: string }[]
  relatedBlogSlugs: string[]
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
    restrictionSummary: "Erie is currently under a voluntary 2-day-per-week watering schedule after lifting a Water Supply Shortage emergency that banned all residential sprinkler use through March 2026.",
    wateringDays: "Even addresses: Monday & Thursday. Odd addresses: Tuesday & Friday. During extreme heat, the Town may authorize a third day (Even adds Saturday, Odd adds Sunday).",
    wateringTimeRestriction: "The Town recommends watering during cool morning hours to reduce evaporation. No formal time-of-day ban published.",
    backflowDeadline: "Colorado state law requires annual testing. Contact the Town of Erie at 303-926-2870 for the local compliance deadline.",
    backflowDevice: "PVB or RPZ assemblies accepted per Colorado state requirements.",
    soilType: "Heavy clay-loam soil that expands when wet and contracts when dry. Cycle-and-soak irrigation is essential to prevent runoff. Annual aeration can reduce watering needs by up to 25%.",
    housingAge: "Predominantly newer construction (post-2000). Major communities include Erie Highlands, Collier's Hill, Flatiron Meadows, Compass, and Brennan.",
    cityNote: "Erie experienced a severe water supply emergency in early 2026. Water efficiency and smart irrigation are bigger priorities here than anywhere else on the Front Range right now.",
    introText: "Trailhead Lawn & Irrigation is based right here in Erie. We're the local sprinkler company your neighbors call for installations, repairs, winterization, and spring turn-ons. We know Erie's heavy clay soil, the Town's watering schedule, and which neighborhoods need extra attention.",
    whyLocal: "We're based in Erie. When you call us, we're already close. We know the soil, the water restrictions, and the neighborhoods. We've worked in Erie Highlands, Collier's Hill, Flatiron Meadows, and most of the newer developments in town.",
    faqs: [
      {
        question: "What are Erie's watering restrictions in 2026?",
        answer: "Erie is under a voluntary 2-day-per-week schedule. Even addresses water Monday and Thursday, odd addresses water Tuesday and Friday. The Town may authorize a third day during extreme heat. Check erieco.gov/drought for the latest updates.",
      },
      {
        question: "How much does sprinkler installation cost in Erie?",
        answer: "Most residential sprinkler installations in Erie cost between $3,000 and $6,000 depending on yard size, number of zones, and controller type. We offer free on-site estimates.",
      },
      {
        question: "When should I turn on my sprinklers in Erie?",
        answer: "Wait until late April to early May, after nighttime temperatures stay consistently above 32 degrees for at least a week. Turning on too early risks freeze damage that can cost $500-$1,500 to repair.",
      },
      {
        question: "Does Erie require annual backflow testing?",
        answer: "Yes. Colorado state law requires annual backflow testing for all irrigation systems connected to municipal water. Contact the Town of Erie at 303-926-2870 for your specific deadline.",
      },
    ],
    relatedBlogSlugs: ["spring-sprinkler-startup-colorado", "water-optimization-tips-colorado", "colorado-water-restrictions-2026"],
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
    introText: "Looking for a sprinkler company in Longmont? Trailhead serves Longmont from our base in Erie, just 15 minutes away. We handle sprinkler installation, repair, blowouts, and spring turn-ons throughout Longmont. Many homes here have aging systems from the 1970s-80s that need repair or upgrades.",
    whyLocal: "We're 15 minutes from Longmont and service the entire city regularly. Many Longmont homes have 30-40 year old sprinkler systems that need modernizing. We know which neighborhoods have low water pressure, aging valves, and outdated controllers.",
    faqs: [
      {
        question: "Does Longmont have watering restrictions in 2026?",
        answer: "Longmont is at a Drought Watch level with voluntary guidelines: water no more than twice per week, before 10 AM or after 6 PM. Longmont has strong water rights, so mandatory restrictions are less likely than in neighboring cities.",
      },
      {
        question: "How much does sprinkler repair cost in Longmont?",
        answer: "Sprinkler repair costs vary by the issue. A broken head replacement runs $50-$100 per head. Valve repairs are $100-$250. Leak detection and pipe repair depends on severity. Contact us for a free repair quote.",
      },
      {
        question: "Does Longmont require backflow testing?",
        answer: "Yes. The City of Longmont requires annual backflow testing between April and September. They assign specific deadlines per property. Only RPZ devices are accepted for new installations. Contact backflow@longmontcolorado.gov or 303-651-8416.",
      },
      {
        question: "My sprinkler system in Longmont is old. Should I replace it?",
        answer: "If your system is 25+ years old and you're dealing with frequent repairs, low water pressure, or uneven coverage, a full replacement usually makes more financial sense than patching an aging system. We offer free consultations.",
      },
    ],
    relatedBlogSlugs: ["signs-irrigation-system-needs-repair", "smart-irrigation-controllers-worth-it", "how-much-does-sprinkler-system-cost-colorado"],
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
    introText: "Need a sprinkler company in Louisville? Trailhead serves Louisville from our base in Erie. We handle lawn sprinkler installation, repair, winterization, and spring turn-ons throughout Louisville. We work on everything from established 1990s properties to Marshall Fire rebuilds.",
    whyLocal: "Louisville homeowners care about their properties. With median home values over $800K, a well-maintained sprinkler system protects a serious investment. We understand Louisville's hillier terrain near the foothills and adjust zone layouts accordingly.",
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
        question: "Do you work on Marshall Fire rebuild homes in Louisville?",
        answer: "Yes. We install new sprinkler systems for rebuilt homes and can design a modern system with smart controllers, efficient rotary nozzles, and drip irrigation for flower beds.",
      },
      {
        question: "How do I winterize my sprinklers in Louisville?",
        answer: "Schedule a professional sprinkler blowout between mid-October and early November, before the first hard freeze. Louisville sits at 5,335 ft, so freezes can come earlier than lower-elevation cities. Our winterization service costs $95 for up to 8 zones.",
      },
    ],
    relatedBlogSlugs: ["when-to-winterize-sprinklers-colorado", "what-to-expect-sprinkler-installation", "smart-irrigation-controllers-worth-it"],
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
    introText: "Looking for a sprinkler company in Lafayette? Trailhead serves Lafayette from our Erie base. Lafayette is unique because it has permanent year-round watering restrictions, not just drought rules. We design and maintain sprinkler systems that work within Lafayette's 3-day-per-week, no-midday-watering rules.",
    whyLocal: "Lafayette's permanent restrictions mean your sprinkler system needs to be efficient from day one. We program controllers to comply with the 3-day limit and 10 AM-6 PM blackout window, and recommend smart controllers that auto-adjust for weather.",
    faqs: [
      {
        question: "What are Lafayette's watering restrictions?",
        answer: "Lafayette has permanent year-round restrictions: maximum 3 days per week, no watering between 10 AM and 6 PM. These are not drought-triggered. Low-volume drip irrigation is exempt from the 3-day limit. Newly planted landscaping gets a 30-day exception.",
      },
      {
        question: "When is the backflow testing deadline in Lafayette?",
        answer: "Lafayette's backflow testing cycle runs January through August, administered through BSI Online. Non-compliance can result in fees and water service interruptions. Call 888-966-6050 with questions.",
      },
      {
        question: "Do I need a smart controller in Lafayette?",
        answer: "We strongly recommend it. Lafayette's permanent restrictions mean your controller needs to handle the 3-day limit and avoid the 10 AM-6 PM blackout automatically. Smart controllers like Rachio or Hunter Hydrawise handle this and adjust for rain and temperature.",
      },
      {
        question: "How much does a sprinkler system cost in Lafayette?",
        answer: "Residential sprinkler installation in Lafayette typically runs $3,000-$6,000 depending on yard size and zone count. We include smart controller setup and program it to comply with Lafayette's permanent watering restrictions.",
      },
    ],
    relatedBlogSlugs: ["smart-irrigation-controllers-worth-it", "colorado-water-restrictions-2026", "drip-irrigation-vs-spray-heads"],
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
    restrictionSummary: "Firestone currently has no mandatory outdoor watering restrictions. The Town requests voluntary water conservation. However, Firestone's water supply situation is changing: Central Weld County Water District has canceled its contract with the Town, with service ending August 2028.",
    wateringDays: "No mandatory schedule published. The Town requests voluntary conservation: water during cool morning hours and avoid overwatering.",
    wateringTimeRestriction: "No formal time-of-day ban. The Town recommends watering during cool morning hours to reduce evaporation.",
    backflowDeadline: "Colorado state law requires annual backflow testing. Contact the Town of Firestone Water Department at 303-833-3291 for local requirements.",
    backflowDevice: "Per Colorado state requirements. Contact the Town for specific device requirements.",
    soilType: "Clay to sandy-loam mix. Firestone sits on the eastern plains side of I-25, where soils trend slightly sandier than foothills communities. Expansive clay is still present in many areas.",
    housingAge: "Almost entirely newer construction (post-2000). Firestone grew from under 2,000 residents in 2000 to over 20,000 today. Most homes are in planned subdivisions with HOA-managed common areas.",
    cityNote: "Firestone's water supply is in transition. The Central Weld County Water District contract ends in August 2028, and the Town is actively securing alternative sources. Water efficiency will become increasingly important as this plays out.",
    introText: "Need a sprinkler company in Firestone? Trailhead serves Firestone from our base in Erie, just a short drive up I-25. Almost every home in Firestone was built after 2000, so most systems are relatively new. We handle repairs, maintenance, winterization, and spring turn-ons throughout Firestone's growing neighborhoods.",
    whyLocal: "Firestone is one of the fastest-growing towns in Colorado. Nearly every home here is newer construction with modern irrigation systems, but even new systems need regular maintenance, seasonal blowouts, and the occasional repair. We're just a few minutes away in Erie.",
    faqs: [
      {
        question: "Does Firestone have watering restrictions?",
        answer: "Firestone currently has no mandatory watering restrictions, only voluntary conservation guidelines. However, the Town's water supply situation is changing as the Central Weld County Water District contract ends in 2028. Monitor firestoneco.gov for updates.",
      },
      {
        question: "Do you service sprinkler systems in Firestone?",
        answer: "Yes. We serve all of Firestone from our Erie base. We handle sprinkler repair, winterization blowouts, spring turn-ons, backflow testing, and new installations throughout the Town.",
      },
      {
        question: "My Firestone home is newer. Does the sprinkler system still need maintenance?",
        answer: "Yes. Even newer systems need annual winterization (blowout) and spring startup. Heads get damaged by mowers, valves wear out, and controllers need seasonal reprogramming. Regular maintenance prevents expensive repairs down the road.",
      },
      {
        question: "How much is a sprinkler blowout in Firestone?",
        answer: "Winterization (sprinkler blowout) costs $95 for up to 8 zones, plus $7 for each additional zone. Book between mid-September and mid-October to get on the schedule before the first freeze.",
      },
    ],
    relatedBlogSlugs: ["when-to-winterize-sprinklers-colorado", "signs-irrigation-system-needs-repair", "how-to-adjust-sprinkler-heads"],
  },
]

export function getCityData(slug: string): CityData | undefined {
  return CITY_DATA.find((c) => c.slug === slug)
}
