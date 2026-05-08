"use client";

import LegacyPage from "@/legacy-pages/premium/PremiumUpdateDetail";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

export default function PremiumUpdateDetailClient() {
  return (
    <RequireActiveSubscription>
      <LegacyPage />
    </RequireActiveSubscription>
  );
}
