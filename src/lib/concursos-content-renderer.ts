/**
 * Rich content renderer for /concursos pages.
 * Provides parity between preview (admin) and public rendering.
 * 
 * Pipeline:
 * 1. Detect legacy HTML-only content vs Markdown/mixed content
 * 2. Parse Markdown with HTML support enabled to preserve inline tags in mixed content
 * 3. Sanitize with sanitize-html (whitelist approach)
 * 4. Wrap tables for responsive scroll
 * 5. Return safe HTML for dangerouslySetInnerHTML
 */

import { marked } from "marked";
import sanitizeHtmlLib from "sanitize-html";

// Configure marked with GFM tables enabled.
marked.setOptions({
  gfm: true,
  breaks: true,
});

// sanitize-html configuration - strict whitelist with GFM tables
const SANITIZE_CONFIG: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "strong", "b", "em", "i",
    "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a",
    "blockquote",
    "code", "pre",
    // GFM table tags
    "table", "thead", "tbody", "tr", "th", "td",
    // Images
    "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    th: ["align", "style"],
    td: ["align", "style"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https"],
  // Allow only text-align style for table cells
  allowedStyles: {
    th: { "text-align": [/^left$/, /^right$/, /^center$/] },
    td: { "text-align": [/^left$/, /^right$/, /^center$/] },
  },
  // Enforce secure link attributes
  transformTags: {
    a: (tagName, attribs) => {
      return {
        tagName: "a",
        attribs: {
          ...attribs,
          href: attribs.href || "",
          target: "_blank",
          rel: "nofollow noopener noreferrer",
        },
      };
    },
    // Map H1 to H2 for SEO hierarchy
    h1: () => ({
      tagName: "h2",
      attribs: { class: "text-xl font-semibold mt-6 mb-3" },
    }),
    h2: () => ({
      tagName: "h2",
      attribs: { class: "text-xl font-semibold mt-6 mb-3" },
    }),
    h3: () => ({
      tagName: "h3",
      attribs: { class: "text-lg font-medium mt-4 mb-2" },
    }),
    p: () => ({
      tagName: "p",
      attribs: { class: "mb-4" },
    }),
    ul: () => ({
      tagName: "ul",
      attribs: { class: "list-disc pl-6 mb-4" },
    }),
    ol: () => ({
      tagName: "ol",
      attribs: { class: "list-decimal pl-6 mb-4" },
    }),
    li: () => ({
      tagName: "li",
      attribs: { class: "mb-1" },
    }),
    blockquote: () => ({
      tagName: "blockquote",
      attribs: { class: "border-l-4 border-muted-foreground/30 pl-4 italic my-4" },
    }),
    pre: () => ({
      tagName: "pre",
      attribs: { class: "bg-muted rounded-md p-4 overflow-x-auto my-4" },
    }),
    code: () => ({
      tagName: "code",
      attribs: { class: "bg-muted px-1.5 py-0.5 rounded text-sm" },
    }),
    hr: () => ({
      tagName: "hr",
      attribs: { class: "my-6 border-border" },
    }),
    // Images
    img: (tagName, attribs) => ({
      tagName: "img",
      attribs: {
        ...attribs,
        src: attribs.src || "",
        alt: attribs.alt || "",
        loading: attribs.loading || "lazy",
        decoding: attribs.decoding || "async",
        class: "rounded-md my-4 max-w-full h-auto",
      },
    }),
    // Table styling
    table: () => ({
      tagName: "table",
      attribs: { class: "concursos-table w-full border-collapse my-4 text-sm" },
    }),
    thead: () => ({
      tagName: "thead",
      attribs: { class: "bg-muted/50" },
    }),
    th: (tagName, attribs) => ({
      tagName: "th",
      attribs: { 
        ...attribs,
        class: "border border-border px-3 py-2 font-semibold text-left",
      },
    }),
    td: (tagName, attribs) => ({
      tagName: "td",
      attribs: { 
        ...attribs,
        class: "border border-border px-3 py-2 align-top",
      },
    }),
  },
  // Remove all other tags
  disallowedTagsMode: "discard",
};

/**
 * Detect if content contains significant HTML tags (not just entities)
 */
function hasSignificantHtml(content: string): boolean {
  if (!content) return false;
  // Match opening tags like <h2>, <p>, <div>, <table> etc. (not just &lt; entities)
  return /<\s*(?:h[1-6]|p|div|ul|ol|li|a|strong|em|b|i|blockquote|br|hr|pre|code|span|table|thead|tbody|tr|th|td)\b[^>]*>/i.test(content);
}

/**
 * Detect Markdown syntax so mixed HTML + Markdown content is parsed correctly.
 */
function hasMarkdownSyntax(content: string): boolean {
  if (!content) return false;

  return (
    /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|~~~)/m.test(content) ||
    /(^|\n)\s*\|.+\|\s*$/m.test(content) ||
    /\[[^\]]+\]\([^)]+\)/.test(content) ||
    /\*\*[^*]+\*\*|__[^_]+__|`[^`]+`/.test(content) ||
    /(^|\n)\s*---+\s*($|\n)/m.test(content)
  );
}

/**
 * Detect content that is already an HTML fragment/document and does not need Markdown parsing.
 */
function isLegacyHtmlOnly(content: string): boolean {
  if (!content) return false;
  return /^\s*</.test(content) && hasSignificantHtml(content) && !hasMarkdownSyntax(content);
}

/**
 * Convert Markdown (and mixed Markdown + inline HTML) to HTML.
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return "";
  return marked.parse(markdown, { async: false }) as string;
}

/**
 * Post-process HTML to convert leftover markdown emphasis markers (`**bold**`,
 * `*italic*`) inside HTML tags that `marked` did not process.
 *
 * Why: when admins save mixed HTML + markdown content (e.g. `<h2>**Title**</h2>`),
 * `marked` does not recurse into HTML inline content. Without this pass, the
 * markers render literally on the page.
 *
 * Conservative: only matches paired markers without newlines or angle brackets
 * inside, to avoid mangling intentional asterisks or breaking around tags.
 */
function processInlineEmphasis(html: string): string {
  if (!html) return html;
  return html
    // **bold** → <strong>bold</strong>
    .replace(/\*\*([^*<>\n]+?)\*\*/g, "<strong>$1</strong>")
    // *italic* → <em>italic</em> (avoid matching ** boundaries)
    .replace(/(?<![*\w])\*([^*<>\n]+?)\*(?!\*)/g, "<em>$1</em>");
}

/**
 * Sanitize HTML content using sanitize-html with whitelist
 */
function sanitize(html: string): string {
  if (!html) return "";
  return sanitizeHtmlLib(html, SANITIZE_CONFIG);
}

/**
 * Wrap tables in a responsive scroll container for mobile
 */
function wrapTablesForResponsive(html: string): string {
  if (!html) return "";
  // Wrap each <table> in a scrollable div
  return html.replace(
    /<table([^>]*)>/g,
    '<div class="concursos-table-wrap overflow-x-auto -mx-1 px-1 my-4"><table$1>'
  ).replace(
    /<\/table>/g,
    '</table></div>'
  );
}

/**
 * Main render function for /concursos rich content.
 * Unified function that handles legacy HTML, Markdown, and mixed HTML + Markdown content.
 * 
 * - If content is legacy HTML-only → sanitize only
 * - Otherwise → parse as Markdown with HTML support, then sanitize
 * - Wrap tables for responsive scroll
 * 
 * @param content The raw content (HTML or Markdown)
 * @returns Safe HTML string for dangerouslySetInnerHTML
 */
export function renderRichContentConcursos(content: string | null | undefined): string {
  if (!content) return "";

  const trimmed = content.trim();
  if (!trimmed) return "";

  const html = isLegacyHtmlOnly(trimmed)
    ? sanitize(trimmed)
    : sanitize(markdownToHtml(trimmed));

  // Process leftover **bold**/*italic* inside HTML tags before wrapping tables.
  return wrapTablesForResponsive(processInlineEmphasis(html));
}

/**
 * Render content that is known to be Markdown (e.g. guides content_markdown).
 * Always runs through marked regardless of HTML detection heuristics.
 * This prevents the legacy-HTML detector from skipping Markdown parsing.
 */
export function renderMarkdownContent(content: string | null | undefined): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (!trimmed) return "";
  const html = sanitize(markdownToHtml(trimmed));
  return wrapTablesForResponsive(processInlineEmphasis(html));
}

/**
 * Alias for renderRichContentConcursos - unified entry point
 */
export function renderContentUnified(content: string | null | undefined): string {
  return renderRichContentConcursos(content);
}

/**
 * Render update text (atualizacoes) - shorter content, same pipeline
 */
export function renderUpdateText(text: string | null | undefined): string {
  return renderRichContentConcursos(text);
}

// Re-export for convenience
export { hasSignificantHtml, markdownToHtml, sanitize, wrapTablesForResponsive };
