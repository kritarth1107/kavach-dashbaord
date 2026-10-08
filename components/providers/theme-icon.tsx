"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "./theme-provider";

const noop = () => () => {};

/**
 * The sun/moon for a theme switch. The saved theme is only known in the browser, so the server renders an empty
 * slot of the same size and the icon appears after hydration (no mismatch between server and client HTML).
 */
export function ThemeIcon({ sun, moon, size }: { sun: React.ReactNode; moon: React.ReactNode; size: number }) {
  const { theme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return <span aria-hidden style={{ width: size, height: size, display: "inline-block" }} />;
  return <>{theme === "dark" ? sun : moon}</>;
}

/** "Switch to light/dark mode", only after hydration (the server does not know the saved theme). */
export function useThemeLabel(): { dark: boolean; label: string } {
  const { theme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const dark = mounted && theme === "dark";
  return { dark, label: mounted ? (dark ? "Switch to light mode" : "Switch to dark mode") : "Switch theme" };
}
