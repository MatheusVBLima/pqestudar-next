"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
];

export function ThemeSelector({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const CurrentIcon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  const currentLabel = theme === "system" ? "Sistema" : theme === "dark" ? "Escuro" : "Claro";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-full", className)} aria-label="Escolher tema" title={`Tema: ${currentLabel}`}>
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Aparência</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="cursor-pointer gap-2 rounded-lg">
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {theme === value && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
