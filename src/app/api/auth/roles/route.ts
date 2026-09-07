import { NextResponse } from "next/server";
import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

export async function GET() {
  try {
    const supabase = await createServerSupabaseClientWithAuth();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const status = authError && (!authError.status || authError.status >= 500) ? 503 : 401;
      return NextResponse.json({ error: status === 401 ? "Sessão expirada. Entre novamente." : "Não foi possível verificar sua sessão. Tente novamente." }, { status, headers });
    }
    const roles = ["admin", "developer", "moderator", "user"] as const;
    const checks = await Promise.all(roles.map(role => supabase.rpc("has_role", { _user_id: user.id, _role: role })));
    if (checks.some(check => check.error)) {
      return NextResponse.json({ error: "Não foi possível verificar suas permissões. Tente novamente." }, { status: 503, headers });
    }
    return NextResponse.json({ userId: user.id, roles: roles.filter((_, index) => checks[index].data === true) }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível verificar suas permissões. Tente novamente." }, { status: 503, headers });
  }
}
