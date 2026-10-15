import type { Metadata } from "next";
import Review from "@/components/Review";

export const metadata: Metadata = { title: "Review queue — Then & Now Mumbai", robots: { index: false, follow: false } };

export default function ReviewPage() {
  return <Review />;
}
