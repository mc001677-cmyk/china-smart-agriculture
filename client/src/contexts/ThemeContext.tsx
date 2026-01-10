import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "theme";
const THEME_MIGRATION_KEY = "theme_migrated_default_light_20260110";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // 即使 switchable 为 false，如果本地存储有值也优先读取，防止刷新闪烁
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as Theme) || defaultTheme;
  });

  useEffect(() => {
    // 一次性迁移：过去版本默认暗色，且很多用户并没有“主动选择”。
    // 为了响应“整体太黑”，将默认切为亮色；若用户确实想用暗色，可通过切换按钮再切回。
    try {
      const migrated = localStorage.getItem(THEME_MIGRATION_KEY);
      if (!migrated) {
        const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
        if (defaultTheme === "light" && stored === "dark") {
          setThemeState("light");
        }
        localStorage.setItem(THEME_MIGRATION_KEY, "1");
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
