import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Eye, Code2, CodeXml, Heading2, Heading3, Minus, ImageIcon, Info, Link2, Bold, Italic, List, ListChecks, ListOrdered, Quote, Redo2, Undo2, Highlighter, Youtube, Upload, Loader2 } from "lucide-react";
import { marked, Renderer, Tokens } from "marked";
import TurndownService from "turndown";
import DOMPurify from "dompurify";
import { uploadGuideImage } from "@/lib/guide-assets";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

// Configure marked with custom renderer for our classes
const renderer = new Renderer();

renderer.heading = (token: Tokens.Heading) => {
  const { text, depth } = token;
  const inlineText = marked.parseInline(text) as string;
  if (depth === 1) {
    // Convert H1 to H2 automatically (H1 is the page title)
    return `<h2 class="text-xl font-bold mt-6 mb-3">${inlineText}</h2>`;
  }
  if (depth === 2) {
    return `<h2 class="text-xl font-bold mt-6 mb-3">${inlineText}</h2>`;
  }
  if (depth === 3) {
    return `<h3 class="text-lg font-bold mt-4 mb-2">${inlineText}</h3>`;
  }
  return `<h${depth} class="font-medium mt-3 mb-2">${inlineText}</h${depth}>`;
};

renderer.paragraph = (token: Tokens.Paragraph) => {
  return `<p class="mb-4">${marked.parseInline(token.text) as string}</p>`;
};

renderer.list = (token: Tokens.List) => {
  const tag = token.ordered ? "ol" : "ul";
  const hasTasks = token.items.some((item) => item.task);
  const className = token.ordered ? "list-decimal pl-6 mb-4" : hasTasks ? "mb-4 list-none space-y-2 pl-0" : "list-disc pl-6 mb-4";
  const body = token.items.map(item => renderer.listitem!(item)).join("");
  return `<${tag} class="${className}">${body}</${tag}>`;
};

renderer.listitem = (token: Tokens.ListItem) => {
  const content = marked.parseInline(token.text) as string;
  if (token.task) {
    return `<li class="mb-1 flex items-start gap-2"><input type="checkbox" ${token.checked ? "checked" : ""} /><span>${content}</span></li>`;
  }
  return `<li class="mb-1">${content}</li>`;
};

renderer.link = (token: Tokens.Link) => {
  return `<a href="${token.href}" class="underline hover:opacity-80" rel="noopener nofollow" target="_blank">${token.text}</a>`;
};

renderer.blockquote = (token: Tokens.Blockquote) => {
  return `<blockquote class="border-l-4 border-muted-foreground/30 pl-4 italic my-4">${marked.parse(token.text) as string}</blockquote>`;
};

renderer.code = (token: Tokens.Code) => {
  const escaped = token.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<pre class="bg-muted rounded-md p-4 overflow-x-auto my-4"><code class="text-sm">${escaped}</code></pre>`;
};

renderer.codespan = (token: Tokens.Codespan) => {
  return `<code class="bg-muted px-1.5 py-0.5 rounded text-sm">${token.text}</code>`;
};

renderer.hr = () => {
  return `<hr class="my-6 border-border" />`;
};

// Custom table renderer for GFM tables
renderer.table = (token: Tokens.Table) => {
  const headerCells = token.header.map((cell, i) => {
    const align = token.align[i];
    const style = align ? ` style="text-align:${align}"` : "";
    return `<th class="border border-border px-3 py-2 font-semibold text-left"${style}>${cell.text}</th>`;
  }).join("");
  
  const bodyRows = token.rows.map(row => {
    const cells = row.map((cell, i) => {
      const align = token.align[i];
      const style = align ? ` style="text-align:${align}"` : "";
      return `<td class="border border-border px-3 py-2 align-top"${style}>${cell.text}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  
  return `<div class="concursos-table-wrap overflow-x-auto -mx-1 px-1 my-4">
    <table class="concursos-table w-full border-collapse text-sm">
      <thead class="bg-muted/50"><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
};

marked.use({ renderer, gfm: true, breaks: true });

// Configure Turndown for HTML to Markdown (with table support)
const turndownService = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

turndownService.addRule("fencedCodeBlock", {
  filter: (node) => node.nodeName === "PRE",
  replacement: (_content, node) => {
    const text = (node.textContent ?? "").replace(/\n$/, "");
    const longestFence = Math.max(3, ...Array.from(text.matchAll(/`+/g), match => match[0].length + 1));
    const fence = "`".repeat(longestFence);
    return `\n\n${fence}\n${text}\n${fence}\n\n`;
  },
});

turndownService.addRule("highlight", {
  filter: "mark",
  replacement: (content, node) => {
    const className = (node as HTMLElement).getAttribute("class");
    return `<mark${className ? ` class="${className}"` : ""}>${content}</mark>`;
  },
});

turndownService.addRule("editorialVideo", {
  filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).classList.contains("pq-video-layout"),
  replacement: (_content, node) => `\n\n${(node as HTMLElement).outerHTML}\n\n`,
});

turndownService.addRule("taskListItem", {
  filter: (node) => node.nodeName === "LI" && !!(node as HTMLElement).querySelector(':scope > input[type="checkbox"]'),
  replacement: (content, node) => {
    const checkbox = (node as HTMLElement).querySelector(':scope > input[type="checkbox"]') as HTMLInputElement | null;
    return `\n- [${checkbox?.checked ? "x" : " "}] ${content.trim()}`;
  },
});

// Add table rule for Turndown (HTML → Markdown)
turndownService.addRule("table", {
  filter: "table",
  replacement: function (content, node) {
    const table = node as HTMLTableElement;
    const rows = Array.from(table.rows);
    if (rows.length === 0) return "";
    
    const headerRow = rows[0];
    const headerCells = Array.from(headerRow.cells).map(cell => cell.textContent?.trim() || "");
    const separator = headerCells.map(() => "---");
    
    const bodyRows = rows.slice(1).map(row => {
      return Array.from(row.cells).map(cell => cell.textContent?.trim() || "");
    });
    
    let md = "| " + headerCells.join(" | ") + " |\n";
    md += "| " + separator.join(" | ") + " |\n";
    bodyRows.forEach(row => {
      md += "| " + row.join(" | ") + " |\n";
    });
    
    return "\n" + md + "\n";
  }
});

// DOMPurify configuration (with table tags)
const purifyConfig = {
  ALLOWED_TAGS: [
    "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
    "ul", "ol", "li", "a", "strong", "em", "b", "i",
    "code", "pre", "blockquote", "span", "div", "mark",
    // GFM table tags
    "table", "thead", "tbody", "tr", "th", "td",
    // Images
    "img", "iframe", "input",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "style", "src", "alt", "title", "width", "height", "loading", "decoding", "allow", "allowfullscreen", "frameborder", "referrerpolicy", "type", "checked"],
  ALLOW_DATA_ATTR: false,
};

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minWords?: number;
  rows?: number;
  /** Compact mode: smaller height, hides help text and H2/H3 buttons */
  compact?: boolean;
  /** Whether to show heading shortcut buttons (default true) */
  showHeadings?: boolean;
  /** Starts in a visual, blog-style editor while keeping Markdown as storage. */
  visual?: boolean;
  showWordCount?: boolean;
  /** Code used as the Supabase folder for uploaded inline images. */
  guideInternalCode?: string;
}

const HIGHLIGHT_COLORS = [
  { label: "Amarelo", className: "bg-yellow-300/70 dark:bg-yellow-500/40" },
  { label: "Rosa", className: "bg-pink-300/70 dark:bg-pink-500/40" },
  { label: "Azul", className: "bg-sky-300/70 dark:bg-sky-500/40" },
  { label: "Verde", className: "bg-emerald-300/70 dark:bg-emerald-500/40" },
  { label: "Roxo", className: "bg-violet-300/70 dark:bg-violet-500/40" },
] as const;

type VideoLayout = "right" | "left" | "center";
type VideoFormat = "vertical" | "horizontal";

function escapeVideoText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || null;
    if (host !== "youtube.com" && host !== "m.youtube.com") return null;
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
    const match = parsed.pathname.match(/^\/(?:shorts|embed)\/([^/?#]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function buildEditorialVideoHtml(options: { id: string; url: string; title: string; text: string; layout: VideoLayout; format: VideoFormat }): string {
  const { id, url, title, text, layout, format } = options;
  const safeTitle = escapeVideoText(title.trim() || "Vídeo recomendado");
  const safeText = escapeVideoText(text.trim()).replace(/\n/g, "<br />");
  const copy = `<div class="pq-video-copy min-w-0"><h3 class="mb-3 text-lg font-bold">${safeTitle}</h3>${safeText ? `<p class="mb-4">${safeText}</p>` : ""}<a class="inline-flex font-semibold text-primary underline underline-offset-4" href="${escapeVideoText(url)}" target="_blank" rel="noopener nofollow">Assistir no YouTube</a></div>`;
  const aspect = format === "vertical" ? "aspect-[9/16] max-w-[20rem]" : "aspect-video max-w-[42rem]";
  const video = `<div class="pq-video-player ${aspect} w-full overflow-hidden rounded-2xl border bg-black shadow-sm"><iframe class="h-full w-full" src="https://www.youtube-nocookie.com/embed/${escapeVideoText(id)}" title="${safeTitle}" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  if (layout === "center") return `<div class="pq-video-layout my-6 flex flex-col items-center gap-5 rounded-2xl border bg-muted/20 p-5 text-center">${copy}${video}</div>`;
  const ordered = layout === "left" ? `${video}${copy}` : `${copy}${video}`;
  return `<div class="pq-video-layout my-6 grid items-center gap-6 rounded-2xl border bg-muted/20 p-5 md:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)]">${ordered}</div>`;
}

// Count words from markdown (strip syntax)
function countMarkdownWords(markdown: string): number {
  if (!markdown) return 0;
  
  // Remove markdown syntax for accurate word count
  const plainText = markdown
    // Remove headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Remove horizontal rules
    .replace(/^-{3,}$/gm, "")
    // Clean whitespace
    .replace(/\s+/g, " ")
    .trim();
  
  if (!plainText) return 0;
  return plainText.split(/\s+/).length;
}

// Generate HTML from markdown
function markdownToHtml(markdown: string): string {
  if (!markdown) return "";
  const rawHtml = marked.parse(markdown) as string;
  return DOMPurify.sanitize(rawHtml, purifyConfig);
}

// Detect if text contains HTML tags
function containsHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

// Convert H1 to H2 in markdown (H1 is reserved for page title)
function normalizeHeadings(markdown: string): string {
  return markdown.replace(/^# +(.+)$/gm, "## $1");
}

// Convert HTML to Markdown
function htmlToMarkdown(html: string): string {
  return normalizeHeadings(turndownService.turndown(html));
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minWords = 0,
  rows = 16,
  compact = false,
  showHeadings = true,
  visual = false,
  showWordCount = true,
  guideInternalCode,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<string>(visual ? "visual" : "edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const visualHasFocusRef = useRef(false);
  const latestValueRef = useRef(value);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashSelection, setSlashSelection] = useState(0);
  const slashItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const savedVisualRangeRef = useRef<Range | null>(null);
  const toolbarRangeRef = useRef<Range | null>(null);
  const [highlightPaletteOpen, setHighlightPaletteOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoText, setVideoText] = useState("");
  const [videoLayout, setVideoLayout] = useState<VideoLayout>("right");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("vertical");
  const videoMarkdownSelectionRef = useRef({ start: 0, end: 0 });
  const imageMarkdownSelectionRef = useRef({ start: 0, end: 0 });
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  latestValueRef.current = value;
  
  const wordCount = countMarkdownWords(value);
  const isUnderMin = minWords > 0 && wordCount < minWords;
  const parsedVideoId = youtubeVideoId(videoUrl);

  const rememberVisualSelection = useCallback(() => {
    const editor = visualEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      toolbarRangeRef.current = range.cloneRange();
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'visual') return;
    document.addEventListener('selectionchange', rememberVisualSelection);
    return () => document.removeEventListener('selectionchange', rememberVisualSelection);
  }, [activeTab, rememberVisualSelection]);

  const restoreVisualSelection = useCallback(() => {
    const editor = visualEditorRef.current;
    const range = toolbarRangeRef.current;
    if (!editor) return;
    editor.focus({ preventScroll: true });
    if (range && editor.contains(range.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "visual" || !visualEditorRef.current || visualHasFocusRef.current) return;
    const html = markdownToHtml(value);
    if (visualEditorRef.current.innerHTML !== html) visualEditorRef.current.innerHTML = html;
  }, [activeTab, value]);

  const mountVisualEditor = useCallback((editor: HTMLDivElement | null) => {
    visualEditorRef.current = editor;
    toolbarRangeRef.current = null;
    if (!editor) return;
    editor.innerHTML = markdownToHtml(latestValueRef.current);
  }, []);

  const changeTab = useCallback((tab: string) => {
    if (activeTab === "visual" && tab !== "visual" && visualEditorRef.current) {
      onChange(htmlToMarkdown(visualEditorRef.current.innerHTML));
    }
    visualHasFocusRef.current = false;
    setSlashQuery(null);
    setHighlightPaletteOpen(false);
    setActiveTab(tab);
  }, [activeTab, onChange]);

  const emitVisualChange = useCallback(() => {
    if (!visualEditorRef.current) return;
    onChange(htmlToMarkdown(visualEditorRef.current.innerHTML));
  }, [onChange]);

  const runVisualCommand = useCallback((command: string, argument?: string) => {
    restoreVisualSelection();
    document.execCommand(command, false, argument);
    rememberVisualSelection();
    emitVisualChange();
  }, [emitVisualChange, rememberVisualSelection, restoreVisualSelection]);

  const insertVisualLink = useCallback(() => {
    const url = window.prompt("Cole a URL do link:", "/");
    if (url) runVisualCommand("createLink", url);
  }, [runVisualCommand]);

  const openImageDialog = useCallback(() => {
    if (activeTab === "visual") {
      const selection = window.getSelection();
      if (selection?.rangeCount && visualEditorRef.current?.contains(selection.anchorNode)) {
        savedVisualRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
    } else if (textareaRef.current) {
      imageMarkdownSelectionRef.current = { start: textareaRef.current.selectionStart, end: textareaRef.current.selectionEnd };
    }
    setImageUrl("");
    setImageAlt("");
    setImageFile(null);
    setImageMode("url");
    setImageDialogOpen(true);
  }, [activeTab]);

  const insertResolvedImage = useCallback((url: string) => {
    if (!url) return;
    const image = document.createElement("img");
    image.src = url;
    image.alt = imageAlt.trim();
    image.loading = "lazy";
    image.decoding = "async";
    image.style.maxWidth = "100%";
    if (activeTab === "visual") {
      const selection = window.getSelection();
      if (selection && savedVisualRangeRef.current) {
        selection.removeAllRanges();
        selection.addRange(savedVisualRangeRef.current);
      }
      runVisualCommand("insertHTML", `${image.outerHTML}<p><br></p>`);
    } else {
      const { start, end } = imageMarkdownSelectionRef.current;
      onChange(value.substring(0, start) + `\n\n${image.outerHTML}\n\n` + value.substring(end));
    }
    savedVisualRangeRef.current = null;
    setImageDialogOpen(false);
  }, [activeTab, imageAlt, onChange, runVisualCommand, value]);

  const uploadInlineImage = useCallback(async () => {
    if (!guideInternalCode || !imageFile) return;
    setImageUploading(true);
    try {
      const uploaded = await uploadGuideImage(imageFile, guideInternalCode, "content");
      setImageUrl(uploaded.publicUrl);
      insertResolvedImage(uploaded.publicUrl);
      toast({ title: "Imagem enviada", description: `Salva na pasta ${guideInternalCode}.` });
    } catch (error) {
      toast({ title: "Erro no upload", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setImageUploading(false);
      if (imageFileRef.current) imageFileRef.current.value = "";
    }
  }, [guideInternalCode, imageFile, insertResolvedImage]);

  const openVideoDialog = useCallback(() => {
    if (activeTab === "visual") {
      const selection = window.getSelection();
      if (selection?.rangeCount && visualEditorRef.current?.contains(selection.anchorNode)) {
        savedVisualRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
    } else if (textareaRef.current) {
      videoMarkdownSelectionRef.current = { start: textareaRef.current.selectionStart, end: textareaRef.current.selectionEnd };
    }
    setVideoDialogOpen(true);
  }, [activeTab]);

  const handleVideoUrlChange = useCallback((url: string) => {
    setVideoUrl(url);
    if (/youtube\.com\/shorts\//i.test(url)) setVideoFormat("vertical");
  }, []);

  const insertEditorialVideo = useCallback(() => {
    const id = youtubeVideoId(videoUrl);
    if (!id) return;
    const html = buildEditorialVideoHtml({ id, url: videoUrl, title: videoTitle, text: videoText, layout: videoLayout, format: videoFormat });
    if (activeTab === "visual") {
      const selection = window.getSelection();
      if (selection && savedVisualRangeRef.current) {
        selection.removeAllRanges();
        selection.addRange(savedVisualRangeRef.current);
      }
      runVisualCommand("insertHTML", `${html}<p><br></p>`);
      savedVisualRangeRef.current = null;
    } else {
      const { start, end } = videoMarkdownSelectionRef.current;
      const insertion = `\n\n${html}\n\n`;
      onChange(value.substring(0, start) + insertion + value.substring(end));
    }
    setVideoDialogOpen(false);
    setVideoUrl("");
    setVideoTitle("");
    setVideoText("");
  }, [activeTab, onChange, runVisualCommand, value, videoFormat, videoLayout, videoText, videoTitle, videoUrl]);

  // Handle paste - convert HTML to Markdown if needed
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain");
    
    if (containsHtml(pastedText)) {
      e.preventDefault();
      
      // Convert HTML to Markdown
      const markdown = htmlToMarkdown(pastedText);
      
      // Insert at cursor position
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + markdown + value.substring(end);
        onChange(newValue);
        
        // Move cursor after pasted content
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
          textarea.focus();
        }, 0);
      } else {
        onChange(value + markdown);
      }
    }
  }, [value, onChange]);

  // Handle input - normalize H1 to H2
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    // Auto-convert "# " at beginning of line to "## " (H1 → H2)
    newValue = normalizeHeadings(newValue);
    
    onChange(newValue);
  }, [onChange]);

  // Insert heading at cursor
  const insertHeading = useCallback((level: 2 | 3) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prefix = level === 2 ? "## **" : "### **";
    const suffix = "**";
    
    const beforeCursor = value.substring(0, start);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const currentLineStart = value.substring(lineStart, start);
    const needsNewline = currentLineStart.trim().length > 0 && start > 0;
    
    const insertion = (needsNewline ? "\n" : "") + prefix + suffix;
    const newValue = value.substring(0, start) + insertion + value.substring(end);
    
    onChange(newValue);
    
    // Place cursor between the ** **
    const cursorPos = start + (needsNewline ? 1 : 0) + prefix.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = cursorPos;
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const insertBold = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    if (selected.length > 0) {
      const insertion = `**${selected}**`;
      const newValue = value.substring(0, start) + insertion + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + insertion.length;
        textarea.focus();
      }, 0);
    } else {
      const insertion = `****`;
      const newValue = value.substring(0, start) + insertion + value.substring(end);
      onChange(newValue);
      const cursorPos = start + 2;
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos;
        textarea.focus();
      }, 0);
    }
  }, [value, onChange]);

  const insertHr = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeCursor = value.substring(0, start);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const currentLineStart = value.substring(lineStart, start);
    const needsNewline = currentLineStart.trim().length > 0 && start > 0;
    const insertion = (needsNewline ? "\n" : "") + "---\n";
    const newValue = value.substring(0, start) + insertion + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const insertInternalLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const anchor = selected.trim().length > 0 ? selected : "texto";
    const before = `[${anchor}](/`;
    const after = `)`;
    const insertion = before + after;
    const newValue = value.substring(0, start) + insertion + value.substring(end);
    onChange(newValue);
    const cursorPos = start + before.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = cursorPos;
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const _insertImage = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeCursor = value.substring(0, start);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const currentLineStart = value.substring(lineStart, start);
    const needsNewline = currentLineStart.trim().length > 0 && start > 0;
    const tag = '<img src="URL" alt="descrição" width="100%" />';
    const insertion = (needsNewline ? "\n" : "") + tag;
    const newValue = value.substring(0, start) + insertion + value.substring(end);
    onChange(newValue);
    // Place cursor selecting "URL" for immediate replacement
    const urlStart = start + (needsNewline ? 1 : 0) + 10; // length of '<img src="'
    const urlEnd = urlStart + 3; // length of 'URL'
    setTimeout(() => {
      textarea.selectionStart = urlStart;
      textarea.selectionEnd = urlEnd;
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const insertQuote = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const quoted = (selected || "texto")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const newValue = value.substring(0, start) + quoted + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      const contentStart = start + 2;
      textarea.selectionStart = selected ? start : contentStart;
      textarea.selectionEnd = selected ? start + quoted.length : contentStart + 5;
      textarea.focus();
    }, 0);
  }, [onChange, value]);

  const insertChecklist = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const checklist = (selected || "item")
      .split("\n")
      .map((line) => `- [ ] ${line.replace(/^\s*(?:[-*+]\s+)?(?:\[[ xX]\]\s*)?/, "")}`)
      .join("\n");
    onChange(value.substring(0, start) + checklist + value.substring(end));
    setTimeout(() => {
      const contentStart = start + 6;
      textarea.selectionStart = selected ? start : contentStart;
      textarea.selectionEnd = selected ? start + checklist.length : contentStart + 4;
      textarea.focus();
    }, 0);
  }, [onChange, value]);

  const insertVisualChecklist = useCallback(() => {
    const editor = visualEditorRef.current;
    const selection = window.getSelection();
    const selected = editor && selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
      ? selection.toString().trim()
      : "";
    const items = (selected || "item").split("\n").filter(Boolean);
    const list = document.createElement("ul");
    list.className = "mb-4 list-none space-y-2 pl-0";
    items.forEach((text) => {
      const item = document.createElement("li");
      item.className = "mb-1 flex items-start gap-2";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.setAttribute("contenteditable", "false");
      const label = document.createElement("span");
      label.textContent = text.replace(/^\s*(?:[-*+]\s+)?(?:\[[ xX]\]\s*)?/, "");
      item.append(checkbox, label);
      list.appendChild(item);
    });
    runVisualCommand("insertHTML", `${list.outerHTML}<p><br></p>`);
  }, [runVisualCommand]);

  const insertHighlight = useCallback((colorClass: string = HIGHLIGHT_COLORS[0].className) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || "texto destacado";
    const insertion = `<mark class="${colorClass}">${selected}</mark>`;
    onChange(value.substring(0, start) + insertion + value.substring(end));
    setTimeout(() => {
      textarea.selectionStart = start + 6;
      textarea.selectionEnd = start + 6 + selected.length;
      textarea.focus();
    }, 0);
  }, [onChange, value]);

  const insertVisualHighlight = useCallback((colorClass: string = HIGHLIGHT_COLORS[0].className) => {
    const editor = visualEditorRef.current;
    const selection = window.getSelection();
    if (selection && savedVisualRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedVisualRangeRef.current);
    }
    const selectedText = editor && selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
      ? selection.toString()
      : "";
    const mark = document.createElement("mark");
    mark.className = colorClass;
    mark.textContent = selectedText || "texto destacado";
    runVisualCommand("insertHTML", mark.outerHTML);
    savedVisualRangeRef.current = null;
  }, [runVisualCommand]);

  const insertCodeBlock = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || "Cole seu prompt ou código aqui";
    const insertion = `\n\`\`\`\n${selected}\n\`\`\`\n`;
    onChange(value.substring(0, start) + insertion + value.substring(end));
    setTimeout(() => {
      textarea.selectionStart = start + 5;
      textarea.selectionEnd = start + 5 + selected.length;
      textarea.focus();
    }, 0);
  }, [onChange, value]);

  const insertVisualCodeBlock = useCallback(() => {
    const editor = visualEditorRef.current;
    const selection = window.getSelection();
    const selectedText = editor && selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
      ? selection.toString().trim()
      : "";
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = selectedText || "Cole seu prompt ou código aqui";
    pre.appendChild(code);
    runVisualCommand("insertHTML", selectedText ? pre.outerHTML : `${pre.outerHTML}<p><br></p>`);
  }, [runVisualCommand]);

  const slashCommands = [
    { id: "text", label: "Texto", hint: "Parágrafo comum", icon: Code2, run: () => runVisualCommand("formatBlock", "p") },
    { id: "title", label: "Título", hint: "Seção principal (H2)", icon: Heading2, run: () => runVisualCommand("formatBlock", "h2") },
    { id: "subtitle", label: "Subtítulo", hint: "Subseção (H3)", icon: Heading3, run: () => runVisualCommand("formatBlock", "h3") },
    { id: "list", label: "Lista", hint: "Lista com marcadores", icon: List, run: () => runVisualCommand("insertUnorderedList") },
    { id: "ordered", label: "Lista numerada", hint: "Passos em ordem", icon: ListOrdered, run: () => runVisualCommand("insertOrderedList") },
    { id: "checklist", label: "Checklist", hint: "Lista com caixas para etapas e requisitos", icon: ListChecks, run: insertVisualChecklist },
    { id: "quote", label: "Citação", hint: "Destacar uma informação", icon: Quote, run: () => runVisualCommand("formatBlock", "blockquote") },
    { id: "highlight", label: "Marca-texto", hint: "Realçar uma palavra ou trecho", icon: Highlighter, run: insertVisualHighlight },
    { id: "code", label: "Bloco copiável", hint: "Prompt ou código com botão Copiar", icon: CodeXml, run: insertVisualCodeBlock },
    { id: "video", label: "Vídeo", hint: "YouTube ou Shorts com texto lateral", icon: Youtube, run: openVideoDialog },
    { id: "divider", label: "Divisor", hint: "Separar seções", icon: Minus, run: () => runVisualCommand("insertHorizontalRule") },
  ];
  const normalizedSlashQuery = (slashQuery || "").toLocaleLowerCase("pt-BR");
  const filteredSlashCommands = slashCommands.filter((command) =>
    `${command.label} ${command.hint} ${command.id}`.toLocaleLowerCase("pt-BR").includes(normalizedSlashQuery),
  );

  useEffect(() => {
    if (slashQuery === null) return;
    slashItemRefs.current[slashSelection]?.scrollIntoView({ block: "nearest" });
  }, [slashQuery, slashSelection]);

  const clearSlashBlock = () => {
    const editor = visualEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.anchorNode) return;
    let block = selection.anchorNode.nodeType === Node.TEXT_NODE
      ? selection.anchorNode.parentElement
      : selection.anchorNode as HTMLElement;
    while (block?.parentElement && block.parentElement !== editor) block = block.parentElement;
    if (!block || block === editor) return;
    const range = document.createRange();
    range.selectNodeContents(block);
    range.deleteContents();
    range.setStart(block, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const applySlashCommand = (command: (typeof slashCommands)[number]) => {
    clearSlashBlock();
    setSlashQuery(null);
    setSlashSelection(0);
    command.run();
  };

  const handleVisualInput = () => {
    emitVisualChange();
    const editor = visualEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) return;
    let block = selection.anchorNode.nodeType === Node.TEXT_NODE
      ? selection.anchorNode.parentElement
      : selection.anchorNode as HTMLElement;
    while (block?.parentElement && block.parentElement !== editor) block = block.parentElement;
    const match = (block?.textContent || "").match(/^\/([^\s\n]*)$/);
    const candidate = match?.[1]?.toLocaleLowerCase("pt-BR") ?? null;
    const isKnownCommand = candidate !== null && (
      candidate === "" || slashCommands.some((command) =>
        `${command.label} ${command.hint} ${command.id}`
          .toLocaleLowerCase("pt-BR")
          .includes(candidate)
      )
    );
    setSlashQuery(isKnownCommand ? candidate : null);
    setSlashSelection(0);
  };

  const handleVisualKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (slashQuery !== null) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSlashQuery(null);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSlashSelection((current) => filteredSlashCommands.length
          ? (current + direction + filteredSlashCommands.length) % filteredSlashCommands.length
          : 0);
        return;
      }
      if (event.key === "Enter" && filteredSlashCommands[slashSelection]) {
        event.preventDefault();
        applySlashCommand(filteredSlashCommands[slashSelection]);
        return;
      }
    }
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "a") {
      const editor = visualEditorRef.current;
      const selection = window.getSelection();
      const anchorElement = selection?.anchorNode?.nodeType === Node.TEXT_NODE
        ? selection.anchorNode.parentElement
        : selection?.anchorNode as HTMLElement | null;
      const codeBlock = anchorElement?.closest("pre");
      if (editor && codeBlock && editor.contains(codeBlock)) {
        event.preventDefault();
        const range = document.createRange();
        range.selectNodeContents(codeBlock.querySelector("code") ?? codeBlock);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    } else if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      runVisualCommand("undo");
    } else if (key === "y" || (key === "z" && event.shiftKey)) {
      event.preventDefault();
      runVisualCommand("redo");
    }
  };

  return (
    <div
      className={compact ? "space-y-1.5" : "space-y-2"}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div
          className="flex min-w-0 flex-wrap items-center gap-1"
          onPointerDownCapture={(event) => {
            if (activeTab !== 'visual' || !(event.target instanceof Element) || !event.target.closest('button')) return;
            rememberVisualSelection();
            event.preventDefault();
          }}
          onClickCapture={() => {
            if (activeTab === 'visual') restoreVisualSelection();
          }}
        >
          {showHeadings && !compact && activeTab !== "preview" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => activeTab === "visual" ? runVisualCommand("formatBlock", "h2") : insertHeading(2)}
                title="Inserir título H2 em negrito"
              >
                <Heading2 className="h-4 w-4" />
                <span className="sr-only">H2</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => activeTab === "visual" ? runVisualCommand("formatBlock", "h3") : insertHeading(3)}
                title="Inserir subtítulo H3 em negrito"
              >
                <Heading3 className="h-4 w-4" />
                <span className="sr-only">H3</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => activeTab === "visual" ? runVisualCommand("bold") : insertBold()}
                title="Negrito (selecione um texto ou clique para inserir)"
              >
                <Bold className="h-4 w-4" />
                <span className="sr-only">Negrito</span>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={openVideoDialog} title="Inserir vídeo do YouTube">
                <Youtube className="h-4 w-4" />
                <span className="sr-only">Vídeo do YouTube</span>
              </Button>
              {activeTab === "visual" && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => runVisualCommand("italic")} title="Itálico"><Italic className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => runVisualCommand("insertUnorderedList")} title="Lista"><List className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => runVisualCommand("insertOrderedList")} title="Lista numerada"><ListOrdered className="h-4 w-4" /></Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => activeTab === "visual" ? insertVisualChecklist() : insertChecklist()}
                title="Inserir checklist"
              >
                <ListChecks className="h-4 w-4" />
                <span className="sr-only">Checklist</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => activeTab === "visual" ? runVisualCommand("formatBlock", "blockquote") : insertQuote()}
                title="Inserir citação"
              >
                <Quote className="h-4 w-4" />
                <span className="sr-only">Citação</span>
              </Button>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    const selection = window.getSelection();
                    if (activeTab === "visual" && selection?.rangeCount) {
                      savedVisualRangeRef.current = selection.getRangeAt(0).cloneRange();
                    }
                  }}
                  onClick={() => setHighlightPaletteOpen((open) => !open)}
                  title="Escolher cor do marca-texto"
                  aria-expanded={highlightPaletteOpen}
                >
                  <Highlighter className="h-4 w-4" />
                  <span className="sr-only">Marca-texto</span>
                </Button>
                {highlightPaletteOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 grid w-[6.5rem] grid-cols-[repeat(3,1.5rem)] justify-center gap-2 rounded-xl border bg-popover p-2 shadow-xl">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.label}
                        type="button"
                        title={color.label}
                        aria-label={`Marcar em ${color.label.toLocaleLowerCase("pt-BR")}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          if (activeTab === "visual") insertVisualHighlight(color.className);
                          else insertHighlight(color.className);
                          setHighlightPaletteOpen(false);
                        }}
                        className={`block h-6 min-h-6 w-6 min-w-6 shrink-0 rounded-full border border-foreground/15 p-0 transition-transform hover:scale-110 ${color.className}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => activeTab === "visual" ? runVisualCommand("insertHorizontalRule") : insertHr()}
                title="Inserir linha horizontal"
              >
                <Minus className="h-4 w-4" />
                <span className="sr-only">HR</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openImageDialog}
                title="Inserir imagem inline"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="sr-only">Imagem</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => activeTab === "visual" ? insertVisualLink() : insertInternalLink()}
                title="Inserir link interno (selecione um texto antes)"
              >
                <Link2 className="h-4 w-4" />
                <span className="sr-only">Link interno</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => activeTab === "visual" ? insertVisualCodeBlock() : insertCodeBlock()}
                title="Inserir bloco copiável"
              >
                <CodeXml className="h-4 w-4" />
                <span className="sr-only">Bloco de código</span>
              </Button>
              {activeTab === "visual" && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => runVisualCommand("undo")} title="Desfazer (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => runVisualCommand("redo")} title="Refazer (Ctrl+Y)"><Redo2 className="h-4 w-4" /></Button>
                </>
              )}
            </>
          )}
        </div>
        
        {showWordCount && (
          <Badge variant={isUnderMin ? "destructive" : "secondary"} className="text-xs font-normal">
            {wordCount} palavras {minWords > 0 && `(mín. ${minWords})`}
          </Badge>
        )}
      </div>

      {/* Editor/Preview Tabs */}
      <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
        <TabsList className={`w-full grid ${visual ? "grid-cols-3" : "grid-cols-2"}`}>
          {visual && (
            <TabsTrigger value="visual" className="gap-1.5">
              <Bold className="h-3.5 w-3.5" />
              Visual
            </TabsTrigger>
          )}
          <TabsTrigger value="edit" className="gap-1.5">
            <Code2 className="h-3.5 w-3.5" />
            Markdown
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Pré-visualizar
          </TabsTrigger>
        </TabsList>

        {visual && (
          <TabsContent value="visual" className="relative mt-2">
            {slashQuery !== null && (
              <div className="absolute left-3 top-3 z-30 w-[min(340px,calc(100%-1.5rem))] overflow-hidden rounded-xl border border-primary/25 bg-popover p-1.5 text-popover-foreground shadow-2xl">
                <div className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Comandos {slashQuery && `· /${slashQuery}`}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {filteredSlashCommands.length ? filteredSlashCommands.map((command, index) => {
                    const Icon = command.icon;
                    return (
                      <button
                        key={command.id}
                        ref={(element) => { slashItemRefs.current[index] = element; }}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applySlashCommand(command);
                        }}
                        onMouseEnter={() => setSlashSelection(index)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${index === slashSelection ? "bg-primary/15 text-foreground" : "hover:bg-muted"}`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background"><Icon className="h-4 w-4" /></span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{command.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>
                        </span>
                      </button>
                    );
                  }) : (
                    <p className="px-3 py-5 text-center text-sm text-muted-foreground">Nenhum comando encontrado.</p>
                  )}
                </div>
              </div>
            )}
            <div
              ref={mountVisualEditor}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              data-placeholder={placeholder || "Comece a escrever seu guia..."}
              onFocus={() => { visualHasFocusRef.current = true; }}
              onBlur={() => { visualHasFocusRef.current = false; setSlashQuery(null); emitVisualChange(); }}
              onInput={handleVisualInput}
              onClick={(event) => { if ((event.target as HTMLElement).matches('input[type="checkbox"]')) emitVisualChange(); }}
              onKeyDown={handleVisualKeyDown}
              className={`${compact ? "min-h-[120px]" : "min-h-[360px]"} max-h-[620px] overflow-y-auto rounded-xl border border-border bg-background px-5 py-4 text-sm leading-7 outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15 empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-bold [&_hr]:my-6 [&_input[type=checkbox]]:mt-1.5 [&_input[type=checkbox]]:h-4 [&_input[type=checkbox]]:w-4 [&_input[type=checkbox]]:accent-primary [&_li]:my-1 [&_mark]:rounded [&_mark]:px-1 [&_mark]:text-foreground [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-4 [&_pre]:whitespace-pre-wrap [&_pre]:rounded-xl [&_pre]:border [&_pre]:bg-muted [&_pre]:p-4 [&_table]:my-4 [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6`}
            />
          </TabsContent>
        )}
        
        <TabsContent value="edit" className="mt-2">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onPaste={handlePaste}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={placeholder}
            rows={rows}
            className="font-mono text-sm"
          />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-2">
          <div 
            className={`${compact ? "min-h-[120px] max-h-[200px]" : "min-h-[300px] max-h-[500px]"} overflow-y-auto p-4 border rounded-md bg-card prose prose-neutral dark:prose-invert max-w-none`}
          >
            {value ? (
              <MarkdownContent>{value}</MarkdownContent>
            ) : (
              <p className="text-muted-foreground italic">
                Nenhum conteúdo para visualizar. Digite algo no editor.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Help text - hidden in compact mode */}
      {!compact && activeTab === "edit" && (
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0 text-primary/60" />
          <span>
            <strong>Markdown (GFM):</strong>{" "}
            <code className="bg-muted px-1 rounded">**negrito**</code>,{" "}
            <code className="bg-muted px-1 rounded">*itálico*</code>,{" "}
            <code className="bg-muted px-1 rounded">##</code> (H2),{" "}
            <code className="bg-muted px-1 rounded">###</code> (H3),{" "}
            <code className="bg-muted px-1 rounded">-</code> (lista),{" "}
            <code className="bg-muted px-1 rounded">[texto](url)</code>,{" "}
            <code className="bg-muted px-1 rounded">---</code> (linha).{" "}
            <strong>Tabelas:</strong> <code className="bg-muted px-1 rounded">| col1 | col2 |</code> com linha separadora <code className="bg-muted px-1 rounded">|---|---|</code>.
          </span>
        </p>
      )}

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Inserir imagem</DialogTitle>
            <DialogDescription>Use uma imagem da internet ou envie um arquivo para o guia.</DialogDescription>
          </DialogHeader>
          <Tabs value={imageMode} onValueChange={(mode) => setImageMode(mode as "url" | "upload")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url"><Link2 className="mr-2 h-4 w-4" /> URL</TabsTrigger>
              <TabsTrigger value="upload" disabled={!guideInternalCode}><Upload className="mr-2 h-4 w-4" /> Upload</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="space-y-2 pt-3">
              <Label htmlFor="editor-image-url">URL da imagem</Label>
              <Input id="editor-image-url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://exemplo.com/imagem.png" autoFocus />
            </TabsContent>
            <TabsContent value="upload" className="space-y-2 pt-3">
              <Label htmlFor="editor-image-file">Arquivo da imagem</Label>
              <Input ref={imageFileRef} id="editor-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={imageUploading} onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">A imagem será renomeada automaticamente pela ordem de envio.</p>
            </TabsContent>
          </Tabs>
          <div className="space-y-2">
            <Label htmlFor="editor-image-alt">Descrição da imagem (acessibilidade)</Label>
            <Input id="editor-image-alt" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Descreva o que aparece na imagem" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImageDialogOpen(false)}>Cancelar</Button>
            {imageMode === "url" && <Button type="button" onClick={() => insertResolvedImage(imageUrl.trim())} disabled={!imageUrl.trim()}>Inserir imagem</Button>}
            {imageMode === "upload" && !imageUploading && <Button type="button" onClick={() => void uploadInlineImage()} disabled={!imageFile}><Upload className="mr-2 h-4 w-4" /> Enviar e inserir</Button>}
            {imageMode === "upload" && imageUploading && <Button type="button" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Youtube className="h-5 w-5 text-primary" /> Inserir vídeo editorial</DialogTitle>
            <DialogDescription>Combine um vídeo normal ou Short do YouTube com um contexto para o leitor.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editor-video-url">URL do YouTube ou Short</Label>
                <Input id="editor-video-url" value={videoUrl} onChange={(event) => handleVideoUrlChange(event.target.value)} placeholder="https://youtube.com/shorts/..." className="rounded-xl" />
                {videoUrl && !parsedVideoId && <p className="text-xs text-destructive">Informe uma URL válida do YouTube.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editor-video-title">Título do bloco</Label>
                <Input id="editor-video-title" value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} placeholder="Veja como fazer na prática" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editor-video-text">Texto lateral (opcional)</Label>
                <Textarea id="editor-video-text" value={videoText} onChange={(event) => setVideoText(event.target.value)} placeholder="Explique por que este vídeo complementa o conteúdo..." rows={4} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["vertical", "horizontal"] as VideoFormat[]).map((format) => (
                    <Button key={format} type="button" variant={videoFormat === format ? "default" : "outline"} onClick={() => setVideoFormat(format)} className="rounded-xl">
                      {format === "vertical" ? "Vertical · 9:16" : "Horizontal · 16:9"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Posição no desktop</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["left", "center", "right"] as VideoLayout[]).map((layout) => (
                    <Button key={layout} type="button" variant={videoLayout === layout ? "default" : "outline"} onClick={() => setVideoLayout(layout)} className="rounded-xl px-2">
                      {layout === "left" ? "Esquerda" : layout === "right" ? "Direita" : "Centro"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/25 p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prévia do vídeo</p>
              <div className={`mx-auto w-full overflow-hidden rounded-xl bg-black ${videoFormat === "vertical" ? "aspect-[9/16] max-w-[220px]" : "aspect-video"}`}>
                {parsedVideoId ? (
                  <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${parsedVideoId}`} title="Prévia do vídeo" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                ) : (
                  <div className="flex h-full items-center justify-center p-5 text-center text-xs text-white/60">Cole a URL para visualizar</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVideoDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button type="button" onClick={insertEditorialVideo} disabled={!parsedVideoId} className="rounded-xl"><Youtube className="mr-2 h-4 w-4" /> Inserir vídeo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export utilities for use elsewhere
export { countMarkdownWords, markdownToHtml, htmlToMarkdown };
