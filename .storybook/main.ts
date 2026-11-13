import type { StorybookConfig } from "@storybook/nextjs-vite"
import { fileURLToPath } from "node:url"

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  staticDirs: ["../public"],
  // getAdminData is server-only; stories get the fixture-only mock beside it.
  viteFinal: async (config) => {
    const existing = config.resolve?.alias
    const rest = Array.isArray(existing) ? existing : Object.entries(existing ?? {}).map(([find, replacement]) => ({ find, replacement }))
    config.resolve = {
      ...config.resolve,
      alias: [
        { find: /^@\/lib\/admin\/data$/, replacement: fileURLToPath(new URL("../src/lib/admin/__mocks__/data.ts", import.meta.url)) },
        ...rest,
      ],
    }
    return config
  },
}
export default config
