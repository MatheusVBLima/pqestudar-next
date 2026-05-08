"use client";

import dynamic from "next/dynamic";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

const PremiumHome = dynamic(() => import("@/legacy-pages/premium/PremiumHome"), {
  ssr: false,
  loading: () => <RouteFallbackPremium />,
});

export default function PremiumHomeClient() {
  return (
    <RequireActiveSubscription>
      <PremiumHome />
    </RequireActiveSubscription>
  );
}
