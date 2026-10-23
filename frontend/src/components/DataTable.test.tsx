import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type Column } from "./DataTable";

type Row = { name: string; value: number };

const rows: Row[] = [
  { name: "b", value: 2 },
  { name: "a", value: 3 },
  { name: "c", value: 1 },
];

const columns: Column<Row>[] = [
  { key: "name", header: "Name", sortValue: (r) => r.name, cell: (r) => r.name },
  { key: "value", header: "Value", align: "right", sortValue: (r) => r.value, cell: (r) => String(r.value) },
];

const firstColumn = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("DataTable", () => {
  it("starts in the given order", () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.name} initialSort={{ key: "name", desc: false }} />);
    expect(firstColumn()).toEqual(["a", "b", "c"]);
  });

  it("sorts by a column when its header is clicked, then flips", async () => {
    const user = userEvent.setup();
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.name} />);

    await user.click(screen.getByRole("button", { name: /value/i }));
    expect(firstColumn()).toEqual(["a", "b", "c"]); // values 3, 2, 1
    expect(screen.getByRole("columnheader", { name: /value/i })).toHaveAttribute("aria-sort", "descending");

    await user.click(screen.getByRole("button", { name: /value/i }));
    expect(firstColumn()).toEqual(["c", "b", "a"]);
    expect(screen.getByRole("columnheader", { name: /value/i })).toHaveAttribute("aria-sort", "ascending");
  });

  it("reports which row was clicked", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.name} onRowClick={onRowClick} />);

    await user.click(screen.getByText("c"));
    expect(onRowClick).toHaveBeenCalledWith({ name: "c", value: 1 });
  });
});
