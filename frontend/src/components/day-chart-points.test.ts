import { describe, expect, it } from "vitest";
import { day } from "../test/fixtures";
import { buildPoints } from "./day-chart-points";

describe("buildPoints", () => {
  const points = buildPoints(day);
  const real = points.filter((p) => p.real);
  const crossings = points.filter((p) => !p.real);

  it("keeps one real point per hour", () => {
    expect(real).toHaveLength(3);
  });

  it("adds a point wherever the forecast and actual lines cross", () => {
    // Short at 10:00, spare at 11:00, short at 12:00: two crossings.
    expect(crossings).toHaveLength(2);
  });

  it("places the crossing where the lines meet", () => {
    // Gap goes from -1,000 to +400, so the lines meet 1,000 / 1,400 of the way through the hour.
    const first = crossings[0];
    const start = Date.parse("2026-01-15T10:00:00Z");
    expect(first.t).toBeCloseTo(start + (1000 / 1400) * 3_600_000);
    expect(first.short).toEqual([6000, 6000]);
    expect(first.extra).toEqual([6000, 6000]);
  });

  it("shades only the side that applies", () => {
    const [ten, eleven] = real;
    expect(ten.short).toEqual([5000, 6000]);
    expect(ten.extra).toEqual([6000, 6000]);
    expect(eleven.extra).toEqual([6000, 6400]);
    expect(eleven.short).toEqual([6000, 6000]);
  });

  it("keeps points in time order", () => {
    const times = points.map((p) => p.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
