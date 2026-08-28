/**
 * Splits a markdown source string into two halves at a block boundary
 * (double newline) close to the middle by word count. Used to insert
 * a CTA block between the two halves of long-form content.
 *
 * Returns ["", ""] when content is empty, or [content, ""] when there
 * is only one block.
 */
export function splitMarkdownAtMiddle(markdown: string): [string, string] {
  if (!markdown) return ["", ""];

  const blocks: string[] = [];
  let current: string[] = [];
  let insideFence = false;
  const flush = () => {
    const block = current.join("\n").trim();
    if (block) blocks.push(block);
    current = [];
  };

  for (const line of markdown.split("\n")) {
    const isFence = /^\s*(```|~~~)/.test(line);
    if (!insideFence && !line.trim()) {
      flush();
      continue;
    }
    current.push(line);
    if (isFence) insideFence = !insideFence;
  }
  flush();
  if (blocks.length < 2) return [markdown, ""];

  const totalWords = markdown.split(/\s+/).filter(Boolean).length;

  // For short content, split after the first block.
  if (totalWords < 120) {
    return [
      blocks.slice(0, 1).join("\n\n"),
      blocks.slice(1).join("\n\n"),
    ];
  }

  // For longer content, find the block whose cumulative word count first
  // reaches half of the total.
  const targetWords = totalWords / 2;
  let runningWords = 0;
  for (let i = 0; i < blocks.length; i++) {
    runningWords += blocks[i].split(/\s+/).filter(Boolean).length;
    if (runningWords >= targetWords) {
      return [
        blocks.slice(0, i + 1).join("\n\n"),
        blocks.slice(i + 1).join("\n\n"),
      ];
    }
  }

  return [markdown, ""];
}
