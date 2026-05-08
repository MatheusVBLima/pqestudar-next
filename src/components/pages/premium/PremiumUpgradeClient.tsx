"use client";

import dynamic from "next/dynamic";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";

const PremiumUpgrade = dynamic(() => import("@/legacy-pages/premium/PremiumUpgrade"), {
  ssr: false,
  loading: () => <RouteFallbackPremium />,
});

export default function PremiumUpgradeClient() {
  return <PremiumUpgrade />;
}
