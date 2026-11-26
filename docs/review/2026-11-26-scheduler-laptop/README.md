# Schedule at laptop widths (Nov 26 2026)

Real-browser screenshots (Playwright, Chromium) of the Storybook stories, taken after the content finished its fade.

| File | Shows |
|---|---|
| `week-5-1280.png`, `week-5-1024.png` | Week, five people, opens on today; 96 px columns scroll inside the grid, gutter and head stay, side fade at the edge; person names in the head |
| `day-5-1280.png`, `day-5-1024.png` | Day, five people: all five columns fit with no sideways scroll; each person's name, open time and driving on their own lines |
| `week-5-panel-1280.png` | Week, five people, Unscheduled docked beside the calendar |
| `week-5-panel-1024.png` | Same at 1024: below 1280 a panel is a bottom sheet (one at a time), so the page never scrolls sideways |
| `peek-1280.png`, `peek-1024-left.png`, `peek-1024-last.png`, `peek-1024-bottom.png` | The visit peek beside its block (flipped left at the last column, shifted up at the bottom), calendar still visible |
| `peek-768.png`, `peek-768-five-day.png` | The same card at 768, including five people on the Day |
| `peek-1024-panel.png` | A panel open at 1024 (bottom sheet) |

## What changed

- The visit peek is the anchored floating card from 768 (it was 1280). Below 768 (a phone) it is still the full-height sheet. `peekPlacement` (in `PeekAnchor.tsx`) chooses the side: right at 360 px, else left at 360 px, else the roomier side narrowed to its room (280 to 360 px), else floating over the calendar's edge on the roomier side at 280 px. Position is re-read every frame, so a panel opening or a resize re-places it.
- Person names in the Week head: first name when the column is 80 px or wider, initials under 80 px (a container query on the column itself), the full name as the accessible name and hover title either way. Before, five people always meant initials.
- Day with five people at 1024 was 67 px too wide (the head's text set the column width) and scrolled; the head text no longer sets the width, and each person's stats stack on their own lines instead of breaking mid-figure.
- A block under 10.5 rem wide (two side by side in a Day column) says only when it starts, so the time is never cut mid-word, and its title can wrap to the next line.
