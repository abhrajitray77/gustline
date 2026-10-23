// Light by default. The visitor's choice is remembered in this browser only.
export type ThemeMode = "light" | "dark";

const KEY = "gustline-theme";

export function storedTheme(): ThemeMode {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

// shadcn/ui switches theme with a .dark class on <html>.
export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Storage can be blocked (private windows). The toggle still works for this visit.
  }
}
