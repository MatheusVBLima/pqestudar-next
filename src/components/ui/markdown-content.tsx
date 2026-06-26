"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
  /** "default" - main content; "prose" - small/inline (e.g. CTA blocks). */
  variant?: "default" | "prose";
  enableImageLightbox?: boolean;
}

type LightboxImage = {
  src: string;
  alt: string;
};

function ImageLightbox({
  image,
  onOpenChange,
}: {
  image: LightboxImage | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const open = !!image;

  useEffect(() => {
    if (open) {
      setZoom(1);
    }
  }, [open, image?.src]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "x") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  const zoomOut = () => setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))));
  const zoomIn = () => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] border-0 bg-black/95 p-0 shadow-none sm:rounded-none [&>button]:hidden">
        <DialogTitle className="sr-only">Imagem expandida</DialogTitle>
        <DialogDescription className="sr-only">
          Use os controles para aproximar ou afastar a imagem. Pressione X ou Escape para sair.
        </DialogDescription>

        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-background/90 p-1 shadow-lg backdrop-blur">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={zoomOut}
            disabled={zoom <= 0.5}
            aria-label="Diminuir zoom"
            className="h-9 w-9 rounded-full"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-12 text-center text-xs font-semibold text-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={zoomIn}
            disabled={zoom >= 3}
            aria-label="Aumentar zoom"
            className="h-9 w-9 rounded-full"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar imagem"
          className="absolute right-4 top-4 z-10 h-10 w-10 rounded-full border border-white/10 bg-background/90 shadow-lg backdrop-blur hover:bg-background"
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="flex h-full w-full items-center overflow-auto p-4 pt-20 sm:p-8 sm:pt-20">
          {image && (
            <img
              src={image.src}
              alt={image.alt}
              className="m-auto max-h-none max-w-none rounded-md object-contain shadow-2xl"
              style={{
                width: `${zoom * 100}%`,
                maxWidth: zoom === 1 ? "min(100%, 1400px)" : "none",
              }}
              draggable={false}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MarkdownContent({
  children,
  className,
  variant = "default",
  enableImageLightbox = false,
}: MarkdownContentProps) {
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);

  const baseComponents = variant === "prose" ? COMPONENT_MAP_PROSE : COMPONENT_MAP_DEFAULT;
  const openImage = useCallback((src: string, alt: string) => {
    setLightboxImage({ src, alt });
  }, []);

  const components = useMemo<Components>(() => {
    if (!enableImageLightbox) return baseComponents;

    return {
      ...baseComponents,
      img: ({ src, alt, className: imgClassName, ...props }) => {
        const imageSrc = typeof src === "string" ? src : "";
        const imageAlt = typeof alt === "string" ? alt : "";

        return (
          <img
            src={imageSrc}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            tabIndex={0}
            role="button"
            aria-label={imageAlt ? `Expandir imagem: ${imageAlt}` : "Expandir imagem"}
            className={cn(
              "rounded-md my-4 max-w-full h-auto transition duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              imgClassName,
            )}
            onClick={() => imageSrc && openImage(imageSrc, imageAlt)}
            onKeyDown={(event) => {
              if (!imageSrc) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openImage(imageSrc, imageAlt);
              }
            }}
            {...props}
          />
        );
      },
    };
  }, [baseComponents, enableImageLightbox, openImage]);

  if (!children) return null;

  return (
    <>
      <div className={cn(className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
          components={components}
        >
          {children}
        </ReactMarkdown>
      </div>
      {enableImageLightbox && (
        <ImageLightbox image={lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)} />
      )}
    </>
  );
}
