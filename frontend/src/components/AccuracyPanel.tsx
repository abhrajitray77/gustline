import { motion } from "motion/react";
import { use, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type Accuracy, type DayStats } from "../api";
import { gw, gwh, hourLabel, mw, pct, shortDay, signedMw } from "../format";
import { EASE, cssVar } from "../theme";
import { BarCell, DataTable, DivergingCell, type Column } from "./DataTable";
import { BiasArt, ReserveArt, ScatterArt, TailArt } from "./art";
import { ChartFill, LegendItem, Panel, Stat, TooltipBox } from "./common";

type Props = { data: Accuracy; onPickDay: (day: string) => void };

// Reads the accuracy data with use(), so the parent's <Suspense> shows a skeleton until it arrives.
export function AccuracyPanel({ decisionHour, onPickDay }: { decisionHour: number; onPickDay: (day: string) => void }) {
  const data = use(api.accuracy(decisionHour));
  const s = data.summary;
  const colors = {
    forecast: cssVar("--forecast"),
    short: cssVar("--short"),
    over: cssVar("--over"),
    grid: cssVar("--grid"),
    muted: cssVar("--faint"),
    axis: cssVar("--axis"),
    actual: cssVar("--actual"),
  };
  const lead = data.by_lead;
  const growth = lead.length > 1 ? lead[lead.length - 1].mae / lead[0].mae - 1 : 0;

  // Hovering a bar dims the others so the one you are reading stands out.
  const [leadHover, setLeadHover] = useState<number | null>(null);
  const [hourHover, setHourHover] = useState<number | null>(null);
  const [binHover, setBinHover] = useState<number | null>(null);
  const dim = (hover: number | null, i: number) => (hover == null || hover === i ? 1 : 0.35);

  const axis = { stroke: colors.muted, tickLine: false, fontSize: 12 } as const;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat index={0} art={<ScatterArt />} label="Typical error (MAE)" value={s.mae} format={mw} note={`${pct(s.wape)} of the wind that turned up`} />
        <Stat index={1} art={<TailArt />} label="Large misses (RMSE)" value={s.rmse} format={mw} note="Weights big misses more heavily" />
        <Stat
          index={2}
          art={<BiasArt />}
          label="Bias"
          value={s.bias}
          format={signedMw}
          note={s.bias < 0 ? "Forecast ran high, wind came in lower" : "Forecast ran low, wind came in higher"}
        />
        <Stat index={3} art={<ReserveArt />} label="Reserve for 90% cover" value={s.buffer_p90} format={gw} note={`${gw(s.buffer_p95)} for 95% cover, across ${s.hours} hours`} />
      </div>

      <Panel title="What this means for the desk">
        <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground md:text-base">
          {[
            <>
              In January the forecast the desk could act on was <b className="text-foreground">{s.bias < 0 ? "too high" : "too low"} by {mw(Math.abs(s.bias))}</b> on average.
              Taken at face value it would have left the desk short in <b className="text-foreground">{pct(shortShare(data))} of hours</b>.
            </>,
            <>
              Buying an extra <b className="text-foreground">{gw(s.buffer_p90)}</b> on top of the forecast would have covered the wind shortfall in 9 of every 10 hours.{" "}
              {gw(s.buffer_p95)} covers 19 in 20.
            </>,
            lead.length > 1 && (
              <>
                Error grows by <b className="text-foreground">{pct(growth)}</b> from the freshest forecasts to the ones made {lead[lead.length - 1].lead_from} hours ahead, so
                waiting for the latest publish before the auction closes is worth it.
              </>
            ),
            <>
              The bias is steady enough to correct. Adding the average miss of the last {data.correction_window_days} days cuts the typical error by{" "}
              <b className="text-foreground">{pct(1 - data.corrected.mae / s.mae)}</b> and the reserve needed for 90% cover from {gw(s.buffer_p90)} to{" "}
              <b className="text-foreground">{gw(data.corrected.buffer_p90)}</b>.
            </>,
          ]
            .filter(Boolean)
            .map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.1 + i * 0.08 }}
                className="flex gap-3"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-forecast" />
                <span>{item}</span>
              </motion.li>
            ))}
        </ul>
      </Panel>

      <CorrectionPanel data={data} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Error grows with lead time" subtitle="Typical error for every forecast in the window, grouped by how far ahead it was made.">
          <ChartFill minHeight="16rem">
            <ResponsiveContainer>
              <BarChart data={lead} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} onMouseLeave={() => setLeadHover(null)}>
                <defs>
                  <linearGradient id="bar-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.forecast} stopOpacity={1} />
                    <stop offset="100%" stopColor={colors.forecast} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="lead_from" tickFormatter={(v: number) => `${v}h`} axisLine={{ stroke: colors.axis }} {...axis} />
                <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(1)} GW`} axisLine={false} width={64} {...axis} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as (typeof lead)[number] | undefined;
                    if (!active || !row) return null;
                    return (
                      <TooltipBox
                        title={`${row.lead_from} to ${row.lead_to} hours ahead`}
                        rows={[
                          { label: "typical error", value: mw(row.mae), color: colors.forecast },
                          { label: "forecasts compared", value: row.samples.toLocaleString("en-GB") },
                        ]}
                      />
                    );
                  }}
                />
                <Bar dataKey="mae" radius={[6, 6, 2, 2]} maxBarSize={36} animationDuration={800} onMouseEnter={(_, i) => setLeadHover(i)}>
                  {lead.map((row, i) => (
                    <Cell key={row.lead_from} fill="url(#bar-blue)" fillOpacity={dim(leadHover, i)} style={{ transition: "fill-opacity 200ms" }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFill>
        </Panel>

        <Panel title="Error by hour of day" subtitle="Typical error and bias for each delivery hour, UK time.">
          <div className="mb-3 flex gap-5">
            <LegendItem color={colors.forecast} label="Typical error" band />
            <LegendItem color={colors.actual} label="Bias" />
          </div>
          <ChartFill minHeight="14rem">
            <ResponsiveContainer>
              <ComposedChart data={data.by_hour} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} onMouseLeave={() => setHourHover(null)}>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="hour" tickFormatter={hourLabel} ticks={[0, 6, 12, 18]} axisLine={{ stroke: colors.axis }} {...axis} />
                <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(1)} GW`} axisLine={false} width={64} {...axis} />
                <ReferenceLine y={0} stroke={colors.axis} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as (typeof data.by_hour)[number] | undefined;
                    if (!active || !row) return null;
                    return (
                      <TooltipBox
                        title={`${hourLabel(row.hour)} UK`}
                        rows={[
                          { label: "typical error", value: mw(row.mae), color: colors.forecast },
                          { label: "bias", value: signedMw(row.bias), color: colors.actual },
                        ]}
                      />
                    );
                  }}
                />
                <Bar dataKey="mae" radius={[4, 4, 1, 1]} maxBarSize={18} animationDuration={800} onMouseEnter={(_, i) => setHourHover(i)}>
                  {data.by_hour.map((row, i) => (
                    <Cell key={row.hour} fill="url(#bar-blue)" fillOpacity={dim(hourHover, i)} style={{ transition: "fill-opacity 200ms" }} />
                  ))}
                </Bar>
                <Line dataKey="bias" stroke={colors.actual} strokeWidth={2.5} dot={false} animationDuration={1000} animationBegin={300} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartFill>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="How big were the misses?" subtitle="Hours by actual minus forecast, in GW. Red is a shortfall the desk had to cover.">
          <ChartFill minHeight="16rem">
            <ResponsiveContainer>
              <BarChart data={data.histogram} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2} onMouseLeave={() => setBinHover(null)}>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="low" tickFormatter={(v: number) => `${v / 1000}`} interval={1} axisLine={{ stroke: colors.axis }} {...axis} />
                <YAxis axisLine={false} width={36} {...axis} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as (typeof data.histogram)[number] | undefined;
                    if (!active || !row) return null;
                    return (
                      <TooltipBox
                        title={`${signedMw(row.low)} to ${signedMw(row.high)}`}
                        rows={[{ label: "hours", value: String(row.count), color: row.high <= 0 ? colors.short : colors.over }]}
                      />
                    );
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 1, 1]} animationDuration={800} onMouseEnter={(_, i) => setBinHover(i)}>
                  {data.histogram.map((bin, i) => (
                    <Cell
                      key={bin.low}
                      fill={bin.high <= 0 ? colors.short : colors.over}
                      fillOpacity={dim(binHover, i)}
                      style={{ transition: "fill-opacity 200ms" }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFill>
        </Panel>

        <Panel title="Day by day" subtitle="Typical error for each delivery day. Darker means a worse forecast. Click a day to open it.">
          <DayGrid data={data} onPickDay={onPickDay} />
        </Panel>
      </div>

      <Panel title="Daily breakdown" subtitle="Every delivery day in the pilot. Sort by any column, click a row to open that day.">
        <DailyTable data={data} onPickDay={onPickDay} colors={colors} />
      </Panel>
    </div>
  );
}

function shortShare(data: Accuracy) {
  const total = data.histogram.reduce((sum, b) => sum + b.count, 0);
  const short = data.histogram.filter((b) => b.high <= 0).reduce((sum, b) => sum + b.count, 0);
  return total ? short / total : 0;
}

// Sequential blue ramp, light to dark, for the day grid.
const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];

function DayGrid({ data, onPickDay }: Props) {
  const values = data.daily.map((d) => d.mae);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (v: number) => Math.min(RAMP.length - 1, Math.floor(((v - min) / (max - min || 1)) * RAMP.length));
  // Start the grid on Monday so columns line up as weekdays.
  const offset = (new Date(`${data.daily[0].day}T00:00:00Z`).getUTCDay() + 6) % 7;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-faint">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d}>{d}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad${i}`} />
        ))}
        {data.daily.map((d, i) => {
          const level = step(d.mae);
          return (
            <motion.button
              key={d.day}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: EASE, delay: (i + offset) * 0.015 }}
              whileHover={{ scale: 1.1, zIndex: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPickDay(d.day)}
              title={`${shortDay(d.day)}: typical error ${mw(d.mae)}, worst shortfall ${mw(d.worst_shortfall)}`}
              aria-label={`${shortDay(d.day)}, typical error ${mw(d.mae)}`}
              className="tabular relative aspect-square rounded-lg text-sm font-medium shadow-sm"
              style={{ background: RAMP[level], color: level >= 3 ? "#fff" : "#0b0b0b" }}
            >
              {Number(d.day.slice(8))}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-faint">
        <span>{mw(min)}</span>
        <span className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(to right, ${RAMP.join(",")})` }} />
        <span>{mw(max)}</span>
      </div>
    </div>
  );
}

function DailyTable({ data, onPickDay, colors }: Props & { colors: Record<string, string> }) {
  const maxMae = Math.max(...data.daily.map((d) => d.mae));
  const maxBias = Math.max(...data.daily.map((d) => Math.abs(d.bias)));
  const maxShort = Math.max(...data.daily.map((d) => d.worst_shortfall));
  const columns: Column<DayStats>[] = [
    { key: "day", header: "Delivery day", sortValue: (d) => d.day, cell: (d) => <span className="font-medium">{shortDay(d.day)}</span> },
    { key: "forecast", header: "Forecast", align: "right", sortValue: (d) => d.forecast_mwh, cell: (d) => gwh(d.forecast_mwh) },
    { key: "actual", header: "Actual", align: "right", sortValue: (d) => d.actual_mwh, cell: (d) => gwh(d.actual_mwh) },
    {
      key: "mae",
      header: "Typical error",
      align: "right",
      sortValue: (d) => d.mae,
      cell: (d) => <BarCell value={d.mae} max={maxMae} label={mw(d.mae)} color={colors.forecast} />,
    },
    {
      key: "bias",
      header: "Bias",
      align: "right",
      sortValue: (d) => d.bias,
      cell: (d) => <DivergingCell value={d.bias} max={maxBias} label={signedMw(d.bias)} negative={colors.short} positive={colors.forecast} />,
    },
    {
      key: "short",
      header: "Worst shortfall",
      align: "right",
      sortValue: (d) => d.worst_shortfall,
      cell: (d) => <BarCell value={d.worst_shortfall} max={maxShort} label={mw(d.worst_shortfall)} color={colors.short} />,
    },
  ];
  return <DataTable rows={data.daily} columns={columns} rowKey={(d) => d.day} onRowClick={(d) => onPickDay(d.day)} initialSort={{ key: "day", desc: false }} />;
}

// Raw forecast against the bias corrected one, on the same hours. Lower is better for every row.
function CorrectionPanel({ data }: { data: Accuracy }) {
  const raw = data.summary;
  const fixed = data.corrected;
  const rows = [
    { label: "Typical error (MAE)", raw: raw.mae, fixed: fixed.mae, format: mw },
    { label: "Large misses (RMSE)", raw: raw.rmse, fixed: fixed.rmse, format: mw },
    { label: "Bias", raw: Math.abs(raw.bias), fixed: Math.abs(fixed.bias), format: mw, note: "size, ignoring sign" },
    { label: "Reserve for 90% cover", raw: raw.buffer_p90, fixed: fixed.buffer_p90, format: gw },
    { label: "Reserve for 95% cover", raw: raw.buffer_p95, fixed: fixed.buffer_p95, format: gw },
  ];
  return (
    <Panel
      title="With a simple bias correction"
      subtitle={`Each morning, add the average miss of the last ${data.correction_window_days} delivery days the desk could already see. Same hours, same decision time, nothing from the future.`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map((row, i) => {
          const drop = 1 - row.fixed / row.raw;
          return (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.06 }}
              className="rounded-xl border p-4"
            >
              <p className="text-sm text-muted-foreground">{row.label}</p>
              <p className="mt-2 text-xl font-semibold tracking-tight whitespace-nowrap text-corrected tabular">{row.format(row.fixed)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                was <span className="tabular line-through">{row.format(row.raw)}</span>, {pct(drop)} lower{row.note ? `, ${row.note}` : ""}
              </p>
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
}
