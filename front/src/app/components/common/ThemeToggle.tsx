import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "../ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Evita erro de hidratacao
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="rounded-full w-9 h-9 border-border bg-secondary/50">
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full w-9 h-9 border-border bg-secondary/50 hover:bg-muted transition-colors"
      title={theme === "dark" ? "Alternar para modo claro" : "Alternar para modo escuro"}
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-primary transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-primary transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
