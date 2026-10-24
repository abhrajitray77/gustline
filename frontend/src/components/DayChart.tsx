import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayView } from "../api";
import { gw, mw, shortDay, signedMw, ukTime } from "../format";
import { cssVar } from "../theme";
import { Toggle } from "@/components/ui/toggle";
import { TooltipBox } from "./common";
import { buildPoints, type Point } from "./day-chart-points";

type Props = { data: DayView; showActual: boolean };

// Make an active layer toggle obvious at a glance.
const PRESSED = "data-[state=on]:border-foreground/30 data-[state=on]:bg-muted data-[state=on]:text-foreground";


// Forecast against actual for one delivery day. The shaded gap is what the desk had to cover (red) or had spare (blue).
export function DayChart({ data, showActual }: Props) {
  const [showRange, setShowRange] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);
  const [showCorrected, setShowCorrected] = useState(false);

  const points = useMemo(() => buildPoints(data), [data]);

  const colors = {
    forecast: cssVar("--forecast"),
    actual: cssVar("--actual"),
    short: cssVar("--short"),
    over: cssVar("--over"),
    earlier: cssVar("--earlier"),
    grid: cssVar("--grid"),
    faint: cssVar("--faint"),
    axis: cssVar("--axis"),
    card: cssVar("--card"),
    corrected: cssVar("--corrected"),
  };

  // Fit the axis to what is on screen instead of starting at zero.
  const shown = points.flatMap((p) => [
    p.forecast,
    ...(showCorrected && p.corrected != null ? [p.corrected] : []),
    ...(showActual && p.actual != null ? [p.actual] : []),
    ...(showRange && p.band ? p.band : []),
    ...(showEarlier ? data.earlier.map((_, i) => p[`e${i}`] as number | undefined).filter((v): v is number => v != null) : []),
  ]);
  const step = 2500;
  const lo = Math.max(0, Math.floor((Math.min(...shown) * 0.95) / step) * step);
  const hi = Math.ceil((Math.max(...shown) * 1.03) / step) * step;
  const yTicks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  const xTicks = data.hours.filter((_, i) => i % 3 === 0).map((h) => new Date(h.time).getTime());

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <Key color={colors.forecast} label="Forecast used" />
        {showCorrected && <Key color={colors.corrected} label="Bias corrected" dashed />}
        {showActual && (
          <>
            <Key color={colors.actual} label="Actual" />
            <Key color={colors.short} label="Short" swatch />
            <Key color={colors.over} label="Spare" swatch />
          </>
        )}
        <span className="ml-auto flex flex-wrap gap-2">
          <Toggle size="sm" variant="outline" pressed={showCorrected} onPressedChange={setShowCorrected} className={PRESSED}>
            Bias corrected
          </Toggle>
          <Toggle size="sm" variant="outline" pressed={showRange} onPressedChange={setShowRange} className={PRESSED}>
            Likely range
          </Toggle>
          <Toggle size="sm" variant="outline" pressed={showEarlier} onPressedChange={setShowEarlier} className={PRESSED}>
            Older forecasts
          </Toggle>
        </span>
      </div>

      {showCorrected && (
        <p className="-mt-2 mb-3 text-sm text-muted-foreground">
          {data.correction == null
            ? "No correction for this day yet. It needs at least one finished day before the decision."
            : `Adds ${signedMw(data.correction)} to every hour, the average miss over the last 7 days the desk could see at decision time.`}
        </p>
      )}

      <div className="h-80 md:h-96">
        <ResponsiveContainer>
          <ComposedChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="fill-short" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.short} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colors.short} stopOpacity={0.12} />
              </linearGradient>
              <linearGradient id="fill-extra" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.over} stopOpacity={0.3} />
                <stop offset="100%" stopColor={colors.over} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={xTicks}
              tickFormatter={(t: number) => ukTime(new Date(t).toISOString())}
              stroke={colors.faint}
              axisLine={{ stroke: colors.axis }}
              tickLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              domain={[lo, hi]}
              ticks={yTicks}
              tickFormatter={(v: number) => `${v / 1000} GW`}
              stroke={colors.faint}
              axisLine={false}
              tickLine={false}
              fontSize={12}
              width={64}
            />
            <Tooltip
              cursor={{ stroke: colors.faint, strokeDasharray: "4 4" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as Point | undefined;
                if (!active || !p?.real) return null;
                const rows = [{ label: "forecast used", value: mw(p.forecast), color: colors.forecast }];
                if (showCorrected && p.corrected != null) rows.push({ label: "bias corrected", value: mw(p.corrected), color: colors.corrected });
                if (showActual && p.actual != null) {
                  rows.push({ label: "actual", value: mw(p.actual), color: colors.actual });
                  rows.push({ label: p.actual < p.forecast ? "short" : "spare", value: signedMw(p.actual - p.forecast), color: p.actual < p.forecast ? colors.short : colors.over });
                }
                if (showRange && p.band) rows.push({ label: "likely range", value: `${gw(p.band[0])} to ${gw(p.band[1])}`, color: "" });
                return <TooltipBox title={`${ukTime(new Date(p.t).toISOString())} · ${shortDay(data.day)}`} rows={rows} />;
              }}
            />

            {showRange && <Area type="monotone" dataKey="band" stroke="none" fill={colors.forecast} fillOpacity={0.1} isAnimationActive={false} />}
            {showEarlier &&
              data.earlier.map((_, i) => (
                <Line
                  key={i}
                  type="monotone"
                  dataKey={`e${i}`}
                  stroke={colors.earlier}
                  strokeWidth={1.25}
                  strokeOpacity={0.3 + (0.5 * i) / Math.max(1, data.earlier.length - 1)}
                  dot={false}
                  activeDot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            {/* Recharts only sees direct children, so no fragments here. */}
            {showActual && <Area type="linear" dataKey="short" stroke="none" fill="url(#fill-short)" animationDuration={900} />}
            {showActual && <Area type="linear" dataKey="extra" stroke="none" fill="url(#fill-extra)" animationDuration={900} />}
            <Line
              type="linear"
              dataKey="forecast"
              stroke={colors.forecast}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: colors.forecast, stroke: colors.card, strokeWidth: 2 }}
              animationDuration={1000}
            />
            {showCorrected && (
              <Line
                type="linear"
                dataKey="corrected"
                stroke={colors.corrected}
                strokeWidth={2.5}
                strokeDasharray="7 5"
                dot={false}
                activeDot={{ r: 5, fill: colors.corrected, stroke: colors.card, strokeWidth: 2 }}
                connectNulls
                animationDuration={800}
              />
            )}
            {showActual && (
              <Line
                type="linear"
                dataKey="actual"
                stroke={colors.actual}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: colors.actual, stroke: colors.card, strokeWidth: 2 }}
                connectNulls
                animationDuration={1000}
                animationBegin={200}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Key({ color, label, swatch, dashed }: { color: string; label: string; swatch?: boolean; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {swatch ? (
        <span className="size-3 rounded-sm" style={{ background: color, opacity: 0.5 }} />
      ) : (
        <span className="w-4 border-t-[3px]" style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />
      )}
      {label}
    </span>
  );
}
