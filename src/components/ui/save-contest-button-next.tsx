"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSavedItems, SavedItemMetadata } from "@/hooks/useSavedItems";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { cn } from "@/lib/utils";

interface SaveContestButtonProps {
  contestId: string;
  contestTitle: string;
  metadata?: SavedItemMetadata;
  className?: string;
  variant?: "icon" | "full";
}

export function SaveContestButtonNext({ 
  contestId, 
  contestTitle, 
  metadata,
  className,
  variant = "icon"
}: SaveContestButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isSaved, toggleSave, isToggling } = useSavedItems();
  const { track } = useAnalyticsTracker();

  const saved = isSaved('contest', contestId);
  const toggling = isToggling('contest', contestId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      router.push("/login");
      return;
    }

    // Track save/unsave event for analytics
    if (!saved) {
      track({
        event_name: 'concurso_save_click',
        entity_type: 'concurso',
        entity_id: contestId,
        meta: { contest_title: contestTitle },
      });
    }

    await toggleSave('contest', contestId, metadata);
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={toggling}
        className={cn(
          "shrink-0 transition-colors",
          saved 
            ? "text-primary hover:text-primary/80" 
            : "text-muted-foreground hover:text-foreground",
          className
        )}
        aria-label={saved ? "Remover dos salvos" : "Salvar concurso"}
        title={saved ? "Remover dos salvos" : "Salvar concurso"}
      >
        <Bookmark 
          className={cn(
            "h-4 w-4 transition-all",
            saved && "fill-current"
          )} 
        />
      </Button>
    );
  }

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
      aria-label={saved ? "Remover dos salvos" : "Salvar concurso"}
      title={saved ? "Remover dos salvos" : "Salvar concurso"}
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


