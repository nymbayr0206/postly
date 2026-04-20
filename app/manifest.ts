import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Postly",
    short_name: "Postly",
    description: "Postly контент үүсгэх платформ",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    lang: "mn",
    id: "/",
    icons: [
      {
        src: "/postly-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/postly-icon.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
