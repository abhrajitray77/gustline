import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { day } from "../test/fixtures";
import { WhatHappened } from "./WhatHappened";

describe("WhatHappened", () => {
  it("gives the verdict in words", () => {
    render(<WhatHappened data={day} />);
    // 17,100 MWh against 18,000 MWh forecast is 5% under.
    expect(screen.getByText("Forecast ran 5% high")).toBeInTheDocument();
  });

  it("adds up the energy the desk had to buy and the spare", () => {
    render(<WhatHappened data={day} />);
    // Short 1,000 + 300 MWh, spare 400 MWh.
    expect(screen.getByText("1.3 GWh")).toBeInTheDocument();
    expect(screen.getByText("0.4 GWh")).toBeInTheDocument();
  });

  it("names the worst hour", () => {
    render(<WhatHappened data={day} />);
    expect(screen.getByText("1,000 MW")).toBeInTheDocument();
    expect(screen.getByText("Short at 10:00")).toBeInTheDocument();
  });
});
