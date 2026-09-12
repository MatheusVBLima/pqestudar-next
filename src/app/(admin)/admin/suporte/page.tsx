import { ensureAdmin } from '@/lib/admin-guard';
import SupportAdminClient from '@/components/pages/admin/SupportAdminClient';
export default async function Page() {
  await ensureAdmin();
  return <SupportAdminClient />;
}
