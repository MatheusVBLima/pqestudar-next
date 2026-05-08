"use client";

import LegacyPage from "@/legacy-pages/premium/PremiumSaved";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

export default function PremiumSavedClient() {
  return (
    <RequireActiveSubscription>
      <LegacyPage />
    </RequireActiveSubscription>
  );
}
