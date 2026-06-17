import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import { Icon } from "@/components/Icon";
import { applySystemChromeTheme } from "@/lib/systemChromeTheme";
import { writeMapTileStyle } from "@/lib/mapTileStyle";

export type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function ThemeBridge({ children }: { children: ReactNode }) {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const resolved = (resolvedTheme === "light" ? "light" : "dark") as "dark" | "light";
    document.body.className = resolved === "dark" ? "dark-theme" : "light-theme";
    applySystemChromeTheme(resolved);
    writeMapTileStyle(resolved);
  }, [resolvedTheme]);

  const normalizedTheme: Theme =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  const setThemeSafe = (next: Theme) => {
    setTheme(next);
    if (next === "light" || next === "dark") {
      localStorage.setItem("theme-selected", "true");
    }
  };

  const toggleTheme = () => {
    setThemeSafe(isDark ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: normalizedTheme,
        setTheme: setThemeSafe,
        toggleTheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="theme"
      disableTransitionOnChange={false}
    >
      <ThemeBridge>{children}</ThemeBridge>
    </NextThemesProvider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function ThemeToggle() {
  const { toggleTheme, isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-full bg-secondary hover:bg-accent transition-colors press-effect"
      aria-label="Toggle theme"
      data-testid="button-theme-toggle"
    >
      <span className="dark:hidden">
        <Icon name="moon" size="sm" weight="regular" />
      </span>
      <span className="hidden dark:inline">
        <Icon name="sun" size="sm" weight="regular" />
      </span>
      <span className="sr-only">{isDark ? "Switch to light mode" : "Switch to dark mode"}</span>
    </button>
  );
}
