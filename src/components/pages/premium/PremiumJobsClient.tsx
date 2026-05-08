"use client";

import dynamic from "next/dynamic";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

const PremiumJobs = dynamic(() => import("@/legacy-pages/premium/PremiumJobs"), {
  ssr: false,
  loading: () => <RouteFallbackPremium />,
});

export default function PremiumJobsClient() {
  return (
    <RequireActiveSubscription>
      <PremiumJobs />
    </RequireActiveSubscription>
  );
}
