// Every ui/ and blocks/ component has a sibling *.stories.tsx.
import { existsSync } from "node:fs"

export function checkStory(abs, { file, dirs, name, fixture, zone }, { problems }) {
  const needsStory = (dirs.includes("blocks") || zone === "ui") && name.endsWith(".tsx") && !fixture
  if (needsStory && !existsSync(abs.replace(/\.tsx$/, ".stories.tsx"))) problems.push(`${file}: no story`)
}
