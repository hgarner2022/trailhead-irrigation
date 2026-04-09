import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trailhead Lawn & Irrigation LLC",
    short_name: "Trailhead",
    description:
      "Professional irrigation services in Erie, Longmont, Louisville & Lafayette, Colorado.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2B3544",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
