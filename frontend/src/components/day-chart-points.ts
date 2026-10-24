import type { DayView } from "../api";

export type Point = {
  t: number;
  forecast: number;
  corrected?: number;
  actual?: number;
  band?: [number, number];
  // The gap between forecast and actual, split by sign so each side gets its own colour.
  short?: [number, number];
  extra?: [number, number];
  real: boolean; // false for points added only to close the shaded areas where the lines cross
  [earlier: string]: unknown;
};

// Hourly points (actuals already averaged to hourly by the API), plus extra points where the
// forecast and actual lines cross, so the red and blue areas meet cleanly instead of overlapping.
export function buildPoints(data: DayView): Point[] {
  const earlierAt = new Map<number, Record<string, number>>();
  data.earlier.forEach((f, i) => {
    for (const p of f.points) {
      const t = new Date(p.time).getTime();
      earlierAt.set(t, { ...earlierAt.get(t), [`e${i}`]: p.forecast });
    }
  });

  const hours = data.hours.map((h) => ({ t: new Date(h.time).getTime(), forecast: h.forecast, corrected: h.corrected, actual: h.actual, band: [h.low, h.high] as [number, number] }));
  const points: Point[] = [];

  hours.forEach((h, i) => {
    points.push({ ...h, ...earlierAt.get(h.t), ...gap(h.forecast, h.actual), real: true });
    const next = hours[i + 1];
    if (!next) return;
    const d1 = h.actual - h.forecast;
    const d2 = next.actual - next.forecast;
    if (d1 * d2 < 0) {
      // Linear interpolation to the moment the two lines meet.
      const f = d1 / (d1 - d2);
      const t = h.t + f * (next.t - h.t);
      const v = h.forecast + f * (next.forecast - h.forecast);
      points.push({ t, forecast: v, short: [v, v], extra: [v, v], real: false });
    }
  });
  return points;
}

// The side that is not in use collapses to zero height on the forecast line, so it draws nothing.
function gap(forecast: number, actual: number) {
  const flat: [number, number] = [forecast, forecast];
  return actual < forecast ? { short: [actual, forecast] as [number, number], extra: flat } : { extra: [forecast, actual] as [number, number], short: flat };
}
