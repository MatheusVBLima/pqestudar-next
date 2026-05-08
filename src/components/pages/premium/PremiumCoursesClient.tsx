"use client";

import dynamic from "next/dynamic";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

const PremiumCourses = dynamic(() => import("@/legacy-pages/premium/PremiumCourses"), {
  ssr: false,
  loading: () => <RouteFallbackPremium />,
});

export default function PremiumCoursesClient() {
  return (
    <RequireActiveSubscription>
      <PremiumCourses />
    </RequireActiveSubscription>
  );
}
