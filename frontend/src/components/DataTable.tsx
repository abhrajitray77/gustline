import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EASE } from "../theme";

export type Column<Row> = {
  key: string;
  header: string;
  align?: "left" | "right";
  // Value used for sorting. Columns without one cannot be sorted.
  sortValue?: (row: Row) => number | string;
  cell: (row: Row) => ReactNode;
};

type Props<Row> = {
  rows: Row[];
  columns: Column<Row>[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  initialSort?: { key: string; desc: boolean };
  maxHeight?: string;
};

const MotionRow = motion.create(TableRow);

// The first column stays put when a narrow screen scrolls the table sideways.
const STICKY = "sticky left-0 z-[1] bg-card";

// shadcn Table with sortable columns and a sticky header. Rows fade in one after another.
export function DataTable<Row>({ rows, columns, rowKey, onRowClick, initialSort, maxHeight = "28rem" }: Props<Row>) {
  const [sort, setSort] = useState(initialSort);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort?.key);
    if (!sort || !column?.sortValue) return rows;
    const value = column.sortValue;
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const order = x < y ? -1 : x > y ? 1 : 0;
      return sort.desc ? -order : order;
    });
  }, [rows, columns, sort]);

  const toggle = (key: string) => setSort((current) => (current?.key === key ? { key, desc: !current.desc } : { key, desc: true }));

  return (
    // shadcn's Table brings its own scroll wrapper, so this outer box only caps the height and keeps the header pinned.
    <div className="overflow-auto rounded-xl border [&_[data-slot=table-container]]:overflow-visible" style={{ maxHeight }}>
      <Table className="tabular">
        <TableHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur-md">
          <TableRow className="hover:bg-transparent">
            {columns.map((column, c) => {
              const active = sort?.key === column.key;
              const Icon = !active ? ArrowUpDown : sort!.desc ? ArrowDown : ArrowUp;
              return (
                <TableHead
                  key={column.key}
                  aria-sort={active ? (sort!.desc ? "descending" : "ascending") : undefined}
                  className={cn("px-3 text-xs tracking-wide text-faint uppercase", column.align === "right" && "text-right", c === 0 && STICKY)}
                >
                  {column.sortValue ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => toggle(column.key)}
                      className={cn("-mx-2 tracking-wide uppercase", active ? "text-foreground" : "text-faint")}
                    >
                      {column.header}
                      <Icon className={cn(!active && "opacity-40")} />
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row, i) => (
            <MotionRow
              key={rowKey(row)}
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: Math.min(i, 24) * 0.015 }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn("group", onRowClick && "cursor-pointer")}
            >
              {columns.map((column, c) => (
                <TableCell key={column.key} className={cn("px-3", column.align === "right" && "text-right", c === 0 && `${STICKY} group-hover:bg-muted`)}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </MotionRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// A value with a thin bar behind it, scaled against the column's max.
export function BarCell({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-grid sm:block">
        <motion.span
          className="block h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </span>
      <span className="min-w-20">{label}</span>
    </span>
  );
}

// A signed value with a bar growing left (negative) or right (positive) from a centre line.
export function DivergingCell({ value, max, label, negative, positive }: { value: number; max: number; label: string; negative: string; positive: string }) {
  const width = `${Math.min(50, (Math.abs(value) / max) * 50)}%`;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="relative hidden h-1.5 w-20 rounded-full bg-grid sm:block">
        <span className="absolute inset-y-0 left-1/2 w-px bg-axis" />
        <motion.span
          className="absolute inset-y-0 rounded-full"
          style={value < 0 ? { right: "50%", background: negative } : { left: "50%", background: positive }}
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </span>
      <span className={cn("min-w-20", value < 0 && "text-short")}>{label}</span>
    </span>
  );
}
