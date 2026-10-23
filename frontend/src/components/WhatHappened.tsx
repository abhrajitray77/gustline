import { motion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { DayView } from "../api";
import { gwh, mw, pct, ukTime } from "../format";
import { EASE } from "../theme";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// After-the-fact verdict for one delivery day: how far off the forecast was, and what it cost in energy.
export function WhatHappened({ data }: { data: DayView }) {
  // Hourly MW over one hour is MWh, so summing hourly gaps gives energy.
  const shortMwh = data.hours.reduce((sum, h) => sum + Math.max(0, -h.error), 0);
  const spareMwh = data.hours.reduce((sum, h) => sum + Math.max(0, h.error), 0);
  const worst = data.hours.reduce((a, b) => (b.error < a.error ? b : a));
  const change = data.actual_mwh / data.forecast_mwh - 1;
  const ranHigh = change < 0;
  const shortShare = shortMwh / (shortMwh + spareMwh || 1);
  // Where the glow turns from red to blue, softened either side. No blend at the ends, so an all-short day stays all red.
  const split = shortShare * 100;
  const blend = Math.min(12, split, 100 - split);

  return (
    <Card className="relative gap-0 overflow-hidden p-0">
      {/* Soft glow rising from the bottom edge, red for the shortfall share of the miss and blue for the spare share. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 [mask-image:linear-gradient(to_top,black,transparent)]"
        style={{
          background: `linear-gradient(to right, var(--short) 0%, var(--short) ${split - blend}%, var(--over) ${split + blend}%, var(--over) 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.07 }}
        transition={{ duration: 0.8, ease: EASE }}
      />
      <div className="relative grid gap-5 p-5 md:grid-cols-[1.3fr_2fr] md:items-center md:gap-8 md:p-6">
        {/* Verdict */}
        <div className="flex items-start gap-4">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", ranHigh ? "bg-short/12 text-short" : "bg-over/12 text-over")}>
            {ranHigh ? <TrendingDown className="size-5" /> : <TrendingUp className="size-5" />}
          </span>
          <div>
            <p className="text-xs font-medium tracking-wide text-faint uppercase">What happened</p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight">
              Forecast ran {pct(Math.abs(change))} {ranHigh ? "high" : "low"}
            </p>
            <p className="text-sm text-muted-foreground">
              {gwh(data.actual_mwh)} of wind turned up against {gwh(data.forecast_mwh)} forecast.
            </p>
          </div>
        </div>

        {/* Figures */}
        <dl className="grid grid-cols-3 gap-4 md:border-l md:pl-8">
          <Figure label="Had to buy" value={gwh(shortMwh)} tone="short" note="Wind that did not come" />
          <Figure label="Spare" value={gwh(spareMwh)} tone="over" note="More wind than forecast" />
          <Figure
            label="Worst hour"
            tone="worst"
            value={worst.error < 0 ? mw(-worst.error) : "None"}
            note={worst.error < 0 ? `Short at ${ukTime(worst.time)}` : "Never short"}
          />
        </dl>
      </div>
    </Card>
  );
}

// Filled dots match the chart's short and spare colours. The worst hour gets a hollow red ring: one shortfall hour, not a total.
const DOT = {
  short: "bg-short",
  over: "bg-over",
  worst: "border-2 border-short",
};

function Figure({ label, value, note, tone }: { label: string; value: string; note: string; tone: keyof typeof DOT }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={cn("size-2 rounded-full", DOT[tone])} />
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold tracking-tight tabular sm:text-xl">{value}</dd>
      <dd className="mt-0.5 hidden text-xs text-faint sm:block">{note}</dd>
    </div>
  );
}
