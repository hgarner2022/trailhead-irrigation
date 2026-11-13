import "server-only"

/**
 * The one place a secret or a deployment setting is read. Call it inside a
 * function, never at module scope, so importing a module never needs the
 * environment and a missing name fails where it is used.
 */
export function readEnv<const N extends string>(names: readonly N[]): Record<N, string> {
  const out = {} as Record<N, string>
  for (const name of names) {
    const value = process.env[name]
    if (value === undefined || value === "") throw new Error(`${name} is not set`)
    out[name] = value
  }
  return out
}

/** Like `readEnv` for one optional name: undefined when unset or empty. */
export function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]
  return value === undefined || value === "" ? undefined : value
}

/** Auth.js: the secret that signs the session cookie. The site origin (`AUTH_URL`) is optional, see `readAuthEnv`. */
export function readAuthEnv(): { AUTH_SECRET: string; AUTH_URL: string | undefined } {
  const { AUTH_SECRET } = readEnv(["AUTH_SECRET"])
  return { AUTH_SECRET, AUTH_URL: readOptionalEnv("AUTH_URL") }
}
