import { supabase } from '@/integrations/supabase/client';

interface PageSettingsWindow extends Window {
  __PAGE_SETTINGS_READY__?: boolean;
}

export interface DomSnapshot {
  url: string;
  path: string;
  status: 'ok' | 'timeout' | 'error';
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1Text: string | null;
  h1Count: number;
  h2Count: number;
  ogPresent: boolean;
  schemaTypes: string[];
  plainText: string;
  wordCount: number;
  headingsTotal: number;
  hasLists: boolean;
  ctaButtons: string[];
  ctaPositions: string[];
  paragraphsCount: number;
  longParagraphs: number;
  avgSentenceLength: number;
}

const RENDER_WAIT_MS = 5000;
const PAGE_SETTINGS_WAIT_MS = 8000;
const IFRAME_TIMEOUT_MS = 20000;
const STATIC_PATHS = ['/', '/ferramentas', '/concursos', '/sobre-pqestudar'];
const MAX_SLUG_SAMPLE = 10;

export async function buildAuditUrls(): Promise<{ url: string; path: string }[]> {
  const origin = window.location.origin;
  const urls = STATIC_PATHS.map(p => ({ url: `${origin}${p}`, path: p }));

  try {
    const { data } = await supabase
      .from('oportunidades_public')
      .select('slug')
      .order('data_publicacao', { ascending: false })
      .limit(MAX_SLUG_SAMPLE);

    if (data) {
      for (const row of data) {
        if (row.slug) {
          urls.push({ url: `${origin}/concursos/${row.slug}`, path: `/concursos/${row.slug}` });
        }
      }
    }
  } catch {
    // If view query fails, just audit static paths
  }

  return urls;
}

export function extractDomFromIframe(url: string, path: string): Promise<DomSnapshot> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;top:-10000px;left:-10000px;width:1280px;height:800px;visibility:hidden;pointer-events:none;';

    let resolved = false;

    const cleanup = () => {
      try {
        document.body.removeChild(iframe);
      } catch {
        // Iframe may already be detached during timeout/error cleanup.
      }
    };

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(emptySnapshot(url, path, 'timeout'));
      }
    }, IFRAME_TIMEOUT_MS);

    iframe.onload = () => {
      // Wait for page settings to be ready before extracting DOM
      const iframeWin = iframe.contentWindow as PageSettingsWindow | null;
      
      const waitAndExtract = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        try {
          const doc = iframe.contentDocument;
          if (!doc) {
            cleanup();
            resolve(emptySnapshot(url, path, 'error'));
            return;
          }
          const snapshot = extractFromDocument(doc, url, path);
          cleanup();
          resolve(snapshot);
        } catch {
          cleanup();
          resolve(emptySnapshot(url, path, 'error'));
        }
      };

      // Check if page settings are already ready
      const checkReady = () => {
        try {
          return iframeWin?.__PAGE_SETTINGS_READY__ === true;
        } catch {
          return false;
        }
      };

      if (checkReady()) {
        // Already ready, wait a bit for final render
        setTimeout(waitAndExtract, 1000);
      } else {
        // Wait for the page-settings-ready event or timeout
        const settingsTimeout = setTimeout(() => {
          // Proceed anyway after waiting
          waitAndExtract();
        }, PAGE_SETTINGS_WAIT_MS);

        try {
          iframeWin?.addEventListener('page-settings-ready', () => {
            clearTimeout(settingsTimeout);
            // Give a short delay for React to re-render with real data
            setTimeout(waitAndExtract, 500);
          });
        } catch {
          clearTimeout(settingsTimeout);
          setTimeout(waitAndExtract, RENDER_WAIT_MS);
        }
      }
    };

    iframe.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        resolve(emptySnapshot(url, path, 'error'));
      }
    };

    document.body.appendChild(iframe);
    iframe.src = url;
  });
}

export async function runIframeAudit<T>(
  urls: { url: string; path: string }[],
  analyzeFn: (snapshot: DomSnapshot) => T,
  onProgress?: (current: number, total: number, path: string) => void,
  concurrency = 2,
): Promise<T[]> {
  const results: T[] = [];
  const queue = [...urls];
  let completed = 0;

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      const snapshot = await extractDomFromIframe(item.url, item.path);
      results.push(analyzeFn(snapshot));
      completed++;
      onProgress?.(completed, urls.length, item.path);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

// ─── DOM extraction ───

function extractFromDocument(doc: Document, url: string, path: string): DomSnapshot {
  const h1Elements = doc.querySelectorAll('h1');
  const h2Elements = doc.querySelectorAll('h2');
  const allHeadings = doc.querySelectorAll('h1,h2,h3,h4,h5,h6');

  const titleEl = doc.querySelector('title');
  const metaDesc = doc.querySelector('meta[name="description"]');
  const canonicalEl = doc.querySelector('link[rel="canonical"]');
  const robotsEl = doc.querySelector('meta[name="robots"]');

  const ogPresent = !!(
    doc.querySelector('meta[property="og:title"]') ||
    doc.querySelector('meta[property="og:description"]') ||
    doc.querySelector('meta[property="og:image"]')
  );

  const schemaTypes: string[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const obj = JSON.parse(script.textContent || '');
      const items = Array.isArray(obj) ? obj : [obj];
      for (const item of items) {
        if (item['@type']) {
          const t = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
          schemaTypes.push(...t);
        }
      }
    } catch {
      // Ignore malformed JSON-LD scripts while auditing the rest of the page.
    }
  });

  const body = doc.body;
  const plainText = body?.innerText || '';
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  const hasLists = doc.querySelectorAll('ul, ol').length > 0;

  // Helper: check if element is a non-conversion UI control (nav, footer, accordion, etc.)
  const isNonConversionElement = (el: Element): boolean => {
    let parent = el.parentElement;
    while (parent) {
      const tag = parent.tagName?.toLowerCase();
      if (tag === 'nav' || tag === 'footer' || tag === 'header') return true;
      // Skip accordion containers (Radix UI)
      if (parent.hasAttribute('data-orientation') && parent.hasAttribute('data-state')) return true;
      parent = parent.parentElement;
    }
    // Skip Radix accordion triggers directly
    if (el.hasAttribute('data-radix-collection-item')) return true;
    return false;
  };

  const ctaButtons: string[] = [];
  doc.querySelectorAll('button, a[role="button"], a[class*="btn"], a[class*="Button"]').forEach(el => {
    if (isNonConversionElement(el)) return;
    const text = (el as HTMLElement).innerText?.trim();
    if (text && text.length > 0 && text.length < 60) ctaButtons.push(text);
  });

  // Helper: get absolute top offset relative to document
  const getAbsoluteTop = (el: HTMLElement): number => {
    let top = 0;
    let current: HTMLElement | null = el;
    while (current) {
      top += current.offsetTop || 0;
      current = current.offsetParent as HTMLElement | null;
    }
    return top;
  };

  const ctaPositions: string[] = [];
  if (body) {
    const totalHeight = body.scrollHeight || 1;
    doc.querySelectorAll('button, a[role="button"]').forEach(el => {
      if (isNonConversionElement(el)) return;
      const top = getAbsoluteTop(el as HTMLElement);
      const pos = top / totalHeight;
      if (pos < 0.33) ctaPositions.push('top');
      else if (pos < 0.66) ctaPositions.push('middle');
      else ctaPositions.push('bottom');
    });
  }

  const paragraphs = doc.querySelectorAll('p');
  let longParagraphs = 0;
  paragraphs.forEach(p => {
    if (((p as HTMLElement).innerText || '').split(/\s+/).length > 60) longParagraphs++;
  });

  const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const avgSentenceLength = sentences.length > 0
    ? Math.round(sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length)
    : 0;

  return {
    url,
    path,
    status: 'ok',
    title: titleEl?.textContent?.trim() || null,
    metaDescription: metaDesc?.getAttribute('content') || null,
    canonical: canonicalEl?.getAttribute('href') || null,
    robotsMeta: robotsEl?.getAttribute('content') || null,
    h1Text: h1Elements.length > 0 ? (h1Elements[0] as HTMLElement).innerText?.trim() || null : null,
    h1Count: h1Elements.length,
    h2Count: h2Elements.length,
    ogPresent,
    schemaTypes: [...new Set(schemaTypes)],
    plainText,
    wordCount,
    headingsTotal: allHeadings.length,
    hasLists,
    ctaButtons: ctaButtons.slice(0, 15),
    ctaPositions: [...new Set(ctaPositions)],
    paragraphsCount: paragraphs.length,
    longParagraphs,
    avgSentenceLength,
  };
}

function emptySnapshot(url: string, path: string, status: 'timeout' | 'error'): DomSnapshot {
  return {
    url, path, status,
    title: null, metaDescription: null, canonical: null, robotsMeta: null,
    h1Text: null, h1Count: 0, h2Count: 0, ogPresent: false, schemaTypes: [],
    plainText: '', wordCount: 0, headingsTotal: 0, hasLists: false,
    ctaButtons: [], ctaPositions: [], paragraphsCount: 0, longParagraphs: 0,
    avgSentenceLength: 0,
  };
}
