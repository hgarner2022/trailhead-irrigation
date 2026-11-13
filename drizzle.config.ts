import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

// Local runs read .env.local (from `npx vercel env pull`); CI and Vercel set DATABASE_URL directly.
config({ path: ".env.local", quiet: true })

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
})
