// The list the "Start here: Scheduler (Nov 25)" page draws (ScheduleStartHere.tsx): what to look at, what to try, and the three things Hannah is asked to choose.
// A story id is its group and export name (`/?path=/story/<id>`). schedule-start-here.test.ts fails when an id here no longer exists in a stories file.

export interface GuideLink { id: string; label: string; look: string }

const P = "screens-schedule-prototype-nov-25--"

export const LOOK: GuideLink[] = [
  { id: "admin-walkthrough-clickable--schedule-week", label: "The clickable Schedule", look: "Open the clickable walkthrough's Schedule and press Schedule in the left column. Days across, hours down, each day split by person." },
  { id: `${P}week-both-panels-open`, label: "Week with both panels open", look: "Unscheduled and Map side by side in one column. The week narrows and scrolls." },
  { id: `${P}month`, label: "Month", look: "Each day shows its stops and towns. Press a day to open it." },
  { id: `${P}just-moved`, label: "Just moved", look: "The bar at the bottom says Moved to a day and time and offers Notify the customer and Undo. Nothing was sent." },
  { id: `${P}not-notified-list`, label: "Not notified list", look: "Every moved visit whose customer has not been notified, with Notify the customer, Don't notify and Notify all." },
  { id: `${P}schedule-dialog-from-block`, label: "The Schedule dialog with best times", look: "The reviewed dialog, with the best times above its calendar." },
  { id: `${P}schedule-from-unscheduled-row`, label: "Schedule from an Unscheduled row", look: "The row says Suggested with a day, time and person, and Schedule opens the dialog on that time." },
  { id: "admin-walkthrough-clickable--schedule-new-job-best-times", label: "New job with best times", look: "Three best times sit under Day, and the top one says why in one office-only line." },
  { id: "admin-walkthrough-clickable--settings-people-time-off", label: "Time off in Settings", look: "Each person has Time off with Remove and Add time off." },
  { id: `${P}week-phone`, label: "Week on a phone", look: "A day strip and one day's column, no dragging, every action in the block's menu." },
]

export const TRY: string[] = [
  "Click a visit on the Schedule and land on its job page.",
  "Press Move on that job page and see the best times in the dialog.",
  "Drag a visit and see Moved to a day and time, with Notify the customer and Undo.",
  "Open Unscheduled and Map together with the two buttons in the header.",
  "Press New job, choose a customer and a service, and pick a best time.",
  "Open Settings, then People, to add or remove time off.",
  "Press the question mark key for the list of keyboard shortcuts.",
]

export const CHANGED: string[] = [
  "The words are now the app's own: Notify the customer, Don't notify, Customer not notified.",
  "A visit opens the real job page.",
  "There is one Schedule dialog, the reviewed one, with the best times added above its calendar.",
  "Time off moved to Settings, People. The Schedule only draws the band.",
  "No Jev plan moves a customer. Jev's pick is in New job, on Unscheduled jobs and behind the customer's recommended time.",
]

export interface Choice { label: string; link?: { id: string; label: string }; line: string }
export const CHOOSE: Choice[] = [
  { label: "The look of the recommended mark", link: { id: "blocks-scheduler-recommendedmark--recommended-mark-candidates", label: "Recommended mark candidates" }, line: "Three looks for the one time the customer's booking marks. Which one do you want?" },
  { label: "The map's look", line: "Should the map move to Mapbox's look? It is free at our volume, and we stop using it before the free amount runs out." },
  { label: "How long the bar at the bottom stays", line: "Should Moved to a day and time close after 10 seconds? The visit keeps its bell either way." },
  { label: "The words", line: "Please confirm Suggested, Time off, adds 4 min, the one office-only line under the top best time, and a plain sentence for an overlap, such as Ryan has Cheesman St at 9:00 am." },
]
