import { useCallback, useState, useEffect } from 'react';
import { loadAdSenseAfterIdle } from '@/lib/adsense';
import { devLog } from '@/lib/dev-log';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export interface CookieConsentData {
  hasConsented: boolean;
  preferences: CookiePreferences;
  consentDate?: string;
}

const COOKIE_CONSENT_KEY = 'cookieConsent';
const COOKIE_EXPIRY_DAYS = 365;
const COOKIE_CONSENT_EVENT = 'cookieConsentChanged';

const defaultPreferences: CookiePreferences = {
  necessary: true, // Always true, cannot be disabled
  analytics: false,
  marketing: false,
  functional: false,
};

// Apply cookie preferences to third-party services.
function applyCookiePreferences(preferences: CookiePreferences) {
  if (preferences.analytics) {
    devLog('Analytics cookies enabled');
  } else {
    devLog('Analytics cookies disabled');
  }

  if (preferences.marketing) {
    loadAdSenseAfterIdle({
      personalizedAds: true,
    });
    devLog('Marketing cookies enabled');
  } else {
    devLog('Marketing cookies disabled');
  }

  if (preferences.functional) {
    devLog('Functional cookies enabled');
  } else {
    devLog('Functional cookies disabled');
  }
}

export const useCookieConsent = () => {
  const [consentData, setConsentData] = useState<CookieConsentData>({
    hasConsented: false,
    preferences: defaultPreferences,
  });
  
  const [showBanner, setShowBanner] = useState(false);

  const loadStoredConsent = useCallback(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const parsed: CookieConsentData = JSON.parse(stored);
        // Check if consent is still valid (not expired)
        if (parsed.consentDate) {
          const consentDate = new Date(parsed.consentDate);
          const expiryDate = new Date(consentDate.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
          
          if (new Date() < expiryDate) {
            setConsentData(parsed);
            applyCookiePreferences(parsed.preferences);
          } else {
            // Consent expired, show banner again
            setShowBanner(true);
            applyCookiePreferences(defaultPreferences);
          }
        } else {
          setConsentData(parsed);
          applyCookiePreferences(parsed.preferences);
        }
      } catch (error) {
        console.error('Error parsing cookie consent data:', error);
        setShowBanner(true);
        applyCookiePreferences(defaultPreferences);
      }
    } else {
      setShowBanner(true);
      applyCookiePreferences(defaultPreferences);
    }
  }, []);

  // Load consent data from localStorage on mount and keep same-tab consumers synced.
  useEffect(() => {
    loadStoredConsent();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_KEY) {
        loadStoredConsent();
      }
    };

    const handleConsentChange = () => loadStoredConsent();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    };
  }, [loadStoredConsent]);

  const saveConsent = (preferences: CookiePreferences) => {
    const newConsentData: CookieConsentData = {
      hasConsented: true,
      preferences: {
        ...preferences,
        necessary: true, // Always true
      },
      consentDate: new Date().toISOString(),
    };

    setConsentData(newConsentData);
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsentData));
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT));
    setShowBanner(false);

    // Apply cookie preferences
    applyCookiePreferences(newConsentData.preferences);
  };

  const acceptAll = () => {
    const allAcceptedPreferences: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    saveConsent(allAcceptedPreferences);
  };

  const acceptNecessaryOnly = () => {
    saveConsent(defaultPreferences);
  };

  const rejectAll = () => {
    saveConsent(defaultPreferences);
  };

  const updatePreferences = (preferences: CookiePreferences) => {
    saveConsent(preferences);
  };

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT));
    setConsentData({
      hasConsented: false,
      preferences: defaultPreferences,
    });
    setShowBanner(true);
  };

  return {
    consentData,
    showBanner,
    acceptAll,
    acceptNecessaryOnly,
    rejectAll,
    updatePreferences,
    resetConsent,
    setShowBanner,
  };
};
