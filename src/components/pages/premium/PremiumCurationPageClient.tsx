"use client";

import dynamic from "next/dynamic";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

const PremiumCurationPage = dynamic(() => import("@/legacy-pages/premium/PremiumCurationPage"), {
  ssr: false,
  loading: () => <RouteFallbackPremium />,
});

export default function PremiumCurationPageClient() {
  return (
    <RequireActiveSubscription>
      <PremiumCurationPage />
    </RequireActiveSubscription>
  );
}
