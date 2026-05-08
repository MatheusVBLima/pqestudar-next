"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Noticias = dynamic(() => import("@/legacy-pages/Noticias"), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    </div>
  ),
});

export default function NoticiasClient() {
  return <Noticias />;
}
