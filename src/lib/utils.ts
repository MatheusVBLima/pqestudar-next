// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import sanitize from "sanitize-html";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escapa caracteres HTML perigosos.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    "p", "br", "hr", "div", "span", "strong", "b", "em", "i", "u",
    "blockquote", "ul", "ol", "li", "code", "pre",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "img",
  ],
  allowedAttributes: {
    "*": ["title"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    }),
  },
  disallowedTagsMode: "discard",
};

/**
 * Sanitiza HTML usando lib `sanitize-html` (Node + Browser compatible).
 * - Remove tags bloqueadas (script, style, iframe, etc) por whitelist
 * - Remove atributos que iniciem com "on"
 * - Força target="_blank" + rel="noopener noreferrer" em links
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";
  return sanitize(dirty, SANITIZE_OPTIONS);
}

/**
 * Destaca termos de busca de forma segura.
 * - Escapa term e texto
 * - Usa <mark> no resultado
 * OBS: o retorno é HTML; renderize com dangerouslySetInnerHTML
 */
export function safeHighlight(text: string, term?: string): string {
  if (!term) return escapeHtml(text);

  // Escapa caracteres especiais do termo para RegExp
  const escapedTerm = term
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Escapa o texto base
  const safeText = escapeHtml(text);
  const regex = new RegExp(`(${escapedTerm})`, "gi");
  return safeText.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-600">$1</mark>');
}
