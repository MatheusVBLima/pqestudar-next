"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { RouteFallbackAdmin } from "@/components/layout/route-fallbacks";

export function createAdminPageClient(loader: () => Promise<{ default: ComponentType }>) {
  const Page = dynamic(loader, {
    ssr: false,
    loading: () => <RouteFallbackAdmin />,
  });

  function AdminPageClient() {
    return <Page />;
  }

  return AdminPageClient;
}
