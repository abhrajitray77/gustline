import { describe, expect, it } from "vitest";
import { gw, gwh, hourLabel, mw, shortDay, signedMw, ukHour, ukTime } from "./format";

describe("UK time", () => {
  it("matches UTC in winter", () => {
    expect(ukTime("2026-01-15T07:30:00Z")).toBe("07:30");
  });

  it("is an hour ahead of UTC in summer", () => {
    expect(ukTime("2026-07-15T07:30:00Z")).toBe("08:30");
  });

  it("turns a time into a decimal hour", () => {
    expect(ukHour("2026-01-15T07:30:00Z")).toBe(7.5);
  });

  it("formats delivery days without shifting them", () => {
    expect(shortDay("2026-01-15")).toBe("Thu 15 Jan");
  });
});

describe("numbers", () => {
  it("rounds power and energy", () => {
    expect(mw(4098.4)).toBe("4,098 MW");
    expect(gw(4098)).toBe("4.1 GW");
    expect(gwh(278_600)).toBe("278.6 GWh");
  });

  it("shows the sign of a difference with a proper minus", () => {
    expect(signedMw(-1748)).toBe("−1,748 MW");
    expect(signedMw(56)).toBe("+56 MW");
    expect(signedMw(0)).toBe("0 MW");
  });

  it("labels half hours", () => {
    expect(hourLabel(9)).toBe("09:00");
    expect(hourLabel(9.5)).toBe("09:30");
  });
});
