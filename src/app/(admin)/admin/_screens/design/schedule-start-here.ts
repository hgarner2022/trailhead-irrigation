// The list the "Start here: Scheduler (Nov 26)" page draws (ScheduleStartHere.tsx): what changed since the last review, what to look at and try, and the three things Hannah is asked to confirm.
// A story id is its group and export name (`/?path=/story/<id>`). schedule-start-here.test.ts fails when an id here no longer exists in a stories file.

export interface GuideLink { id: string; label: string; look: string }

const P = "screens-schedule-prototype-nov-25--"

export const LOOK: GuideLink[] = [
  { id: "admin-walkthrough-clickable--schedule-week", label: "The clickable Schedule", look: "Open the clickable walkthrough's Schedule and press Schedule in the left column. Days across, hours down, each day split by person." },
  { id: `${P}visit-peek-open`, label: "A visit clicked", look: "Click a visit. Its facts open at the right and the week stays usable. Edit visit changes it, Mark done is there for today, and Open job goes to the job." },
  { id: `${P}edit-visit-with-length`, label: "Edit visit, with Length", look: "The same Schedule dialog, now called Edit visit, with a Length you change 15 minutes at a time." },
  { id: "blocks-scheduler-peoplemenu--five-people", label: "The People menu", look: "One People button with a list of names and ticks. It says Everyone, a name, or 3 of 5." },
  { id: `${P}week-five-people`, label: "Week with five people", look: "The columns get narrow and the week scrolls sideways inside the grid. The hours stay in view." },
  { id: `${P}just-moved`, label: "Just moved", look: "After a drag the bar at the bottom says Moved to a day and time, with Notify the customer and Undo. It closes by itself after 10 seconds. Nothing was sent." },
  { id: `${P}week-header-card`, label: "The week's day header", look: "The header is the day and, for example, 3 visits. Hover it for the towns, open time and driving, or press it to open the day." },
  { id: `${P}day-drive-lines`, label: "Day, with its head and drive lines", look: "The Day view's head has the towns and each person's open time and driving. The minutes between stops show here only." },
  { id: `${P}map-with-driving`, label: "Map with the day's driving", look: "Each person's driving for the day is a line at the bottom of the Map panel." },
  { id: `${P}reorder-stops`, label: "Reorder stops", look: "Press Reorder stops on a day with a stop that has no set time. The preview shows the day now and reordered. Stops with a time stay. Nothing is told." },
  { id: `${P}schedule-all`, label: "Schedule all", look: "Press Schedule all 4 in Unscheduled. Each job goes on the next open day with the first person who has room, and each row has Remove." },
  { id: `${P}month`, label: "Month", look: "Each day shows its visits and towns. Press a day to open it." },
  { id: "blocks-scheduler-recommendedmark--default", label: "The recommended time", look: "In the customer's booking step the one recommended time says Recommended under it." },
  { id: `${P}visit-peek-open-phone`, label: "Directions in a visit's facts", look: "Open a visit and press Directions beside Where. It opens your maps app at that address." },
  { id: `${P}opens-on-the-day-phone`, label: "A phone opens on the day", look: "The Schedule opens on today as a list: Any time visits first, then each visit in order with the drive between. Tap one to open it full screen." },
  { id: `${P}day-two-people-phone`, label: "The day with two people, phone", look: "The same list under each person's name with their open time and driving." },
  { id: `${P}week-one-person-overlap-phone`, label: "Two overlapping visits, phone", look: "In the Week with one person, two visits that overlap sit side by side in two lanes with the red outline." },
  { id: `${P}week-phone`, label: "Week on a phone", look: "A day strip and one day's list. Tap a visit to open it full screen, then Edit visit." },
]

export const TRY: string[] = [
  "Click a visit on the Schedule, then press Edit visit and move it.",
  "Press Escape to close the visit's facts, and see the focus return to the visit.",
  "Open People and untick someone, then tick them again. The last person cannot be unticked.",
  "Drag a visit and press Notify the customer in the bar. Nothing goes until you press Send.",
  "Drag the bottom edge of a visit to change its length, or change it in Edit visit.",
  "Drag a visit to a far town and see Adds 25 min of driving under Move anyway?",
  "Open Day on Thursday and press Reorder stops, then Undo.",
  "Open Unscheduled and press Schedule all, remove one row, and confirm.",
  "Hover a day's header in the Week to see its towns and driving.",
  "Open Settings, then People, change Hours or Most per day for Ryan, press Save, and open the Schedule.",
  "On a phone width, open a visit and press Directions. In Edit visit, press 15 minutes longer and see the times that no longer fit leave the list.",
  "Press the question mark key for the list of keyboard shortcuts.",
]

export const CHANGED: string[] = [
  "Click a visit to see it and edit it. The menu on each visit is gone.",
  "Pick whose schedule shows from the People button.",
  "After a move you can notify the customer or undo it. Nothing else is tracked, so the not notified count, tab and bell are gone.",
  "The week's day header is simpler: the day and how many visits, or Full.",
  "Driving between stops shows in the Day view only, and each person's driving for the day is under the Map.",
  "The new words are Reorder stops, Stops reordered, No room today, +3 min driving, Drive times are estimates, 3 visits scheduled, Suggested with a first name, and Move anyway.",
  "A visit's facts have a Directions link. Changing Length in Edit visit ranks the times again.",
  "On a phone the Schedule opens on today as a list, with the date and arrows in one row and the view, People, Unscheduled and Map in the next.",
  "The customer's recommended time says Recommended under it, and the map is the quiet grey style.",
]

export interface Choice { label: string; link?: { id: string; label: string }; line: string }
export const CHOOSE: Choice[] = [
  { label: "Mark done in the side panel", line: "Should a visit's panel on the Schedule have a Mark done button? As built it is there only for a visit that is today or earlier, and it opens the job's own Mark done." },
  { label: "Full in the week's header", line: "Should the week's day header say Full when nobody has room? As built it says Full in place of the number of visits, and nothing more." },
  { label: "Saving from Edit visit", line: "When you save a change in Edit visit, should it ask about notifying the customer first, or save and show the bar like a drag? As built it keeps the two choices in the box, and a drag shows the bar." },
]
