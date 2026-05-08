"use client";

import { createAdminPageClient } from "@/components/pages/admin/createAdminPageClient";

export default createAdminPageClient(() => import("@/legacy-pages/admin/dashboard/InsightsSeoAudit"));
