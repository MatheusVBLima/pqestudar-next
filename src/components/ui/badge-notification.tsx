import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Badge as BadgeType } from "@/hooks/useGamification";
import { X, Trophy } from "lucide-react";

interface BadgeNotificationProps {
  badge: BadgeType;
  onClose: () => void;
}

export function BadgeNotification({ badge, onClose }: BadgeNotificationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const rarityColors = {
    common: "bg-gray-500",
    rare: "bg-blue-500", 
    epic: "bg-purple-500",
    legendary: "bg-gradient-to-r from-yellow-400 to-orange-500"
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <Card className="w-80 border-2 border-primary/50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Nova Conquista!</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setShow(false);
                setTimeout(onClose, 300);
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">{badge.icon}</div>
            <div>
              <Badge className={`${rarityColors[badge.rarity]} text-white font-bold`}>
                {badge.name}
              </Badge>
              <CardDescription className="mt-1 text-sm">
                {badge.description}
              </CardDescription>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center p-2 bg-muted rounded">
            🎉 Parabéns! Você ganhou pontos da comunidade!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}