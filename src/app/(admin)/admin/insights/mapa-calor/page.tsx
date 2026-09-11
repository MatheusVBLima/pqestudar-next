import { ensureAdmin } from '@/lib/admin-guard';
import HeatmapAdmin from '@/components/pages/admin/HeatmapAdminClient';
export default async function Page() {
  await ensureAdmin();
  return <HeatmapAdmin />;
}
