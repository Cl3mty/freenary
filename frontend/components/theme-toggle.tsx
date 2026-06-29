// components/theme-toggle.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_LABELS = {
  light: "Clair",
  dark: "Sombre",
  system: "Système",
} as const;

type ThemeOption = keyof typeof THEME_LABELS;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Évite le mismatch SSR/hydration sur l'icône affichée
  React.useEffect(() => setMounted(true), []);

  function handleThemeChange(next: ThemeOption) {
    if (next === theme) return;
    setTheme(next);
    toast.success(`Thème : ${THEME_LABELS[next]}`, {
      icon:
        next === "light" ? (
          <Sun className="size-4" />
        ) : next === "dark" ? (
          <Moon className="size-4" />
        ) : (
          <Monitor className="size-4" />
        ),
    });
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Changer de thème">
        <Sun className="size-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Changer de thème" className="text-foreground">
          <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <Sun className="mr-1.5 size-4" />
          {THEME_LABELS.light}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <Moon className="mr-1.5 size-4" />
          {THEME_LABELS.dark}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          <Monitor className="mr-1.5 size-4" />
          {THEME_LABELS.system}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}