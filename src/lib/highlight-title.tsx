import React from "react";

/**
 * Renders a title string with **bold** markdown-style markers
 * as highlighted <span> elements with the brand gradient.
 *
 * Convention: wrap individual words/phrases in `**` in page_settings.header_title
 * e.g. "Aprenda, Organize e **Evolua** com as Ferramentas Certas"
 *
 * Defensive cases:
 * - If the entire title is wrapped in `**...**` (no inner emphasis), strip the
 *   markers and render plain. Avoids the whole title rendering as a gradient
 *   block when an admin pastes the marker around the whole string.
 */
export function renderHighlightedTitle(title: string): React.ReactNode {
  if (!title) return title;
  if (!title.includes("**")) return title;

  const trimmed = title.trim();

  // Case: whole title is wrapped in ** with no inner ** — strip and render plain.
  if (
    trimmed.startsWith("**") &&
    trimmed.endsWith("**") &&
    trimmed.length >= 4 &&
    trimmed.indexOf("**", 2) === trimmed.length - 2
  ) {
    return trimmed.slice(2, -2);
  }

  // Case: paired `**...**` segments — render as gradient spans, plain text outside.
  const parts = title.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span
        key={i}
        className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
      >
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}
