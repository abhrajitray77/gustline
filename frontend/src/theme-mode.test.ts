import { describe, expect, it } from "vitest";
import { applyTheme, storedTheme } from "./theme-mode";

describe("theme mode", () => {
  it("defaults to light", () => {
    expect(storedTheme()).toBe("light");
  });

  it("switches the dark class and remembers the choice", () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(storedTheme()).toBe("dark");

    applyTheme("light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(storedTheme()).toBe("light");
  });
});
