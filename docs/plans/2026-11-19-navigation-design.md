# Navigation design (Nov 19 2026)

Prototype in Storybook under "Design / Navigation", stories only. It builds on `docs/plans/2026-11-19-navigation-audit.md` (findings 1 to 7) and Hannah's three answers.

## Decisions

1. **An account menu at the far right of the admin's top bar**, beside Search (`AdminAccountMenu`): name, Profile, Help, Open as customer (only for staff whose email is also a customer's), Sign out. Sign out left the rail footer and the phone's More. A row with no address is not drawn, so the live app shows only the name and Sign out until Profile and Help exist.
2. **The customer account keeps its tabs.** Not touched here.
3. **On a phone, Reports and Settings stay behind More.** More is a bordered button with its label (`MoreMenu`); Sign out is gone from it.
4. **No notifications bell.** The audit did not recommend one and nothing in the app raises a notification a person could open from the bar.
5. **Search sits at the left of the right group**, then the account: toggle, title, page action, Search, account.

## Rules (written into `docs/DESIGN.md`)

- Every panel and page says where it came from above its title: "‹ Home", "‹ Search", "‹ Andrea Reyes", "‹ Jobs". `RecordPage`'s crumb now carries the "‹" as the panel's does.
- Three controls, three outcomes. X and Esc close to the list the first record was opened from. "‹" and the browser's Back step back one record.
- "+ New job" stays in the sticky phone top bar on every screen that has it (`PageHeader` takes a `primary`; on a phone it lands in the bar, on a laptop it sits with the actions).
- A page and its panel never repeat the same action: the page's primary is top right, a panel's actions are in its footer.
- Settings tabs are in the address: `/admin/settings/billing`; on a phone the list is `/admin/settings` and a tab drills in with "‹ Settings".

## What changed in code

New blocks: `TopBar`, `AdminAccountMenu`, `MoreMenu`, each with stories, tests and a row in the recipe table. `AdminShell` now uses them (the rail has no footer; `onSignOut` feeds the account menu; new optional `profileHref`, `helpHref`, `customerHref`). `AdminTabBar` takes only `current`. `PageHeader` takes `primary`. No screen passes `primary` or the hrefs yet, and Settings still keeps its tab in state: wiring them is the next step.

## Stories ("Design / Navigation")

Laptop 1280: ShellLaptop, AccountMenuOpen, AccountMenuOpenStaffOnly, RecordFromHomeLaptop, RecordFromSearchLaptop, RecordFromRecordLaptop, SettingsTabInAddress, TheThreeControls.
Phone 375: ShellPhone, AccountMenuOpenPhone, MoreOpenPhone, RecordFromHomePhone, RecordFromSearchPhone, RecordFromRecordPhone, RecordFromListPhone, SettingsTabInAddressPhone, TheThreeControlsPhone.

## Questions for Hannah

1. Should "‹" from a Search hit reopen the search with the same words, or just go to the page you were on when you searched? The prototype says it reopens the search.
2. Profile and Help have nowhere to go yet. Should Profile be a small page (name, email, phone) and Help a link to a written guide, or leave both out until they exist?
