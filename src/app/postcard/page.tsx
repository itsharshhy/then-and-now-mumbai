import type { Metadata } from "next";
import { Suspense } from "react";
import Postcard from "@/components/Postcard";

export const metadata: Metadata = { title: "Price postcards — Then & Now Mumbai" };

export default function PostcardPage() {
  return (
    <Suspense>
      <Postcard />
    </Suspense>
  );
}
