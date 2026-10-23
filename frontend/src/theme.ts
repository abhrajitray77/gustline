// Recharts needs real colour values, so read them from the CSS variables in index.css.
export function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// One easing curve for the whole app so motion feels consistent.
export const EASE = [0.22, 1, 0.36, 1] as const;
