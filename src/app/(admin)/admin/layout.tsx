import type { Metadata } from "next";
import { ensureAdmin } from "@/lib/admin-guard";
import { AdminLayout } from "@/components/admin/dashboard/AdminLayout";

export const metadata: Metadata = {
  title: "Admin | PqEstudar",
  robots: { index: false, follow: false },
};

export default async function AdminSegmentLayout({ children }: { children: React.ReactNode }) {
  await ensureAdmin();
  return <AdminLayout>{children}</AdminLayout>;
}
