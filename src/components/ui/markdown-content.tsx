import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className"],
    a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
    img: [...(defaultSchema.attributes?.img ?? []), "loading", "decoding"],
    th: [...(defaultSchema.attributes?.th ?? []), "align"],
    td: [...(defaultSchema.attributes?.td ?? []), "align"],
  },
};

const COMPONENT_MAP_DEFAULT: Components = {
  h1: ({ children, ...props }) => (
    <h2 className="text-xl font-semibold mt-6 mb-3" {...props}>
      {children}
    </h2>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-xl font-semibold mt-6 mb-3" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-lg font-medium mt-4 mb-2" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-4" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-6 mb-4" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-6 mb-4" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="mb-1" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-muted-foreground/30 pl-4 italic my-4"
      {...props}
    >
      {children}
    </blockquote>
  ),
  pre: ({ children, ...props }) => (
    <pre className="bg-muted rounded-md p-4 overflow-x-auto my-4" {...props}>
      {children}
    </pre>
  ),
  code: ({ children, ...props }) => (
    <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
      {children}
    </code>
  ),
  hr: ({ ...props }) => <hr className="my-6 border-border" {...props} />,
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src as string}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      className="rounded-md my-4 max-w-full h-auto"
      {...props}
    />
  ),
  table: ({ children, ...props }) => (
    <div className="concursos-table-wrap overflow-x-auto -mx-1 px-1 my-4">
      <table className="concursos-table w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted/50" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="border border-border px-3 py-2 font-semibold text-left" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-border px-3 py-2 align-top" {...props}>
      {children}
    </td>
  ),
};

const COMPONENT_MAP_PROSE: Components = {
  ...COMPONENT_MAP_DEFAULT,
  p: ({ children, ...props }) => (
    <p className="mb-2" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-5 mb-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-5 mb-2" {...props}>
      {children}
    </ol>
  ),
};

interface MarkdownContentProps {
  children: string | null | undefined;
  className?: string;
  /** "default" — main content; "prose" — small/inline (e.g. CTA blocks). */
  variant?: "default" | "prose";
}

export function MarkdownContent({ children, className, variant = "default" }: MarkdownContentProps) {
  if (!children) return null;

  const components = variant === "prose" ? COMPONENT_MAP_PROSE : COMPONENT_MAP_DEFAULT;

  return (
    <div className={cn(className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
