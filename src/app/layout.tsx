import type { Metadata, Viewport } from "next";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "@fontsource-variable/bricolage-grotesque";
import Pwa from "@/components/Pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: "Then & Now: Mumbai and Delhi",
  description: "Walk thirty years of Indian street prices. A pixel city you can explore from above, with a Time Machine, friends, and honest, sourced data.",
  applicationName: "Then & Now",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Then & Now", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#26365e", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
