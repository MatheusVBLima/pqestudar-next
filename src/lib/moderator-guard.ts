import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClientWithAuth, getServerSession } from "@/lib/supabase-server";

export async function ensureModeratorAccess(): Promise<void> {
  const { session, user } = await getServerSession();
  if (!session || !user) redirect("/login?from=/moderador");

  const supabase = await createServerSupabaseClientWithAuth();
  const [moderator, admin] = await Promise.all([
    supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" }),
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
  ]);
  if (moderator.data !== true && admin.data !== true) redirect("/");
}
