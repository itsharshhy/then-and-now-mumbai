import type { Metadata } from "next";
import ArtGallery from "@/components/dev/ArtGallery";

export const metadata: Metadata = { title: "Art gallery — Then & Now Mumbai", robots: { index: false, follow: false } };

export default function ArtPage() {
  return <ArtGallery />;
}
