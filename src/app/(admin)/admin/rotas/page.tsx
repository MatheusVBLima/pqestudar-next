import path from "node:path";
import { ensureAdmin } from "@/lib/admin-guard";
import { collectRoutes } from "@/lib/route-catalog";
import catalog from "@/lib/generated/route-catalog.json";
import AdminRoutesClient from "@/components/pages/admin/AdminRoutesClient";

export default async function Page() {
  await ensureAdmin();
  const routes = process.env.NODE_ENV === "development"
    ? collectRoutes(path.join(process.cwd(), "src/app"))
    : catalog;
  return <AdminRoutesClient routes={routes} />;
}
