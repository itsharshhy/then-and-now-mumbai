import type { Metadata } from "next";
import Survive from "@/components/Survive";

export const metadata: Metadata = { title: "Can you survive the month? — Then & Now Mumbai" };

export default function SurvivePage() {
  return <Survive />;
}
