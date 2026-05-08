"use client";

import dynamic from "next/dynamic";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";

const PremiumRedeem = dynamic(() => import("@/legacy-pages/premium/PremiumRedeem"), {
  ssr: false,
  loading: () => <RouteFallbackPremium />,
});

export default function PremiumRedeemClient() {
  return <PremiumRedeem />;
}
