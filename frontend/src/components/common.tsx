// App-level building blocks on top of shadcn/ui (in ./ui). Motion adds the animation.
import { animate, motion, useInView } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { EASE } from "../theme";

const MotionCard = motion.create(Card);

export function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <MotionCard
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: EASE }}
      className="min-w-0 gap-4 py-5 md:py-6 [--card-spacing:--spacing(5)] md:[--card-spacing:--spacing(6)]"
    >
      <CardHeader>
        <CardTitle className="font-semibold">{title}</CardTitle>
        {subtitle && <CardDescription className="max-w-2xl">{subtitle}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </MotionCard>
  );
}

// Counts up to a number the first time it scrolls into view, and glides between values after that.
export function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const from = useRef(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(from.current, value, { duration: 0.9, ease: EASE, onUpdate: setShown });
    from.current = value;
    return () => controls.stop();
  }, [value, inView]);

  return (
    <span ref={ref} className="tabular">
      {format(shown)}
    </span>
  );
}

export function Stat({
  label,
  value,
  format,
  text,
  note,
  art,
  index = 0,
}: {
  label: string;
  value?: number;
  format?: (v: number) => string;
  text?: string;
  note?: string;
  art?: ReactNode;
  index?: number;
}) {
  return (
    <MotionCard
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: index * 0.06 }}
      size="sm"
      className="relative min-h-32 gap-1 px-4 py-4 md:px-5"
    >
      {art}
      {/* Text sits above the art. */}
      <div className="relative space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
          {value != null && format ? <AnimatedNumber value={value} format={format} /> : text}
        </p>
        {note && <p className="max-w-[85%] text-sm text-faint">{note}</p>}
      </div>
    </MotionCard>
  );
}

export function LegendItem({ color, label, band }: { color: string; label: string; band?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      {band ? <span className="h-3 w-4 rounded-sm" style={{ background: color }} /> : <span className="w-4 rounded-full border-t-2" style={{ borderColor: color }} />}
      {label}
    </span>
  );
}

export function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="min-w-44 rounded-xl border bg-popover/90 px-3 py-2.5 text-sm text-popover-foreground shadow-xl backdrop-blur-md">
      <p className="mb-1.5 text-xs font-medium tracking-wide text-faint uppercase">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2 py-0.5">
          {row.color && <span className="w-3 rounded-full border-t-2" style={{ borderColor: row.color }} />}
          <span className="tabular font-semibold">{row.value}</span>
          <span className="text-muted-foreground">{row.label}</span>
        </p>
      ))}
    </div>
  );
}

// shadcn ToggleGroup with a pill that slides to the chosen option.
export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={label}
      className={cn("rounded-xl border bg-card p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className={cn(
              "relative h-auto min-h-8 flex-1 rounded-lg px-3 py-1 hover:bg-transparent data-[state=on]:bg-transparent sm:flex-none",
              active ? "text-primary-foreground hover:text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${label}-pill`}
                className="absolute inset-0 rounded-lg bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">
              {option.label}
              {/* On phones the hint drops to a second line so all options fit. */}
              {option.hint && <span className="block text-xs opacity-75 sm:ml-1 sm:inline sm:text-sm sm:opacity-100">{option.hint}</span>}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
