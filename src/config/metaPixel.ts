import { META_PIXEL_ID, PIXEL_DEBUG, PIXEL_DISABLED } from "@/lib/runtime-env";

declare global {
  interface Window {
    fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
  }
}

// Meta Pixel Configuration
// Use environment variable with fallback to hardcoded ID
export { META_PIXEL_ID };

// Keep third-party tracking out of local dev unless explicitly enabled.
export { PIXEL_DISABLED };

export const CURRENCY = "BRL";
export const ROUTE_LANDING = "/mapa-dos-beneficios";
export const ROUTE_THANKYOU = "/obrigado";

// Enable debug logging in development
export { PIXEL_DEBUG };

// Get order value from URL query params or state
export const GET_ORDER_VALUE = (): number | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get('v') || urlParams.get('value');
  if (value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const stored = window.localStorage.getItem("cookieConsent");
    if (!stored) return false;
    const parsed = JSON.parse(stored) as {
      hasConsented?: boolean;
      preferences?: { marketing?: boolean };
    };
    return Boolean(parsed.hasConsented && parsed.preferences?.marketing);
  } catch {
    return false;
  }
}

/**
 * Utility function to track Meta Pixel events programmatically
 * @param event - Event name (e.g., 'Purchase', 'Lead', 'ViewContent')
 * @param params - Optional event parameters
 */
export function trackMetaPixel(event: string, params?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.fbq && !PIXEL_DISABLED && hasMarketingConsent()) {
    window.fbq('track', event, params || {});
  }
}

/**
 * Utility function to track custom Meta Pixel events
 * @param event - Custom event name
 * @param params - Optional event parameters
 */
export function trackMetaPixelCustom(event: string, params?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.fbq && !PIXEL_DISABLED && hasMarketingConsent()) {
    window.fbq('trackCustom', event, params || {});
  }
}
