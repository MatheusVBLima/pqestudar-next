import { NextResponse } from "next/server";
import { createServerSupabaseClientWithAuth, getServerSession } from "@/lib/supabase-server";

export async function requireAdminApi() {
  const { user } = await getServerSession();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }),
    };
  }

  const supabase = await createServerSupabaseClientWithAuth();
  const [adminCheck, developerCheck] = await Promise.all([
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: user.id, _role: "developer" }),
  ]);

  if (adminCheck.error && developerCheck.error) {
    console.error("[admin-api] Failed to check roles", {
      admin: adminCheck.error,
      developer: developerCheck.error,
    });
  }

  if (adminCheck.data !== true && developerCheck.data !== true) {
    return {
      user: null,
      error: NextResponse.json({ error: "Acesso negado." }, { status: 403 }),
    };
  }

  return { user, error: null };
}
