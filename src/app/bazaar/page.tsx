import type { Metadata } from "next";
import Bazaar from "@/components/Bazaar";

export const metadata: Metadata = {
  title: "The bazaar — Then & Now Mumbai",
  description: "Ask what anything cost in Mumbai, or report what you paid this week. Every answer is reviewed and sourced.",
};

export default function BazaarPage() {
  return <Bazaar />;
}
