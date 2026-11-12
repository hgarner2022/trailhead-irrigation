import type { Preview } from "@storybook/nextjs-vite"
import "./storybook.css"

const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: true },
    backgrounds: {
      default: "cream",
      values: [
        { name: "cream", value: "#FAFAF8" },
        { name: "white", value: "#FFFFFF" },
        { name: "navy", value: "#2B3544" },
      ],
    },
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" } },
        tablet: { name: "Tablet 768", styles: { width: "768px", height: "1024px" } },
        laptop: { name: "Laptop 1280", styles: { width: "1280px", height: "800px" } },
        wide: { name: "Wide 1440", styles: { width: "1440px", height: "900px" } },
      },
    },
    layout: "fullscreen",
    // Accessibility violations fail story tests (npm run test:stories).
    a11y: { test: "error" },
  },
  tags: ["autodocs"],
}
export default preview
