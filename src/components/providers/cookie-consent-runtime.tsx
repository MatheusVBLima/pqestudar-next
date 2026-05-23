"use client";

import { CookieBanner } from "@/components/ui/cookie-banner";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";

export function CookieConsentRuntime() {
  useGoogleAnalytics();

  return <CookieBanner />;
}
