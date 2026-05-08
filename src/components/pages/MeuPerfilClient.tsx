"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MeuPerfil = dynamic(() => import("@/legacy-pages/MeuPerfil"), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-12 space-y-6">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  ),
});

export default function MeuPerfilClient() {
  return <MeuPerfil />;
}
