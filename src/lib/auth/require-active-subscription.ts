import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { arePremiumCoursesPublic } from "@/lib/site-feature-flags";

export interface ActiveSubscriptionGuardResult {
  userId: string | null;
  isAdmin: boolean;
  /** Active subscription row if user has one, null for admins without subscription. */
  subscription: {
    id: string;
    plan_type: string;
    plan_tier: string;
    status: string;
    ends_at: string;
  } | null;
}

function requiredTierForPath(pathname: string): "basic" | "premium" {
  if (pathname === "/premium/beneficios" || pathname.startsWith("/premium/beneficios/")) {
    return "basic";
  }

  return "premium";
}

/**
 * Server-side gate for /premium routes.
 * - Redirects to /login if not authenticated.
 * - Redirects to /premium/upgrade if not admin and subscription is not active.
 * Returns user/subscription info for the page to use.
 */
export async function requireActiveSubscription(
  pathname: string,
): Promise<ActiveSubscriptionGuardResult> {
  const isCoursesPath = pathname === "/premium/cursos" || pathname.startsWith("/premium/cursos/");

  if (isCoursesPath && await arePremiumCoursesPublic()) {
    return { userId: null, isAdmin: false, subscription: null };
  }

  const supabase = await createServerSupabaseClientWithAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(isCoursesPath ? "/pqestudar-premium" : `/login?from=${encodeURIComponent(pathname)}`);
  }

  const [{ data: isAdmin }, { data: sub }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase
      .from("subscriptions")
      .select("id, plan_type, plan_tier, status, ends_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isActive =
    !!sub && sub.status === "active" && new Date(sub.ends_at).getTime() > Date.now();
  const planTier = sub?.plan_tier ?? "premium";
  const hasRequiredTier = requiredTierForPath(pathname) === "basic" || planTier === "premium";

  if (!isAdmin && !isActive) {
    redirect(isCoursesPath ? "/pqestudar-premium" : "/premium/upgrade");
  }

  if (!isAdmin && pathname === "/premium" && (planTier === "basic" || planTier === "founder")) {
    redirect("/premium/beneficios");
  }

  if (!isAdmin && isActive && !hasRequiredTier) {
    redirect(isCoursesPath ? "/pqestudar-premium" : "/premium/upgrade");
  }

  return {
    userId: user.id,
    isAdmin: isAdmin === true,
    subscription: sub ?? null,
  };
}
