"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ThemeMode = "dark" | "light";

type ThemeContextType = {
  mode: ThemeMode;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("embedded-lab-theme");
    if (saved === "dark" || saved === "light") {
      setMode(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("embedded-lab-theme", mode);
    document.documentElement.dataset.labTheme = mode;
  }, [mode]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        toggleTheme: () => setMode((prev) => (prev === "dark" ? "light" : "dark")),
      }}
    >
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
