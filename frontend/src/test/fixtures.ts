import type { DayView, HourPoint, Summary } from "../api";

export const summary: Summary = {
  hours: 3,
  mae: 500,
  rmse: 600,
  bias: -300,
  wape: 0.1,
  p10_error: -800,
  p90_error: 200,
  buffer_p90: 800,
  buffer_p95: 900,
  mean_actual: 5000,
};

const hour = (time: string, forecast: number, actual: number): HourPoint => ({
  time,
  forecast,
  corrected: forecast,
  actual,
  error: actual - forecast,
  low: forecast - 800,
  high: forecast + 200,
});

// Three hours on 15 Jan (UK winter, so UTC = UK time): short, then spare, then short again.
export const day: DayView = {
  day: "2026-01-15",
  decision_hour: 9,
  decided_with: "2026-01-14T07:30:00+00:00",
  hours: [
    hour("2026-01-15T10:00:00+00:00", 6000, 5000), // 1,000 short
    hour("2026-01-15T11:00:00+00:00", 6000, 6400), // 400 spare
    hour("2026-01-15T12:00:00+00:00", 6000, 5700), // 300 short
  ],
  actual_half_hourly: [],
  earlier: [],
  summary,
  forecast_mwh: 18000,
  actual_mwh: 17100,
  plan_mwh: 15600,
  correction: null,
};
