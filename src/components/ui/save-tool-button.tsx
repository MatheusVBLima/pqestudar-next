"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSavedItems, SavedItemMetadata } from "@/hooks/useSavedItems";
import { cn } from "@/lib/utils";

interface SaveToolButtonProps {
  toolId: string;
  toolName: string;
  metadata?: SavedItemMetadata;
  className?: string;
}

export function SaveToolButton({ toolId, toolName, metadata, className }: SaveToolButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isSaved, toggleSave, isToggling } = useSavedItems();

  const saved = isSaved('tool', toolId);
  const toggling = isToggling('tool', toolId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      router.push("/login");
      return;
    }

    await toggleSave('tool', toolId, metadata);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={toggling}
      className={cn(
        "gap-1.5 transition-colors",
        saved 
          ? "text-primary hover:text-primary/80" 
          : "text-muted-foreground hover:text-foreground",
        className
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
  );
}
