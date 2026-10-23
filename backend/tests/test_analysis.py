import pandas as pd
import pytest

from app import analysis


def utc(value: str) -> pd.Timestamp:
    return pd.Timestamp(value, tz="UTC")


def test_decision_time_is_day_before_in_uk_time():
    days = pd.Series(pd.to_datetime(["2026-01-15"]))
    assert analysis.decision_time(days, 9)[0] == utc("2026-01-14 09:00")


def test_decision_time_handles_british_summer_time():
    # In summer UK time is UTC+1, so 09:00 UK is 08:00 UTC.
    days = pd.Series(pd.to_datetime(["2026-07-15"]))
    assert analysis.decision_time(days, 9)[0] == utc("2026-07-14 08:00")


def test_picks_latest_forecast_published_before_decision():
    target = utc("2026-01-15 12:00")
    forecasts = pd.DataFrame(
        {
            "publish_time": [utc("2026-01-14 06:30"), utc("2026-01-14 08:30"), utc("2026-01-14 10:30")],
            "start_time": [target, target, target],
            "generation": [5000, 6000, 7000],
        }
    )
    picked = analysis.forecasts_at_decision(forecasts, "2026-01-15", "2026-01-15", decision_hour=9)

    # 10:30 was published after the 09:00 decision, so the trader could only use 08:30.
    assert picked["forecast"].tolist() == [6000]
    assert picked["publish_time"].tolist() == [utc("2026-01-14 08:30")]
    assert picked["lead_hours"].tolist() == [27.5]


def test_hourly_actuals_average_both_half_hours():
    actuals = pd.DataFrame(
        {"start_time": [utc("2026-01-15 12:00"), utc("2026-01-15 12:30")], "generation": [4000, 5000]}
    )
    assert analysis.hourly_actuals(actuals).tolist() == [4500]


def test_summary_numbers():
    errors = pd.Series([-100.0, 100.0, -300.0, 300.0])
    actual = pd.Series([1000.0, 1000.0, 1000.0, 1000.0])
    result = analysis.summary(errors, actual)

    assert result["mae"] == 200
    assert result["bias"] == 0
    assert result["rmse"] == pytest.approx(223.607, rel=1e-3)
    assert result["wape"] == 0.2
