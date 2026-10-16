import type { MetadataRoute } from "next";

// The web app manifest: what the phone or computer uses when someone installs the game.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Then & Now: Mumbai and Delhi",
    short_name: "Then & Now",
    description: "Walk 30 years of Indian street prices. A pixel city you can explore, with a Time Machine and honest, sourced data.",
    id: "/play/",
    start_url: "/play/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#1a2544",
    theme_color: "#26365e",
    categories: ["games", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mumbai", url: "/play/?city=mumbai", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Delhi", url: "/play/?city=delhi", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "The bazaar", url: "/bazaar/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
