"""Checks on the saved January files, so a bad data refresh fails loudly."""

import pandas as pd

from app import analysis
from app.config import ACTUALS_FILE, DEFAULT_DECISION_HOUR, FIRST_DELIVERY_DAY, FORECASTS_FILE, LAST_DELIVERY_DAY

DATA = analysis.load(ACTUALS_FILE, FORECASTS_FILE)


def delivery_hours() -> pd.DatetimeIndex:
    """Every hour of every delivery day in the pilot, in UTC."""
    start = pd.Timestamp(FIRST_DELIVERY_DAY, tz=analysis.UK_TZ)
    end = pd.Timestamp(LAST_DELIVERY_DAY, tz=analysis.UK_TZ) + pd.Timedelta(days=1)
    return pd.date_range(start, end, freq="1h", inclusive="left").tz_convert("UTC")


def test_actuals_cover_every_delivery_hour():
    hourly = analysis.hourly_actuals(DATA.actuals)
    missing = delivery_hours().difference(hourly.index)
    assert missing.empty, f"no actuals for {list(missing[:5])}"


def test_a_forecast_was_available_for_every_delivery_hour():
    picked = analysis.forecasts_at_decision(DATA.forecasts, FIRST_DELIVERY_DAY, LAST_DELIVERY_DAY, DEFAULT_DECISION_HOUR)
    missing = delivery_hours().difference(pd.DatetimeIndex(picked["start_time"]))
    assert missing.empty, f"no forecast for {list(missing[:5])}"


def test_generation_values_are_plausible():
    # GB wind is between zero and roughly 30 GW. Anything else means a parsing problem.
    for frame in (DATA.actuals, DATA.forecasts):
        assert frame["generation"].between(0, 30_000).all()


def test_no_duplicate_rows():
    assert not DATA.actuals["start_time"].duplicated().any()
    assert not DATA.forecasts.duplicated(["publish_time", "start_time"]).any()
