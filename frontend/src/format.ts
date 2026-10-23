// All times are shown in UK local time, the time the trading desk works in.
const UK = "Europe/London";

const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: UK, hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: UK, weekday: "short", day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

export const ukTime = (iso: string) => timeFmt.format(new Date(iso));
export const ukDay = (iso: string) => dayFmt.format(new Date(iso));
// Decimal UK hour of a timestamp, e.g. 07:30 becomes 7.5.
export const ukHour = (iso: string) => {
  const [h, m] = ukTime(iso).split(":").map(Number);
  return h + m / 60;
};
export const ukDayTime = (iso: string) => `${ukTime(iso)} ${ukDay(iso)}`;

// Delivery days come from the API as plain dates ("2026-01-15").
export const longDay = (day: string) => longDayFmt.format(new Date(`${day}T00:00:00Z`));
export const shortDay = (day: string) => shortDayFmt.format(new Date(`${day}T00:00:00Z`));

const num = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const oneDp = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const mw = (value: number) => `${num.format(value)} MW`;
export const gw = (value: number) => `${oneDp.format(value / 1000)} GW`;
export const gwh = (mwh: number) => `${oneDp.format(mwh / 1000)} GWh`;
export const pct = (value: number) => `${Math.round(value * 100)}%`;
export const signedMw = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${num.format(Math.abs(value))} MW`;
export const hourLabel = (hour: number) => `${String(Math.floor(hour)).padStart(2, "0")}:${hour % 1 ? "30" : "00"}`;
