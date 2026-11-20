// Counts the Messages catalog: how many messages, how many are built, how many are prototypes. Usage: npx tsx scripts/count-messages.mts
import { MESSAGES } from "../src/emails/messages/catalog"

const full = MESSAGES.filter((m) => m.prototype?.length === m.channels.length)
const partial = MESSAGES.filter((m) => m.prototype && m.prototype.length < m.channels.length)
const built = MESSAGES.filter((m) => !m.prototype)
console.log(`${MESSAGES.length} messages; ${built.length} built; ${full.length} whole prototypes (${full.map((m) => m.id).join(", ")}); ${partial.length} built with a prototype channel (${partial.map((m) => m.id).join(", ")})`)
