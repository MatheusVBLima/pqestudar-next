"use client";

import LegacyPage from "@/legacy-pages/premium/PremiumHome";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

export default function PremiumHomeClient() {
  return (
    <RequireActiveSubscription>
      <LegacyPage />
    </RequireActiveSubscription>
  );
}
