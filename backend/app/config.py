from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
ACTUALS_FILE = DATA_DIR / "actuals.csv.gz"
FORECASTS_FILE = DATA_DIR / "forecasts.csv.gz"

# GB market times are in UK local time, the data is in UTC.
UK_TZ = "Europe/London"

# Delivery days covered by purchase decisions made in January 2026.
FIRST_DELIVERY_DAY = "2026-01-02"
LAST_DELIVERY_DAY = "2026-02-01"

# The GB day-ahead auctions close around 09:20 (EPEX) and 09:50 (N2EX) UK time
# on the day before delivery. By default the trader decides at 09:00.
DEFAULT_DECISION_HOUR = 9
