import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { type Badge } from "@/hooks/useGamification";

interface AchievementBadgeProps {
  badge: Badge;
  size?: "sm" | "md" | "lg";
  showDate?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-1.5",
  lg: "text-base px-4 py-2"
};

const rarityClasses = {
  common: "bg-gray-500 text-white border-gray-400",
  rare: "bg-blue-500 text-white border-blue-400 shadow-lg",
  epic: "bg-purple-500 text-white border-purple-400 shadow-lg",
  legendary: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-300 shadow-xl animate-pulse"
};

export function AchievementBadge({ 
  badge, 
  size = "md", 
  showDate = false, 
  className 
}: AchievementBadgeProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <BadgeUI 
        className={cn(
          "flex items-center gap-1 font-semibold border-2 transition-all hover:scale-105",
          sizeClasses[size],
          rarityClasses[badge.rarity]
        )}
      >
        <span className="text-lg">{badge.icon}</span>
        <span>{badge.name}</span>
      </BadgeUI>
      
      {showDate && badge.dateEarned && (
        <span className="text-xs text-muted-foreground">
          {new Date(badge.dateEarned).toLocaleDateString('pt-BR')}
        </span>
      )}
      
      <div className="text-center max-w-32">
        <p className="text-xs text-muted-foreground leading-tight">
          {badge.description}
        </p>
      </div>
    </div>
  );
}