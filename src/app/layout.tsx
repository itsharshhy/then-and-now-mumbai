import type { Metadata, Viewport } from "next";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";

export const metadata: Metadata = {
  title: "Then & Now Mumbai",
  description: "A pixel Mumbai street where every shop tells 30 years of price history. Walk in, scrub the Time Machine, or switch to Analyst Mode.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#26365e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
