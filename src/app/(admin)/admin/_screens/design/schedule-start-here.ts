// The list the "Start here: Scheduler (Nov 25)" page draws (ScheduleStartHere.tsx): what to look at, what to try, and the three things Hannah is asked to choose.
// A story id is its group and export name (`/?path=/story/<id>`). schedule-start-here.test.ts fails when an id here no longer exists in a stories file.

export interface GuideLink { id: string; label: string; look: string }

const P = "screens-schedule-prototype-nov-25--"

export const LOOK: GuideLink[] = [
  { id: `${P}week`, label: "Week", look: "Days across and hours down, each day split by person. A block is as tall as the visit is long. A dashed edge and a bell mean the customer has not been told about a move." },
  { id: `${P}week-both-panels-open`, label: "Week with both panels open", look: "Unscheduled and Map side by side in one column. The week narrows and scrolls." },
  { id: `${P}day-two-people`, label: "Day, two people", look: "One column per person on the same clock, with the Any time strip on top." },
  { id: `${P}month`, label: "Month", look: "Each day shows its stops and towns. Press a day to open it." },
  { id: `${P}just-moved`, label: "Just moved", look: "The box at the top says Visit moved and offers Notify and Undo. Nothing was sent." },
  { id: `${P}not-told-list`, label: "Not told list", look: "Every moved visit whose customer has not been told, with Notify, Don't tell and Notify all." },
  { id: `${P}move-anyway-dialog`, label: "Move anyway", look: "A move that breaks a rule asks first and says what it breaks in plain words." },
  { id: `${P}week-with-time-off`, label: "Week with time off", look: "Hatched bands for time off. Press a label to edit it or remove it." },
  { id: `${P}jev-plan-drawn`, label: "Jev plan drawn", look: "Jev's moves are drawn as dotted blocks. Hover a row to see its block." },
  { id: `${P}find-a-time-row-picked`, label: "Find a time in New job", look: "A short list of openings with the minutes each adds to the driving. A chosen row lights a dotted block and a pin." },
  { id: `${P}week-phone`, label: "Week on a phone", look: "A day strip and one day's column, no dragging, every action in the block's menu." },
]

export const TRY: string[] = [
  "Drag a visit to another time or another day.",
  "Press Notify in the box at the top, read the message, and choose Send or Don't tell.",
  "Press Undo in the box at the top and watch the visit go back.",
  "Open Unscheduled and Map together with the two buttons in the header, then point at a visit, a row and a pin.",
  "Press Ask Jev, wait a moment, then press Accept or Throw away.",
  "Press New job, choose Andrea Reyes, press Find a time and pick a row.",
  "Press the question mark key for the list of keyboard shortcuts.",
]

export interface Choice { label: string; link?: { id: string; label: string }; line: string }
export const CHOOSE: Choice[] = [
  { label: "The look of the recommended mark", link: { id: "blocks-scheduler-recommendedmark--recommended-mark-candidates", label: "Recommended mark candidates" }, line: "Three looks for the one time the customer's booking marks. Which one do you want?" },
  { label: "The map's look", line: "Should the map move to Mapbox's look? It is free at our volume, and we stop using it before the free amount runs out." },
  { label: "How long the box at the top stays", line: "Should Visit moved close after 10 seconds? In the Week story it does. The visit keeps its bell either way." },
]
