import { AFFILIATE_CODE_PATTERN, normalizeAffiliateCode } from './code';
// Shares the existing consent preference. No referral is persisted in localStorage.
export function hasAffiliateConsent() {
  try {
    const data = JSON.parse(localStorage.getItem('cookieConsent') || 'null');
    const date = Date.parse(data?.consentDate || '');
    return data?.hasConsented === true && data?.preferences?.marketing === true && Number.isFinite(date)
      && date <= Date.now() && Date.now() - date < 365 * 86400000;
  } catch { return false; }
}
let candidate: string | null = null;
let attempted: string | null = null;
let cleared = false;
let queue: Promise<void> = Promise.resolve();
export function syncAffiliateReferral() {
  const code = normalizeAffiliateCode(new URL(window.location.href).searchParams.get('ref') || '');
  if (AFFILIATE_CODE_PATTERN.test(code)) candidate = code;
  queue = queue.catch(() => {}).then(async () => {
    if (!hasAffiliateConsent()) {
      attempted = null;
      if (!cleared) {
        const response = await fetch('/api/affiliates/referral',{method:'DELETE',signal:AbortSignal.timeout(5000)});
        cleared = response.ok;
      }
      return;
    }
    cleared = false;
    if (!candidate || attempted === candidate) return;
    const current = candidate;
    const response = await fetch('/api/affiliates/referral',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({code:current,marketingConsent:true}),signal:AbortSignal.timeout(5000)});
    if (response.ok) attempted = current;
  });
  return queue;
}
