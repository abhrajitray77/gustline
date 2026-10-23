"""Download the January 2026 data once and save it next to the app.

Purchase decisions made in January 2026 cover delivery days 2 Jan to 1 Feb.
Forecasts are kept from a few days earlier so we can also measure how
accuracy changes with lead time (WINDFOR looks about 3 days ahead).

Run from the backend folder:  python -m scripts.fetch_data
"""

from datetime import date, datetime, timezone

import pandas as pd

from app.config import ACTUALS_FILE, DATA_DIR, FORECASTS_FILE
from app.elexon import fetch_actuals, fetch_forecasts

# One extra day on each side covers the UK/UTC boundary.
ACTUALS_FROM = date(2026, 1, 1)
ACTUALS_TO = date(2026, 2, 2)
FORECASTS_FROM = datetime(2025, 12, 28, tzinfo=timezone.utc)
FORECASTS_TO = datetime(2026, 2, 2, tzinfo=timezone.utc)


def main() -> None:
    DATA_DIR.mkdir(exist_ok=True)

    actuals = pd.DataFrame(fetch_actuals(ACTUALS_FROM, ACTUALS_TO))
    actuals = actuals.drop_duplicates("start_time").sort_values("start_time")
    actuals.to_csv(ACTUALS_FILE, index=False)
    print(f"actuals:   {len(actuals):>6} rows -> {ACTUALS_FILE.name}")

    forecasts = pd.DataFrame(fetch_forecasts(FORECASTS_FROM, FORECASTS_TO))
    forecasts = forecasts.drop_duplicates(["publish_time", "start_time"])
    forecasts = forecasts.sort_values(["start_time", "publish_time"])
    forecasts.to_csv(FORECASTS_FILE, index=False)
    print(f"forecasts: {len(forecasts):>6} rows -> {FORECASTS_FILE.name}")


if __name__ == "__main__":
    main()
