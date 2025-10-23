import { createContext, useContext, useEffect, useState } from "react";

const THEMES = { DARK: "dark", LIGHT: "light", SYSTEM: "system" } as const;

type Theme = typeof THEMES.LIGHT | typeof THEMES.DARK | typeof THEMES.SYSTEM;

interface ThemeContextOptions {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextOptions | undefined>(undefined);

const THEME_STORAGE_KEY = "nicebucket-theme";

function getCurrentTheme(): Theme {
  if (typeof window === "undefined") {
    return THEMES.SYSTEM;
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const isStoredThemeValid =
    stored === THEMES.LIGHT ||
    stored === THEMES.DARK ||
    stored === THEMES.SYSTEM;

  if (isStoredThemeValid) {
    return stored;
  }

  localStorage.removeItem(THEME_STORAGE_KEY);
  return THEMES.SYSTEM;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getCurrentTheme);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;

    const isSystemAndPrefersDark =
      theme === THEMES.SYSTEM &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === THEMES.DARK || isSystemAndPrefersDark;

    if (isDark) {
      root.classList.add("dark");
      return;
    }

    root.classList.remove("dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
