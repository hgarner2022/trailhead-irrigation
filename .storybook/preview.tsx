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
    // The two Start here walkthroughs first (Hannah, Nov 19), then the catalogue stories under them, then the screens, emails and the library.
    options: {
      storySort: {
        order: [
          "Design",
          [
            "Start here: the admin, clickable",
            ["Docs", "Laptop", "Phone", "From home", "From search"],
            "Start here: the customer, clickable",
            ["Docs", "Phone", "Laptop"],
            "Booking form",
            "Job flow (clickable)",
            "Job page, one trip",
            "Job page, Season Pass and return trip",
            "Customer page",
            "Invoices",
            "Confirmations",
            "Navigation",
            "Jobs grid",
            "Customer side: booking, account, texts",
          ],
          "Screens",
          "Emails",
          "Blocks",
          "UI",
        ],
      },
    },
    // Accessibility violations fail story tests (npm run test:stories).
    a11y: { test: "error" },
  },
  tags: ["autodocs"],
}
export default preview
