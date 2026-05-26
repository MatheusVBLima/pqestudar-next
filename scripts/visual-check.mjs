import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const canonicalOrigin = process.env.CANONICAL_ORIGIN ?? "https://www.pqestudar.com.br";
const outDir = "test-results/visual-check";
const expectedAdsTxt = "google.com, pub-1740357621806249, DIRECT, f08c47fec0942fa0";
const expectedAdSenseAccount = "ca-pub-1740357621806249";

const routes = [
  { path: "/", name: "home" },
  { path: "/login", name: "login", requireLogo: false },
  { path: "/ferramentas", name: "ferramentas" },
  { path: "/concursos", name: "concursos" },
  { path: "/produtos", name: "produtos" },
  { path: "/guias", name: "guias" },
  { path: "/votacoes", name: "votacoes" },
  { path: "/salvos", name: "salvos", expectedCanonicalPath: "/login" },
  { path: "/explorar-cursos", name: "explorar-cursos" },
  { path: "/faq", name: "faq" },
  { path: "/sobre-pqestudar", name: "sobre-pqestudar" },
  { path: "/configuracoes-cookies", name: "configuracoes-cookies" },
  { path: "/privacidade", name: "privacidade" },
  { path: "/termos", name: "termos" },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

const ignoredConsoleFragments = [
  "Download the React DevTools",
  "Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED",
  "ResizeObserver loop",
];

function slugRoute(route) {
  return route.name ?? (route.path === "/" ? "home" : route.path.replace(/^\/+/, "").replace(/[/:?#[\]@!$&'()*+,;=.]+/g, "-"));
}

function expectedCanonicalUrl(route) {
  const expectedPath = route.expectedCanonicalPath ?? route.path;
  if (expectedPath === "/") return canonicalOrigin;
  return new URL(expectedPath, canonicalOrigin).toString();
}

async function setCookieConsent(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "cookieConsent",
      JSON.stringify({
        hasConsented: true,
        preferences: {
          necessary: true,
          analytics: false,
          marketing: false,
          functional: false,
        },
        consentDate: new Date().toISOString(),
      }),
    );
  });
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const failures = [];

async function checkTextEndpoint(context, path, expectedContent) {
  const response = await context.request.get(new URL(path, baseUrl).toString());
  const errors = [];

  if (!response.ok()) {
    errors.push(`HTTP ${response.status()} for ${path}`);
  } else {
    const content = (await response.text()).trim();
    if (content !== expectedContent) {
      errors.push(`Expected "${expectedContent}", found "${content || "empty"}"`);
    }
  }

  if (errors.length > 0) {
    failures.push({
      viewport: "endpoint",
      route: path,
      errors,
    });
  }
}

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });

  if (viewport.name === "desktop") {
    await checkTextEndpoint(context, "/ads.txt", expectedAdsTxt);
  }

  for (const route of routes) {
    const page = await context.newPage();
    const pageErrors = [];

    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (ignoredConsoleFragments.some((fragment) => text.includes(fragment))) return;
      pageErrors.push(`console.error: ${text}`);
    });

    page.on("pageerror", (error) => {
      pageErrors.push(`pageerror: ${error.message}`);
    });

    page.on("requestfailed", (request) => {
      const requestUrl = request.url();
      if (!requestUrl.startsWith(baseUrl)) return;
      pageErrors.push(`request failed: ${requestUrl} (${request.failure()?.errorText ?? "unknown"})`);
    });

    await setCookieConsent(page);

    const url = new URL(route.path, baseUrl).toString();
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });

    if (!response || !response.ok()) {
      pageErrors.push(`HTTP ${response?.status() ?? "no response"} for ${url}`);
    }

    await page.screenshot({
      path: `${outDir}/${viewport.name}-${slugRoute(route)}.png`,
      fullPage: true,
    });

    const logoCount = await page.locator('img[alt="PqEstudar"]').count();
    if (route.requireLogo !== false && logoCount === 0) {
      pageErrors.push("Logo PqEstudar not found");
    }

    const canonicalLinks = page.locator('link[rel="canonical"]');
    const canonicalCount = await canonicalLinks.count();
    if (canonicalCount !== 1) {
      pageErrors.push(`Expected 1 canonical link, found ${canonicalCount}`);
    } else {
      const canonicalHref = await canonicalLinks.first().getAttribute("href");
      const expectedHref = expectedCanonicalUrl(route);
      if (canonicalHref !== expectedHref) {
        pageErrors.push(`Expected canonical ${expectedHref}, found ${canonicalHref ?? "empty"}`);
      }
    }

    const adsenseAccount = await page.locator('meta[name="google-adsense-account"]').getAttribute("content");
    if (adsenseAccount !== expectedAdSenseAccount) {
      pageErrors.push(`Expected google-adsense-account ${expectedAdSenseAccount}, found ${adsenseAccount ?? "empty"}`);
    }

    if (pageErrors.length > 0) {
      failures.push({
        viewport: viewport.name,
        route: route.path,
        errors: pageErrors,
      });
    }

    await page.close();
  }

  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.error("\nVisual check found issues:\n");
  for (const failure of failures) {
    console.error(`[${failure.viewport}] ${failure.route}`);
    for (const error of failure.errors) {
      console.error(`  - ${error}`);
    }
  }
  console.error(`\nScreenshots saved to ${outDir}`);
  process.exit(1);
}

console.log(`Visual check passed. Screenshots saved to ${outDir}`);
