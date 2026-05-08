import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Edit3, Heading2, Heading3, Minus, ImageIcon, Info, Link2, Bold } from "lucide-react";
import { marked, Renderer, Tokens } from "marked";
import TurndownService from "turndown";
import DOMPurify from "dompurify";

// Configure marked with custom renderer for our classes
const renderer = new Renderer();

renderer.heading = (token: Tokens.Heading) => {
  const { text, depth } = token;
  if (depth === 1) {
    // Convert H1 to H2 automatically (H1 is the page title)
    return `<h2 class="text-xl font-semibold mt-6 mb-3">${text}</h2>`;
  }
  if (depth === 2) {
    return `<h2 class="text-xl font-semibold mt-6 mb-3">${text}</h2>`;
  }
  if (depth === 3) {
    return `<h3 class="text-lg font-medium mt-4 mb-2">${text}</h3>`;
  }
  return `<h${depth} class="font-medium mt-3 mb-2">${text}</h${depth}>`;
};

renderer.paragraph = (token: Tokens.Paragraph) => {
  return `<p class="mb-4">${token.text}</p>`;
};

renderer.list = (token: Tokens.List) => {
  const tag = token.ordered ? "ol" : "ul";
  const className = token.ordered ? "list-decimal pl-6 mb-4" : "list-disc pl-6 mb-4";
  const body = token.items.map(item => renderer.listitem!(item)).join("");
  return `<${tag} class="${className}">${body}</${tag}>`;
};

renderer.listitem = (token: Tokens.ListItem) => {
  return `<li class="mb-1">${token.text}</li>`;
};

renderer.link = (token: Tokens.Link) => {
  return `<a href="${token.href}" class="underline hover:opacity-80" rel="noopener nofollow" target="_blank">${token.text}</a>`;
};

renderer.blockquote = (token: Tokens.Blockquote) => {
  return `<blockquote class="border-l-4 border-muted-foreground/30 pl-4 italic my-4">${token.text}</blockquote>`;
};

renderer.code = (token: Tokens.Code) => {
  return `<pre class="bg-muted rounded-md p-4 overflow-x-auto my-4"><code class="text-sm">${token.text}</code></pre>`;
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
    "code", "pre", "blockquote", "span", "div",
    // GFM table tags
    "table", "thead", "tbody", "tr", "th", "td",
    // Images
    "img",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "style", "src", "alt", "title", "width", "height", "loading", "decoding"],
  ALLOW_DATA_ATTR: false,
};

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minWords?: number;
  rows?: number;
  isRequired?: boolean;
  /** Compact mode: smaller height, hides help text and H2/H3 buttons */
  compact?: boolean;
  /** Whether to show heading shortcut buttons (default true) */
  showHeadings?: boolean;
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
  isRequired = false,
  compact = false,
  showHeadings = true,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<string>("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  
  const wordCount = countMarkdownWords(value);
  const isUnderMin = minWords > 0 && wordCount < minWords;

  // Render markdown to HTML
  useEffect(() => {
    if (activeTab === "preview" && value) {
      setRenderedHtml(markdownToHtml(value));
    }
  }, [activeTab, value]);

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

  const insertImage = useCallback(() => {
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

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {showHeadings && !compact && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertHeading(2)}
                title="Inserir título H2 em negrito"
              >
                <Heading2 className="h-4 w-4" />
                <span className="sr-only">H2</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertHeading(3)}
                title="Inserir subtítulo H3 em negrito"
              >
                <Heading3 className="h-4 w-4" />
                <span className="sr-only">H3</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={insertBold}
                title="Negrito (selecione um texto ou clique para inserir)"
              >
                <Bold className="h-4 w-4" />
                <span className="sr-only">Negrito</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={insertHr}
                title="Inserir linha horizontal"
              >
                <Minus className="h-4 w-4" />
                <span className="sr-only">HR</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={insertImage}
                title="Inserir imagem inline"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="sr-only">Imagem</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={insertInternalLink}
                title="Inserir link interno (selecione um texto antes)"
              >
                <Link2 className="h-4 w-4" />
                <span className="sr-only">Link interno</span>
              </Button>
            </>
          )}
        </div>
        
        <Badge variant={isUnderMin ? "destructive" : "secondary"} className="text-xs font-normal">
          {wordCount} palavras {minWords > 0 && `(mín. ${minWords})`}
        </Badge>
      </div>

      {/* Editor/Preview Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="edit" className="gap-1.5">
            <Edit3 className="h-3.5 w-3.5" />
            Editar
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Pré-visualizar
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="mt-2">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onPaste={handlePaste}
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
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            ) : (
              <p className="text-muted-foreground italic">
                Nenhum conteúdo para visualizar. Digite algo no editor.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Help text - hidden in compact mode */}
      {!compact && (
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
    </div>
  );
}

// Export utilities for use elsewhere
export { countMarkdownWords, markdownToHtml, htmlToMarkdown };
