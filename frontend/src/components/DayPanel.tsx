import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api, type DayView, type HourPoint, type Summary } from "../api";
import { gw, gwh, longDay, mw, signedMw, ukDay, ukHour, ukTime } from "../format";
import { EASE, cssVar } from "../theme";
import { BarCell, DataTable, DivergingCell, type Column } from "./DataTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClockArt, FloorArt, ReserveArt, TurbineArt } from "./art";
import { DayChart } from "./DayChart";
import { Panel, Stat } from "./common";

type Props = { day: string; days: string[]; decisionHour: number; typical: Summary; onDayChange: (day: string) => void };

export function DayPanel({ day, days, decisionHour, typical, onDayChange }: Props) {
  const [data, setData] = useState<DayView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showActual, setShowActual] = useState(true);
  const [view, setView] = useState<"chart" | "table">("chart");

  useEffect(() => {
    let live = true;
    api
      .day(day, decisionHour)
      .then((result) => live && (setData(result), setError(null)))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [day, decisionHour]);

  const index = days.indexOf(day);

  if (error) return <p className="text-short">Could not load {day}: {error}</p>;
  if (!data) return <p className="text-faint">Loading…</p>;

  const loading = data.day !== day || data.decision_hour !== decisionHour;
  const lead = (new Date(data.hours[0].time).getTime() - new Date(data.decided_with).getTime()) / 3_600_000;
  const colors = {
    forecast: cssVar("--forecast"),
    actual: cssVar("--actual"),
    earlier: cssVar("--earlier"),
    grid: cssVar("--grid"),
    muted: cssVar("--faint"),
    axis: cssVar("--axis"),
    surface: cssVar("--card"),
    short: cssVar("--short"),
  };

  return (
    <div className={`space-y-5 transition-opacity duration-300 ${loading ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-lg" className="rounded-full" aria-label="Previous day" disabled={index <= 0} onClick={() => onDayChange(days[index - 1])}>
            <ChevronLeft />
          </Button>
          <div className="relative overflow-hidden sm:min-w-64">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h2
                key={day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="text-center text-base font-semibold sm:text-lg md:text-xl"
              >
                {longDay(day)}
              </motion.h2>
            </AnimatePresence>
          </div>
          <Button
            variant="outline"
            size="icon-lg"
            className="rounded-full"
            aria-label="Next day"
            disabled={index >= days.length - 1}
            onClick={() => onDayChange(days[index + 1])}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-2.5">
          <Switch id="show-actual" checked={showActual} onCheckedChange={setShowActual} className="data-[state=checked]:bg-actual" />
          <Label htmlFor="show-actual" className="font-normal text-muted-foreground">
            Show what actually happened
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat index={0} art={<TurbineArt />} label="Wind expected" value={data.forecast_mwh} format={gwh} note={`Peak ${gw(Math.max(...data.hours.map((h) => h.forecast)))}`} />
        <Stat index={1} art={<FloorArt />} label="Safe to count on" value={data.plan_mwh} format={gwh} note="Wind that turns up in 9 of 10 hours" />
        <Stat index={2} art={<ReserveArt />} label="Hold in reserve" value={typical.buffer_p90} format={mw} note="Covers the wind shortfall in 9 of 10 hours" />
        <Stat index={3} art={<ClockArt hour={ukHour(data.decided_with)} />} label="Forecast used" text={ukTime(data.decided_with)} note={`Published ${ukDay(data.decided_with)}, ${lead.toFixed(1)} h before delivery`} />
      </div>

      <AnimatePresence initial={false}>
        {showActual && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <span className="block rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">What happened.</span> {gwh(data.actual_mwh)} of wind turned up against {gwh(data.forecast_mwh)} forecast. The
              forecast was off by {mw(data.summary.mae)} in a typical hour, and ran {mw(Math.abs(data.summary.bias))} {data.summary.bias < 0 ? "too high" : "too low"} on
              average.
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <Panel
        title="Wind generation, GB national"
        subtitle="The forecast the desk had at the decision time, against the wind that turned up. Red is wind that did not come and had to be bought. Turn on the likely range or older forecasts for more context."
        action={
          <Tabs value={view} onValueChange={(v) => setView(v as "chart" | "table")}>
            <TabsList>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {view === "chart" ? (
            <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <DayChart data={data} showActual={showActual} />
            </motion.div>
          ) : (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <HourTable data={data} showActual={showActual} colors={colors} />
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>
    </div>
  );
}




function HourTable({ data, showActual, colors }: { data: DayView; showActual: boolean; colors: Record<string, string> }) {
  const maxForecast = Math.max(...data.hours.map((h) => h.forecast));
  const maxError = Math.max(...data.hours.map((h) => Math.abs(h.error)));
  const columns: Column<HourPoint>[] = [
    { key: "time", header: "Hour (UK)", sortValue: (h) => h.time, cell: (h) => <span className="font-medium">{ukTime(h.time)}</span> },
    {
      key: "forecast",
      header: "Forecast",
      align: "right",
      sortValue: (h) => h.forecast,
      cell: (h) => <BarCell value={h.forecast} max={maxForecast} label={mw(h.forecast)} color={colors.forecast} />,
    },
    { key: "low", header: "Likely low", align: "right", sortValue: (h) => h.low, cell: (h) => <span className="text-muted-foreground">{mw(h.low)}</span> },
  ];
  if (showActual) {
    columns.push(
      { key: "actual", header: "Actual", align: "right", sortValue: (h) => h.actual, cell: (h) => mw(h.actual) },
      {
        key: "error",
        header: "Actual − forecast",
        align: "right",
        sortValue: (h) => h.error,
        cell: (h) => <DivergingCell value={h.error} max={maxError} label={signedMw(h.error)} negative={colors.short} positive={colors.forecast} />,
      },
    );
  }
  return <DataTable rows={data.hours} columns={columns} rowKey={(h) => h.time} initialSort={{ key: "time", desc: false }} />;
}
