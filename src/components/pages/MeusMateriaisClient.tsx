"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MeusMateriais = dynamic(() => import("@/legacy-pages/MeusMateriais"), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-12 space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-56 rounded-lg" />
        ))}
      </div>
    </div>
  ),
});

export default function MeusMateriaisClient() {
  return <MeusMateriais />;
}
