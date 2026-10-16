import type { Metadata } from "next";
import Street from "@/components/Street";

export const metadata: Metadata = { title: "Play — Then & Now" };

export default function PlayPage() {
  return <Street />;
}
