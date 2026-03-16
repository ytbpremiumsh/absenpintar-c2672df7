import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ variant = "ghost", size = "icon" }: { variant?: "ghost" | "outline"; size?: "icon" | "sm" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className="h-8 w-8 rounded-lg"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Sun className="h-4 w-4 text-yellow-400" />
      )}
    </Button>
  );
}
