"use client";

import { CookieBanner } from "@/components/ui/cookie-banner";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { Suspense } from 'react';
import { AffiliateReferralRuntime } from '@/components/affiliates/AffiliateReferralRuntime';

export function CookieConsentRuntime() {
  useGoogleAnalytics();

  return <><CookieBanner /><Suspense fallback={null}><AffiliateReferralRuntime /></Suspense></>;
}
