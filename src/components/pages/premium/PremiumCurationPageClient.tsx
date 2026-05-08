"use client";

import LegacyPage from "@/legacy-pages/premium/PremiumCurationPage";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

export default function PremiumCurationPageClient() {
  return (
    <RequireActiveSubscription>
      <LegacyPage />
    </RequireActiveSubscription>
  );
}
