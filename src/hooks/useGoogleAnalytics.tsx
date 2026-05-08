import { useEffect, useRef } from 'react';
import { useCookieConsent } from './useCookieConsent';

const GA_MEASUREMENT_ID = 'G-2N5LG0E1Q5';

// Extend window object to include gtag
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export const useGoogleAnalytics = () => {
  const { consentData } = useCookieConsent();
  const gaLoadedRef = useRef(false);
  const consentInitializedRef = useRef(false);

  // Initialize Consent Mode v2 with default denied values
  useEffect(() => {
    if (consentInitializedRef.current) return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;

    // Set default consent state (denied for everything except security)
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'analytics_storage': 'denied',
      'functionality_storage': 'denied',
      'personalization_storage': 'denied',
      'security_storage': 'granted', // Always granted for essential cookies
    });

    console.log('[GA] Consent Mode v2 initialized with default denied values');
    consentInitializedRef.current = true;
  }, []);

  // Update consent mode and load GA based on user preferences
  useEffect(() => {
    if (!consentInitializedRef.current || !window.gtag) return;

    const { preferences } = consentData;

    // Map cookie preferences to Consent Mode v2
    const consentUpdate = {
      'ad_storage': preferences.marketing ? 'granted' : 'denied',
      'ad_user_data': preferences.marketing ? 'granted' : 'denied',
      'ad_personalization': preferences.marketing ? 'granted' : 'denied',
      'analytics_storage': preferences.analytics ? 'granted' : 'denied',
      'functionality_storage': preferences.functional ? 'granted' : 'denied',
      'personalization_storage': preferences.functional ? 'granted' : 'denied',
      'security_storage': 'granted', // Always granted
    };

    // Update consent mode
    window.gtag('consent', 'update', consentUpdate);
    console.log('[GA] Consent Mode updated:', consentUpdate);

    // Load GA script only if analytics is granted and not already loaded
    if (preferences.analytics && !gaLoadedRef.current) {
      loadGoogleAnalytics();
    }

    // If analytics is denied after being granted, we can't unload the script
    // but the Consent Mode will prevent new cookies and tracking
    if (!preferences.analytics && gaLoadedRef.current) {
      console.log('[GA] Analytics consent denied - tracking paused via Consent Mode');
    }
  }, [consentData]);

  const loadGoogleAnalytics = () => {
    if (gaLoadedRef.current) {
      console.log('[GA] Already loaded, skipping duplicate load');
      return;
    }

    // Create and inject the GA script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    
    script.onload = () => {
      // Initialize GA
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, {
        'anonymize_ip': true, // GDPR compliance
        'cookie_flags': 'SameSite=None;Secure', // Modern cookie security
      });
      
      console.log('[GA] Google Analytics loaded and initialized:', GA_MEASUREMENT_ID);
      gaLoadedRef.current = true;
    };

    script.onerror = () => {
      console.error('[GA] Failed to load Google Analytics script');
    };

    document.head.appendChild(script);
    console.log('[GA] Loading Google Analytics script...');
  };

  return {
    // Expose gtag for custom events if needed
    trackEvent: (eventName: string, eventParams?: Record<string, unknown>) => {
      if (window.gtag && consentData.preferences.analytics) {
        window.gtag('event', eventName, eventParams);
        console.log('[GA] Event tracked:', eventName, eventParams);
      } else {
        console.log('[GA] Event not tracked (analytics not consented):', eventName);
      }
    },
  };
};
