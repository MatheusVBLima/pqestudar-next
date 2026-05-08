"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const NoticiaDetalhes = dynamic(() => import("@/legacy-pages/NoticiaDetalhes"), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-12 space-y-6">
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  ),
});

export default function NoticiaDetalhesClient() {
  return <NoticiaDetalhes />;
}
