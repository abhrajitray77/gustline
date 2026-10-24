// Types mirror backend/app/schemas.py.

export type Summary = {
  hours: number;
  mae: number;
  rmse: number;
  bias: number;
  wape: number;
  p10_error: number;
  p90_error: number;
  buffer_p90: number;
  buffer_p95: number;
  mean_actual: number;
};

export type Meta = {
  first_day: string;
  last_day: string;
  days: string[];
  default_decision_hour: number;
  timezone: string;
  forecast_count: number;
};

export type DayStats = {
  day: string;
  mae: number;
  bias: number;
  forecast_mwh: number;
  actual_mwh: number;
  worst_shortfall: number;
  worst_hour: string;
};

export type Accuracy = {
  decision_hour: number;
  summary: Summary;
  by_hour: { hour: number; mae: number; bias: number }[];
  by_lead: { lead_from: number; lead_to: number; mae: number; rmse: number; samples: number }[];
  histogram: { low: number; high: number; count: number }[];
  daily: DayStats[];
  corrected: Summary;
  correction_window_days: number;
};

export type HourPoint = {
  time: string;
  forecast: number;
  corrected: number;
  actual: number;
  error: number;
  low: number;
  high: number;
};

export type DayView = {
  day: string;
  decision_hour: number;
  decided_with: string;
  hours: HourPoint[];
  actual_half_hourly: { time: string; actual: number }[];
  earlier: { publish_time: string; points: { time: string; forecast: number }[] }[];
  summary: Summary;
  forecast_mwh: number;
  actual_mwh: number;
  plan_mwh: number;
  correction: number | null;
};

const BASE = import.meta.env.VITE_API_URL ?? "";

async function load<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

// One promise per URL. Components read them with React's use() inside <Suspense>, which needs
// the same promise on every render. It also means a day you have already seen opens instantly.
const cache = new Map<string, Promise<unknown>>();

function get<T>(path: string): Promise<T> {
  if (!cache.has(path)) cache.set(path, load<T>(path));
  return cache.get(path) as Promise<T>;
}

export const api = {
  meta: () => get<Meta>("/api/meta"),
  accuracy: (decisionHour: number) => get<Accuracy>(`/api/accuracy?decision_hour=${decisionHour}`),
  day: (day: string, decisionHour: number) => get<DayView>(`/api/day/${day}?decision_hour=${decisionHour}`),
  // Forget everything, so a retry after an error fetches again.
  clear: () => cache.clear(),
};
