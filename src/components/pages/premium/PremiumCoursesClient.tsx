"use client";

import LegacyPage from "@/legacy-pages/premium/PremiumCourses";
import { RequireActiveSubscription } from "@/components/premium/RequireActiveSubscription";

export default function PremiumCoursesClient() {
  return (
    <RequireActiveSubscription>
      <LegacyPage />
    </RequireActiveSubscription>
  );
}
