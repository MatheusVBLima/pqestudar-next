import "server-only";

import {
  createServerSupabaseClientWithAuth,
  getServerSession,
} from "@/lib/supabase-server";
import { PUBLIC_SUPABASE_URL } from "@/lib/runtime-env";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ta3hpb213emJ5a21xdHRmb3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTc1OTIsImV4cCI6MjA3MzQ5MzU5Mn0.IzpMhFg4XJGNxPJlu8LTP_yDOGeHN4C8dESNKxq7bIc";

export type ActionResult<T = unknown> = {
  data: T | null;
  error: string | null;
};

export async function getActionSession() {
  const { session, user } = await getServerSession();
  if (!session || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }
  return { session, user };
}

export async function requireAdmin() {
  const { session, user } = await getActionSession();
  const supabase = await createServerSupabaseClientWithAuth();

  const { data, error } = await supabase.functions.invoke<{ isAdmin?: boolean }>(
    "check-admin",
  );
  if (error || !data?.isAdmin) {
    throw new Error("FORBIDDEN");
  }
  return { session, user };
}

export async function invokeAdminFunction<TInput, TOutput>(
  name: string,
  body: TInput,
): Promise<TOutput> {
  const { session } = await getActionSession();
  const response = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      (payload && typeof payload.error === "string" && payload.error) ||
      `Erro ao chamar função ${name}`;
    throw new Error(message);
  }

  return payload as TOutput;
}
