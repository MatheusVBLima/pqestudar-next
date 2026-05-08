import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "@/lib/runtime-env";

export function createServerSupabaseClient() {
  return createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function createServerSupabaseClientWithAuth() {
  const cookieStore = await cookies();

  return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; ignore.
          // Token refresh writes are picked up by the browser client on the next request.
        }
      },
    },
  });
}

export async function getServerSession(): Promise<{
  session: Session | null;
  user: User | null;
}> {
  const supabase = await createServerSupabaseClientWithAuth();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { session, user: session?.user ?? null };
}
