"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const FerramentasSalvos = dynamic(() => import("@/legacy-pages/FerramentasSalvos"), {
  ssr: false,
  loading: () => (
    <div className="container max-w-5xl mx-auto px-4 py-12 space-y-4">
      <Skeleton className="h-12 w-72" />
      {[1, 2].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  ),
});

export default function FerramentasSalvosClient() {
  return <FerramentasSalvos />;
}
