import { Suspense } from "react";

import { RouteFallbackAdmin } from "@/components/layout/route-fallbacks";
import InsightsAuditoriasClient from "@/components/pages/admin/InsightsAuditoriasClient";

export default function Page() {
  return (
    <Suspense fallback={<RouteFallbackAdmin />}>
      <InsightsAuditoriasClient />
    </Suspense>
  );
}
