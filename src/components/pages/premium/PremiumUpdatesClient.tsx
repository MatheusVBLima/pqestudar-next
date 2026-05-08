"use client";

import LegacyPage from "@/legacy-pages/premium/PremiumUpdates";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

export default function PremiumUpdatesClient() {
  return (
    <RequireActiveSubscription>
      <LegacyPage />
    </RequireActiveSubscription>
  );
}
