const ADSENSE_CLIENT = "ca-pub-1740357621806249";
const ADSENSE_SCRIPT_ID = "google-adsense-script";
let adsenseLoadScheduled = false;
let latestPersonalizedAds = false;

const ADSENSE_EXCLUDED_EXACT_PATHS = new Set([
  "/breve",
  "/carteirinha",
  "/configuracoes-cookies",
  "/ferramentas/salvos",
  "/kit",
  "/login",
  "/meu-perfil",
  "/meus-materiais",
  "/pqestudar-premium",
  "/privacidade",
  "/ranking-comunidade",
  "/salvos",
  "/termos",
  "/votacoes",
]);

const ADSENSE_EXCLUDED_PATH_PREFIXES = [
  "/admin",
  "/acervo-video-prod-b7g1",
  "/acesso-kit-partida-8h3z",
  "/bonus",
  "/curadoria-conteudo-ia-k4f9",
  "/exclusivos",
  "/mapa-dos-beneficios",
  "/metodos-automacao-w2p5",
  "/premium",
  "/produtos",
  "/recursos-alta-performance-z9x0",
];

type WindowWithIdle = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: 0 | 1 };
};

export function isAdSenseAllowedPath(pathname: string): boolean {
  const normalizedPath = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;

  if (ADSENSE_EXCLUDED_EXACT_PATHS.has(normalizedPath)) return false;

  return !ADSENSE_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
}

function isCurrentPathAllowed(): boolean {
  return typeof window !== "undefined" && isAdSenseAllowedPath(window.location.pathname);
}

export function loadAdSenseAfterIdle(options: { personalizedAds?: boolean; delayMs?: number } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!isCurrentPathAllowed()) return;

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
      if (!isCurrentPathAllowed()) {
        adsenseLoadScheduled = false;
        return;
      }

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
      adsenseLoadScheduled = false;
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
