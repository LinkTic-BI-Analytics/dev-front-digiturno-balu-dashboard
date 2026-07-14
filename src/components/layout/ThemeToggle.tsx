"use client";

import { IconButton } from "@/components/ui/IconButton";
import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { useTheme } from "@/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <IconButton
      label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      onClick={toggleTheme}
    >
      <span className="relative flex h-4.5 w-4.5 items-center justify-center">
        <SunIcon
          className={`absolute h-4.5 w-4.5 transition-all duration-300 ${
            isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          }`}
        />
        <MoonIcon
          className={`absolute h-4.5 w-4.5 transition-all duration-300 ${
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
          }`}
        />
      </span>
    </IconButton>
  );
}
