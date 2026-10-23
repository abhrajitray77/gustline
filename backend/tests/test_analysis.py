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


def test_days_outside_the_window_are_left_out():
    forecasts = pd.DataFrame(
        {
            "publish_time": [utc("2026-01-14 06:30"), utc("2026-01-30 06:30")],
            "start_time": [utc("2026-01-15 12:00"), utc("2026-02-02 12:00")],
            "generation": [5000, 6000],
        }
    )
    picked = analysis.forecasts_at_decision(forecasts, "2026-01-02", "2026-02-01", decision_hour=9)
    assert picked["start_time"].tolist() == [utc("2026-01-15 12:00")]


def test_delivery_day_uses_uk_calendar_day():
    # 23:30 UTC on 30 June is 00:30 on 1 July in UK summer time.
    times = pd.Series([utc("2026-06-30 23:30")])
    assert analysis.delivery_day(times)[0] == pd.Timestamp("2026-07-01")


def test_reserve_covers_the_shortfall_in_nine_of_ten_hours():
    # Ten hours, shortfalls of 0 to 900 MW.
    errors = pd.Series([-100.0 * i for i in range(10)])
    actual = pd.Series([1000.0] * 10)
    result = analysis.summary(errors, actual)

    assert result["buffer_p90"] == pytest.approx(810)
    assert (-errors <= result["buffer_p90"]).mean() == 0.9
    assert result["bias"] < 0


def test_histogram_counts_every_hour():
    errors = pd.Series([-1200.0, -300.0, 0.0, 250.0, 900.0])
    bins = analysis.histogram(errors, width=500)
    assert sum(b["count"] for b in bins) == len(errors)
    assert all(b["high"] - b["low"] == 500 for b in bins)


def test_daily_reports_worst_shortfall():
    joined = pd.DataFrame(
        {
            "start_time": [utc("2026-01-15 10:00"), utc("2026-01-15 11:00")],
            "day": [pd.Timestamp("2026-01-15")] * 2,
            "forecast": [5000.0, 6000.0],
            "actual": [4000.0, 6500.0],
        }
    ).assign(error=lambda d: d["actual"] - d["forecast"])

    [day] = analysis.daily(joined)
    assert day["worst_shortfall"] == 1000
    assert day["worst_hour"].startswith("2026-01-15T10:00")
