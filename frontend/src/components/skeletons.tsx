// Loading placeholders shaped like the real sections, so nothing jumps when data arrives.
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatRowSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading figures">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} size="sm" className="min-h-32 gap-2.5 px-4 py-4 md:px-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3.5 w-40 max-w-full" />
        </Card>
      ))}
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <Card className="flex-row items-center gap-4 p-5 md:p-6" aria-busy="true" aria-label="Loading summary">
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      <div className="hidden gap-8 md:flex">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// A chart area: faint bars rising from the baseline, so it reads as "a chart is coming".
export function ChartSkeleton({ height = "h-80 md:h-96" }: { height?: string }) {
  const bars = [38, 52, 46, 64, 58, 72, 66, 80, 70, 62, 74, 56, 48, 60, 44, 36];
  return (
    <div className={cn("flex items-end gap-1.5 border-b pb-px", height)} aria-busy="true" aria-label="Loading chart">
      {bars.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

export function PanelSkeleton({ height, className }: { height?: string; className?: string }) {
  return (
    <Card className={cn("gap-5 px-5 py-5 md:px-6 md:py-6", className)}>
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <ChartSkeleton height={height} />
    </Card>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-px overflow-hidden rounded-xl border" aria-busy="true" aria-label="Loading table">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-3 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="hidden h-4 w-28 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function DayNavSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="h-6 w-56" />
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="size-9 rounded-full" />
    </div>
  );
}

export function AccuracySkeleton() {
  return (
    <div className="space-y-5">
      <StatRowSkeleton />
      <Card className="gap-3 px-5 py-5 md:px-6 md:py-6">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <PanelSkeleton height="h-64" />
        <PanelSkeleton height="h-64" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <PanelSkeleton height="h-64" />
        <PanelSkeleton height="h-64" />
      </div>
    </div>
  );
}
