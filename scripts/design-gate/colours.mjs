// Tokens only: no hex, rgb(), hsl(), arbitrary colour utilities or Tailwind
// palette colours on a colour-bearing prefix.

// ui/ files that predate DESIGN.md and still use palette colours for error
// states. Remove a file here when it is migrated to tokens.
export const LEGACY = new Set(["input.tsx", "textarea.tsx"])

const PREFIX = "bg|text|border|ring|fill|stroke|from|via|to|divide|outline|shadow|decoration|accent|caret|placeholder"
const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone"
const paletteRe = new RegExp(`\\b(?:${PREFIX})-(?:${PALETTE})-(?:50|[1-9]00|950)\\b`, "g")
// A hex only counts where a colour value sits: after a quote, space, "[" or ":".
const rawRe = new RegExp(
  `(?<=["'\\s\\[:])#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?)\\(|\\b(?:${PREFIX})-\\[(?:#|rgba?\\(|hsla?\\(|color:|var\\(--color)[^\\]]*\\]`,
  "g",
)
const contextRe = /className=|\bclass=|\bstyle=|\bfill=|\bstroke=|\bstopColor=|\bcolor=|\bcn\(|\bcva\(/
// Attributes whose values look like hex but never are colours (href="#add").
const anchorAttrRe = /\b(?:href|id|htmlFor|aria-[\w-]+)=(?:"[^"]*"|'[^']*'|\{[^}]*\})/g
// Strings, block comments and line comments, removed before counting brackets.
const bare = (line) =>
  line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "$1$1").replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "")

// Lines that sit inside a className= / style= / fill= / cn( / cva( context,
// tracked across lines by bracket depth so multi-line cn() calls are covered.
// Brackets are counted on the bare line (no strings or comments), and a line
// that opens a new className= with balanced quotes resets the depth.
function colourContextLines(text) {
  const lines = []
  let depth = 0
  text.split("\n").forEach((line, i) => {
    const code = bare(line)
    const m = contextRe.exec(code)
    if (m && /className=/.test(code) && (code.match(/["'`]/g) || []).length % 2 === 0) depth = 0
    if (depth === 0 && !m) return
    const fresh = depth === 0 // this line opens the context, so scan from the opener
    for (const ch of code.slice(fresh ? m.index : 0)) {
      if (ch === "(" || ch === "{") depth++
      else if (ch === ")" || ch === "}") depth = Math.max(0, depth - 1)
    }
    lines.push([i + 1, fresh ? line.slice(contextRe.exec(line)?.index ?? 0) : line])
  })
  return lines
}

export function checkColours(file, text, legacy, { problems, notes }) {
  const found = []
  for (const [n, part] of colourContextLines(text)) {
    for (const m of part.replace(anchorAttrRe, "").matchAll(rawRe)) found.push(`line ${n}: raw colour "${m[0]}"`)
  }
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(paletteRe)) found.push(`line ${i + 1}: palette colour "${m[0]}"`)
  })
  if (!found.length) return
  if (legacy) notes.push(`${file}: legacy, migrate when touched (${found.join("; ")})`)
  else for (const f of found) problems.push(`${file}: ${f} (use a token from globals.css)`)
}

// Email cannot read CSS variables, so src/emails/layout.ts may hold the brand hex values in ONE block between these two
// marker lines. The block is blanked before the colour scan; any other hex under src/emails or src/sms still fails.
const EMAIL_BLOCK = /^[ \t]*\/\/ email-colors:start[ \t]*\n[\s\S]*?^[ \t]*\/\/ email-colors:end[ \t]*$/m

export function allowEmailColourBlock(file, text, { problems }) {
  if (!/(^|[\\/])emails[\\/]layout\.ts$/.test(file)) return text
  const blocks = text.match(new RegExp(EMAIL_BLOCK.source, "gm")) ?? []
  if (blocks.length > 1) problems.push(`${file}: more than one email-colors block (one is allowed)`)
  return text.replace(EMAIL_BLOCK, (block) => block.replace(/[^\n]/g, " "))
}

// Email templates build HTML in strings, which the JSX-aware scan above cannot see into, so under src/emails and src/sms
// every line is scanned: a hex (not an &#39; entity or an href fragment) or rgb()/hsl() anywhere fails.
export function checkEmailColours(file, text, { problems }) {
  text.split("\n").forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "").replace(/&#\d+;/g, "").replace(/href=["'][^"']*["']/g, "")
    for (const m of code.matchAll(/(?<![\w&])#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)) problems.push(`${file}: line ${i + 1}: raw colour "${m[0]}" (use EMAIL_COLORS from layout.ts)`)
  })
}
