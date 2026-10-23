import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api, type Accuracy, type Meta } from "./api";
import { AccuracyPanel } from "./components/AccuracyPanel";
import { DayPanel } from "./components/DayPanel";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "./components/Footer";
import { PillToggle } from "./components/common";
import { shortDay } from "./format";
import { EASE } from "./theme";
import { applyTheme, storedTheme, type ThemeMode } from "./theme-mode";

type Tab = "day" | "accuracy";

// Elexon publishes wind forecasts at 04:30, 07:30, 09:30 and 11:30 UK in the morning,
// so these decision times each pick up a different forecast.
// Values are decimal UK hours, as strings for the toggle group.
const DECISION_TIMES = [
  { value: "6", label: "06:00" },
  { value: "9", label: "09:00", hint: "EPEX" },
  { value: "9.75", label: "09:45", hint: "N2EX" },
  { value: "12", label: "12:00" },
];

const TABS = [
  ["day", "Decision day"],
  ["accuracy", "Forecast accuracy"],
] as const;

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [accuracy, setAccuracy] = useState<Accuracy | null>(null);
  // ?tab=accuracy opens the accuracy view directly, handy for sharing a link.
  const [tab, setTab] = useState<Tab>(new URLSearchParams(location.search).get("tab") === "accuracy" ? "accuracy" : "day");
  const [day, setDay] = useState("2026-01-15");
  const [decisionHour, setDecisionHour] = useState(9);
  const [error, setError] = useState<string | null>(null);
  // Charts read colours from CSS when they render, so keeping the theme in state re-renders them on switch.
  const [theme, setTheme] = useState<ThemeMode>(storedTheme);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  useEffect(() => {
    api.meta().then(setMeta).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    api.accuracy(decisionHour).then(setAccuracy).catch((e: Error) => setError(e.message));
  }, [decisionHour]);

  const openDay = (picked: string) => {
    setDay(picked);
    setTab("day");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    // Respect the visitor's reduced motion setting everywhere.
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground">
            <img src="/favicon.svg" alt="" className="size-5" /> GUSTLINE
          </p>
          <Button variant="outline" size="icon" className="rounded-full" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2 }}
                className="flex"
              >
                {theme === "dark" ? <Sun /> : <Moon />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>

        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-8 flex flex-wrap items-end justify-between gap-6"
        >
          <div>
            <h1 className=" text-3xl font-semibold tracking-tight md:text-4xl">Day-ahead wind outlook</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              How much GB wind to count on when buying power for tomorrow, and how far to trust the forecast.
              {meta && ` Pilot covering purchase decisions made in January 2026 (delivery ${shortDay(meta.first_day)} to ${shortDay(meta.last_day)}).`}
            </p>
          </div>
          <div className="w-full space-y-1.5 sm:w-auto">
            <p className="text-sm text-muted-foreground">Decision time, UK, day before delivery</p>
            <PillToggle
            label="Decision time"
            value={String(decisionHour)}
            onChange={(v) => setDecisionHour(Number(v))}
            options={DECISION_TIMES}
            className="w-full sm:w-auto"
          />
          </div>
        </motion.header>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-6">
          <TabsList variant="line" className="w-full justify-start gap-6 border-b px-0">
            {TABS.map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="relative flex-none px-0 pb-2.5 text-base font-semibold after:hidden">
                {label}
                {/* The underline slides between tabs. */}
                {tab === key && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-[5px] h-0.5 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {error && <p className="mb-4 text-short">Could not reach the API: {error}</p>}

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {meta && accuracy && tab === "day" && (
              <DayPanel day={day} days={meta.days} decisionHour={decisionHour} typical={accuracy.summary} onDayChange={setDay} />
            )}
            {accuracy && tab === "accuracy" && <AccuracyPanel data={accuracy} onPickDay={openDay} />}
          </motion.div>
        </AnimatePresence>

        <Footer />
      </div>
    </MotionConfig>
  );
}
