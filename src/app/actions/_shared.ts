import "server-only";

import {
  createServerSupabaseClientWithAuth,
  getServerSession,
} from "@/lib/supabase-server";
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "@/lib/runtime-env";

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
      apikey: PUBLIC_SUPABASE_ANON_KEY,
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
