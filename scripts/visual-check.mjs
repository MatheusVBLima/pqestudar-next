import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const outDir = "test-results/visual-check";

const routes = [
  "/",
  "/login",
  "/ferramentas",
  "/concursos",
  "/privacidade",
  "/termos",
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
  return route === "/" ? "home" : route.replace(/^\/+/, "").replace(/[/:?#[\]@!$&'()*+,;=.]+/g, "-");
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

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });

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

    const url = new URL(route, baseUrl).toString();
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });

    if (!response || !response.ok()) {
      pageErrors.push(`HTTP ${response?.status() ?? "no response"} for ${url}`);
    }

    await page.screenshot({
      path: `${outDir}/${viewport.name}-${slugRoute(route)}.png`,
      fullPage: true,
    });

    const logoCount = await page.locator('img[alt="PqEstudar"]').count();
    if (route !== "/login" && logoCount === 0) {
      pageErrors.push("Logo PqEstudar not found");
    }

    if (pageErrors.length > 0) {
      failures.push({
        viewport: viewport.name,
        route,
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
