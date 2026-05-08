"use client";

import dynamic from "next/dynamic";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

const PremiumUpdates = dynamic(() => import("@/legacy-pages/premium/PremiumUpdates"), {
  ssr: false,
  loading: () => <RouteFallbackPremium />,
});

export default function PremiumUpdatesClient() {
  return (
    <RequireActiveSubscription>
      <PremiumUpdates />
    </RequireActiveSubscription>
  );
}
