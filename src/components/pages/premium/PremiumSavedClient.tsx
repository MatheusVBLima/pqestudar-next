"use client";

import dynamic from "next/dynamic";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

const PremiumSaved = dynamic(() => import("@/legacy-pages/premium/PremiumSaved"), {
  ssr: false,
  loading: () => <RouteFallbackPremium />,
});

export default function PremiumSavedClient() {
  return (
    <RequireActiveSubscription>
      <PremiumSaved />
    </RequireActiveSubscription>
  );
}
