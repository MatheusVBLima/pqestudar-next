import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";

export const runtime = "nodejs";

const USERS_PER_PAGE = 1000;
const MAX_PAGES = 100;

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;

  const authenticatedClient = await createServerSupabaseClientWithAuth();
  const { data: isAdmin, error: roleError } = await authenticatedClient.rpc("has_role", {
    _user_id: auth.user.id,
    _role: "admin",
  });

  if (roleError || isAdmin !== true) {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  }

  const startAt = parseDate(request.nextUrl.searchParams.get("start_at"));
  const endAt = parseDate(request.nextUrl.searchParams.get("end_at"));
  const bucket = request.nextUrl.searchParams.get("bucket") === "hour" ? "hour" : "day";
  if (startAt === undefined || endAt === undefined) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor." },
      { status: 500 },
    );
  }

  let count = 0;
  const signupDates: Date[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USERS_PER_PAGE });
    if (error) {
      console.error("[admin-dashboard] Failed to count new signups", error);
      return NextResponse.json({ error: "Não foi possível consultar os usuários." }, { status: 502 });
    }

    const users = data.users || [];
    for (const user of users) {
      const createdAt = new Date(user.created_at).getTime();
      const matches = (!startAt || createdAt >= startAt.getTime()) && (!endAt || createdAt < endAt.getTime());
      if (matches) {
        count += 1;
        signupDates.push(new Date(createdAt));
      }
    }

    if (users.length < USERS_PER_PAGE) break;
  }

  const floorBucket = (value: Date) => {
    const date = new Date(value);
    if (bucket === "hour") date.setUTCMinutes(0, 0, 0);
    else date.setUTCHours(0, 0, 0, 0);
    return date;
  };
  const firstSignup = signupDates.length
    ? new Date(Math.min(...signupDates.map((date) => date.getTime())))
    : null;
  const seriesStart = floorBucket(startAt || firstSignup || endAt || new Date());
  const seriesEnd = endAt || new Date();
  const totals = new Map<string, number>();
  for (const date of signupDates) {
    const key = floorBucket(date).toISOString();
    totals.set(key, (totals.get(key) || 0) + 1);
  }
  const series: Array<{ bucket_at: string; signups: number }> = [];
  const cursor = new Date(seriesStart);
  for (let index = 0; cursor < seriesEnd && index < 5000; index += 1) {
    const key = cursor.toISOString();
    series.push({ bucket_at: key, signups: totals.get(key) || 0 });
    if (bucket === "hour") cursor.setUTCHours(cursor.getUTCHours() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return NextResponse.json(
    { count, series },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
