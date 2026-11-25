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
  { id: `${P}order-the-day`, label: "Order the day", look: "Press Order the day on a day with a stop that has no set time. The preview shows the day now and ordered, the minutes of driving between stops and the minutes saved. Stops with a time stay. Nothing is told." },
  { id: `${P}schedule-all`, label: "Schedule all", look: "Press Schedule all 4 in Unscheduled. Each job goes on the next open day with the first person who has room, each row has Remove, and one button schedules them with the same notify choice as the dialog." },
  { id: `${P}list-view`, label: "List", look: "The product's own visits grid over this calendar, with its filters. A row opens the visit's job page as a block does." },
  { id: `${P}another-day-ranked`, label: "Another day, ranked", look: "Open Another day in the Schedule dialog and pick a day. That day's openings are ranked by driving added, and a time that breaks a rule is greyed with its sentence." },
  { id: `${P}one-person-hidden`, label: "One person hidden", look: "Press a person's chip in the toolbar, as in Google Calendar, to show or hide them. Their column leaves Week and Day, and Month, the Map and the List follow. The last chip cannot be turned off." },
  { id: `${P}week-phone`, label: "Week on a phone", look: "A day strip and one day's column, no dragging, every action in the block's menu." },
]

export const TRY: string[] = [
  "Open Settings, then People, change Hours or Most per day for Ryan, press Save, and open the Schedule: the openings follow.",
  "Press Hannah's chip in the toolbar to hide her schedule, and press it again to bring her back.",
  "Drag a visit to a far town and see Adds 25 min of driving in the Move the visit dialog.",
  "Open Day on Thursday and press Order the day, then Undo.",
  "Open Unscheduled and press Schedule all, remove one row, and confirm.",
  "Press Legend under the calendar to fold or open it.",
  "Move a visit on the Schedule, then open Home, Jobs and the customer to see the same day.",
  "Click a visit on the Schedule and land on its job page.",
  "Press Move on that job page and see the best times in the dialog.",
  "Drag a visit and see Moved to a day and time, with Notify the customer and Undo.",
  "Open Unscheduled and Map together with the two buttons in the header.",
  "Press New job, choose a customer and a service, and pick a best time.",
  "Open Settings, then People, to add or remove time off.",
  "Press the question mark key for the list of keyboard shortcuts.",
]

export const CHANGED: string[] = [
  "Settings, People now feeds the Schedule: Takes visits, Working days, Hours and Most per day change the next opening offered. The page says so: A change applies to the next opening offered.",
  "Best times, suggestions, drop checks, driving, Order the day and Schedule all now come from the product's own offer rule and its drive times, from Settings: Minutes, Most per day and each person's hours.",
  "Home, Jobs, the customer page and the job page read the same calendar as the Schedule.",
  "One word for a move the customer has not heard about: Notify the customer, Don't notify, Customer not notified.",
  "The Notify text is the product's own Day moved text with its link, and the Schedule says when a day is inside the customer's 24 hours.",
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
  { label: "The words", line: "Please confirm Suggested, Time off, adds 4 min driving, Order the day, Schedule all, Doesn't fit today, Full, Legend, Adds 25 min of driving, Ryan needs 15 minutes to drive from Cheesman St, Ryan is full that day, Outside this service's dates, and Day ordered, saves 22 min of driving." },
]
