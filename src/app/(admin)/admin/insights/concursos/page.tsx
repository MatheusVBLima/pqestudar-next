import { Suspense } from "react";

import { RouteFallbackAdmin } from "@/components/layout/route-fallbacks";
import InsightsConcursosClient from "@/components/pages/admin/InsightsConcursosClient";

export default function Page() {
  return (
    <Suspense fallback={<RouteFallbackAdmin />}>
      <InsightsConcursosClient />
    </Suspense>
  );
}
