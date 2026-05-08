"use client";

import { Bookmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSavedItems, SavedItemMetadata } from "@/hooks/useSavedItems";
import { cn } from "@/lib/utils";

interface BonusToolCardProps {
  id: string;
  logoUrl?: string;
  logoAlt?: string;
  title: string;
  description: string;
  tags?: string[];
  url?: string;
}

export function BonusToolCard({
  id,
  logoUrl,
  logoAlt,
  title,
  description,
  tags = [],
  url
}: BonusToolCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isSaved, toggleSave, isToggling } = useSavedItems();

  const saved = isSaved('tool', id);
  const toggling = isToggling('tool', id);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      router.push("/login");
      return;
    }

    const metadata: SavedItemMetadata = {
      title,
      description,
      icon_url: logoUrl,
      tags,
      url
    };

    await toggleSave('tool', id, metadata);
  };

  return (
    <Card className="group flex flex-col h-full hover:shadow-lg transition-all duration-300 border hover:border-primary/20">
      <CardContent className="flex flex-col flex-1 p-6">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 mb-4">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={logoAlt || `Logo de ${title}`}
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ExternalLink className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Title */}
        <h4 className="font-semibold text-lg text-foreground mb-2">
          {title}
        </h4>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
          {description}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs font-normal px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions - fixed at bottom */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/50">
          {url && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1"
            >
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label={`Acessar ${title} em nova aba`}
              >
                Acessar
              </a>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={toggling}
            className={cn(
              "gap-1.5 shrink-0 transition-colors",
              saved 
                ? "text-primary hover:text-primary/80" 
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={saved ? "Remover dos salvos" : "Salvar ferramenta"}
            title={saved ? "Remover dos salvos" : "Salvar ferramenta"}
          >
            <Bookmark 
              className={cn(
                "h-4 w-4 transition-all",
                saved && "fill-current"
              )} 
            />
            <span className="text-xs font-medium">
              {toggling ? "..." : saved ? "Salvo" : "Salvar"}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
