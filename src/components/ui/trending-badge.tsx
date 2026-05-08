import { Badge } from "@/components/ui/badge";
import { Flame, Rocket, Star } from "lucide-react";

export type TrendingBadgeType = 'trending' | 'popular' | 'community' | null;

interface TrendingBadgeProps {
  badge: TrendingBadgeType;
  className?: string;
}

export function TrendingBadge({ badge, className = "" }: TrendingBadgeProps) {
  if (!badge) return null;

  const badgeConfig = {
    trending: {
      icon: Flame,
      label: "Em Alta",
      className: "bg-orange-500 text-white hover:bg-orange-600"
    },
    popular: {
      icon: Rocket,
      label: "Mais Procurado",
      className: "bg-blue-500 text-white hover:bg-blue-600"
    },
    community: {
      icon: Star,
      label: "Escolha da Comunidade",
      className: "bg-purple-500 text-white hover:bg-purple-600"
    }
  };

  const config = badgeConfig[badge];
  const Icon = config.icon;

  return (
    <Badge className={`flex items-center gap-1 ${config.className} ${className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
