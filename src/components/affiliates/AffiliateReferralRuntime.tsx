'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { syncAffiliateReferral } from '@/lib/affiliates/referral-client';

export function AffiliateReferralRuntime() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    const sync = () => { void syncAffiliateReferral().catch(() => {}); };
    sync();
    window.addEventListener('cookieConsentChanged',sync);
    window.addEventListener('storage',sync);
    return () => { window.removeEventListener('cookieConsentChanged',sync); window.removeEventListener('storage',sync); };
  },[pathname,search]);
  return null;
}
