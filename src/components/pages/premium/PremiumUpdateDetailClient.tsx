"use client";

import dynamic from "next/dynamic";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

const PremiumUpdateDetail = dynamic(() => import("@/legacy-pages/premium/PremiumUpdateDetail"), {
  ssr: false,
  loading: () => <RouteFallbackPremium />,
});

export default function PremiumUpdateDetailClient() {
  return (
    <RequireActiveSubscription>
      <PremiumUpdateDetail />
    </RequireActiveSubscription>
  );
}
