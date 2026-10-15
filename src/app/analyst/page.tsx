import type { Metadata } from "next";
import Analyst from "@/components/Analyst";

export const metadata: Metadata = { title: "Analyst Mode — Then & Now Mumbai" };

export default function AnalystPage() {
  return <Analyst />;
}
