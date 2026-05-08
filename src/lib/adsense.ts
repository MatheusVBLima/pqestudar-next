const ADSENSE_CLIENT = "ca-pub-1740357621806249";
const ADSENSE_SCRIPT_ID = "google-adsense-script";
let adsenseLoadScheduled = false;
let latestPersonalizedAds = false;

type WindowWithIdle = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: 0 | 1 };
};

export function loadAdSenseAfterIdle(options: { personalizedAds?: boolean; delayMs?: number } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const { personalizedAds = false, delayMs = 15000 } = options;
  latestPersonalizedAds = personalizedAds;
  if (document.getElementById(ADSENSE_SCRIPT_ID) || adsenseLoadScheduled) {
    const adsWindow = window as WindowWithIdle;
    adsWindow.adsbygoogle = adsWindow.adsbygoogle || [];
    adsWindow.adsbygoogle.requestNonPersonalizedAds = personalizedAds ? 0 : 1;
    return;
  }

  adsenseLoadScheduled = true;

  const scheduleInject = () => {
    const inject = () => {
      const adsWindow = window as WindowWithIdle;
      adsWindow.adsbygoogle = adsWindow.adsbygoogle || [];
      adsWindow.adsbygoogle.requestNonPersonalizedAds = latestPersonalizedAds ? 0 : 1;

      if (document.getElementById(ADSENSE_SCRIPT_ID)) return;

      const script = document.createElement("script");
      script.id = ADSENSE_SCRIPT_ID;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(script);
    };

    const adsWindow = window as WindowWithIdle;
    if (adsWindow.requestIdleCallback) {
      adsWindow.requestIdleCallback(inject, { timeout: 5000 });
      return;
    }

    inject();
  };

  const timeoutId = window.setTimeout(scheduleInject, delayMs);
  const loadOnInteraction = () => {
    window.clearTimeout(timeoutId);
    scheduleInject();
  };

  window.addEventListener("scroll", loadOnInteraction, { once: true, passive: true });
  window.addEventListener("pointerdown", loadOnInteraction, { once: true, passive: true });
}
