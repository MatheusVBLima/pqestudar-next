import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";

export const runtime = "nodejs";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;

  const startAt = parseDate(request.nextUrl.searchParams.get("start_at"));
  const endAt = parseDate(request.nextUrl.searchParams.get("end_at"));
  const bucket = request.nextUrl.searchParams.get("bucket") === "hour" ? "hour" : "day";
  if (startAt === undefined || endAt === undefined) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClientWithAuth();
  const { data, error } = await supabase.rpc("admin_new_signups_dashboard", {
    start_at: startAt,
    end_at: endAt,
    bucket_size: bucket,
  });

  if (error) {
    console.error("[admin-dashboard] Failed to load new signups", error);
    return NextResponse.json(
      { error: "Não foi possível consultar os novos inscritos." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    data ?? { count: 0, series: [] },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
