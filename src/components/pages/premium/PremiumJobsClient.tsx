"use client";

import LegacyPage from "@/legacy-pages/premium/PremiumJobs";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

export default function PremiumJobsClient() {
  return (
    <RequireActiveSubscription>
      <LegacyPage />
    </RequireActiveSubscription>
  );
}
