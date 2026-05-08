import { useState, useEffect } from 'react';
import { loadAdSenseAfterIdle } from '@/lib/adsense';

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

const defaultPreferences: CookiePreferences = {
  necessary: true, // Always true, cannot be disabled
  analytics: false,
  marketing: false,
  functional: false,
};

export const useCookieConsent = () => {
  const [consentData, setConsentData] = useState<CookieConsentData>({
    hasConsented: false,
    preferences: defaultPreferences,
  });
  
  const [showBanner, setShowBanner] = useState(false);

  // Load consent data from localStorage on mount
  useEffect(() => {
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
    setConsentData({
      hasConsented: false,
      preferences: defaultPreferences,
    });
    setShowBanner(true);
  };

  // Apply cookie preferences (integrate with analytics, etc.)
  const applyCookiePreferences = (preferences: CookiePreferences) => {
    // Analytics cookies
    if (preferences.analytics) {
      // Enable analytics (Google Analytics, etc.)
      console.log('Analytics cookies enabled');
    } else {
      // Disable analytics
      console.log('Analytics cookies disabled');
    }

    loadAdSenseAfterIdle({
      personalizedAds: preferences.marketing,
    });

    // Marketing cookies
    if (preferences.marketing) {
      // Enable marketing cookies (Facebook Pixel, etc.)
      console.log('Marketing cookies enabled');
    } else {
      // Disable marketing personalization while keeping delayed non-personalized ads.
      console.log('Marketing cookies disabled; requesting non-personalized ads');
    }

    // Functional cookies
    if (preferences.functional) {
      // Enable functional cookies (user preferences, etc.)
      console.log('Functional cookies enabled');
    } else {
      // Disable functional cookies
      console.log('Functional cookies disabled');
    }
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
