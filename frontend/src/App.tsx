import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Suspense, use, useState, useTransition } from "react";
import { api } from "./api";
import { AccuracyPanel } from "./components/AccuracyPanel";
import { DayPanel } from "./components/DayPanel";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { AccuracySkeleton } from "./components/skeletons";
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
  // ?tab=accuracy opens the accuracy view directly, handy for sharing a link.
  const [tab, setTab] = useState<Tab>(new URLSearchParams(location.search).get("tab") === "accuracy" ? "accuracy" : "day");
  const [day, setDay] = useState("2026-01-15");
  const [decisionHour, setDecisionHour] = useState(9);
  // Switching day, decision time or tab is a transition: the current view stays on screen
  // (slightly dimmed) until the new data is ready, instead of flashing back to skeletons.
  const [pending, startTransition] = useTransition();
  // Charts read colours from CSS when they render, so keeping the theme in state re-renders them on switch.
  const [theme, setTheme] = useState<ThemeMode>(storedTheme);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  const changeDay = (next: string) => startTransition(() => setDay(next));
  const changeTab = (next: Tab) => startTransition(() => setTab(next));
  const changeDecisionHour = (next: number) => startTransition(() => setDecisionHour(next));

  const openDay = (picked: string) => {
    startTransition(() => {
      setDay(picked);
      setTab("day");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    // Respect the visitor's reduced motion setting everywhere.
    <MotionConfig reducedMotion="user">
      {/* Full screen height column, so the footer stays at the bottom even while content loads. */}
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-4 py-6 md:px-8 md:py-10">
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
              How much GB wind to count on when buying power for tomorrow, and how far to trust the forecast.{" "}
              <Suspense fallback={<Skeleton className="inline-block h-4 w-72 align-middle" />}>
                <PilotRange />
              </Suspense>
            </p>
          </div>
          <div className="w-full space-y-1.5 sm:w-auto">
            <p className="text-sm text-muted-foreground">Decision time, UK, day before delivery</p>
            <PillToggle
              label="Decision time"
              value={String(decisionHour)}
              onChange={(v) => changeDecisionHour(Number(v))}
              options={DECISION_TIMES}
              className="w-full sm:w-auto"
            />
          </div>
        </motion.header>

        <Tabs value={tab} onValueChange={(v) => changeTab(v as Tab)} className="mb-6">
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

        <main className={`flex-1 transition-opacity duration-300 ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {tab === "day" ? (
                  <DayPanel day={day} decisionHour={decisionHour} onDayChange={changeDay} />
                ) : (
                  <Suspense fallback={<AccuracySkeleton />}>
                    <AccuracyPanel decisionHour={decisionHour} onPickDay={openDay} />
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
    </MotionConfig>
  );
}

function PilotRange() {
  const meta = use(api.meta());
  return <>Pilot covering purchase decisions made in January 2026 (delivery {shortDay(meta.first_day)} to {shortDay(meta.last_day)}).</>;
}
