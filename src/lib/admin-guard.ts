import "server-only";
import { redirect } from "next/navigation";
import {
  createServerSupabaseClientWithAuth,
  getServerSession,
} from "@/lib/supabase-server";

/**
 * Server-side admin guard. Validates session via cookie and admin role via
 * the `check-admin` Supabase Edge Function. Redirects on failure (no return).
 *
 * Use in Server Layouts/Pages:
 *
 * ```ts
 * export default async function AdminLayout({ children }) {
 *   await ensureAdmin();
 *   return <AdminShell>{children}</AdminShell>;
 * }
 * ```
 */
export async function ensureAdmin(): Promise<void> {
  const { session, user } = await getServerSession();

  if (!session || !user) {
    redirect("/login?from=/admin");
  }

  const supabase = await createServerSupabaseClientWithAuth();
  const { data, error } = await supabase.functions.invoke<{ isAdmin?: boolean }>(
    "check-admin",
  );

  if (error || !data?.isAdmin) {
    redirect("/");
  }
}
