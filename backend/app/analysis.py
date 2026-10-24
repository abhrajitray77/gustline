"""Forecast selection and accuracy maths.

The key idea: a trader buys power for delivery day D on the morning of D-1,
before the day-ahead auction closes. For every hour of D, the forecast that
mattered is the latest one published before that decision time. Newer
forecasts exist, but the trader could not have used them.

Error convention: error = actual - forecast (MW).
Negative error means less wind than forecast, a shortfall the trader has to
cover by buying more power.
"""

from dataclasses import dataclass

import numpy as np
import pandas as pd

from app.config import BIAS_WINDOW_DAYS, UK_TZ


@dataclass
class Dataset:
    actuals: pd.DataFrame  # start_time (UTC), generation, half-hourly
    forecasts: pd.DataFrame  # publish_time, start_time (UTC), generation, hourly


def load(actuals_path, forecasts_path) -> Dataset:
    actuals = pd.read_csv(actuals_path, parse_dates=["start_time"])
    forecasts = pd.read_csv(forecasts_path, parse_dates=["publish_time", "start_time"])
    return Dataset(actuals=actuals, forecasts=forecasts)


def hourly_actuals(actuals: pd.DataFrame) -> pd.Series:
    """Average the two half-hours in each hour so actuals match the hourly forecasts."""
    return actuals.set_index("start_time")["generation"].resample("1h").mean().dropna()


def delivery_day(times: pd.Series) -> pd.Series:
    """UK calendar day a UTC timestamp falls in."""
    return times.dt.tz_convert(UK_TZ).dt.tz_localize(None).dt.normalize()


def decision_time(day: pd.Series, decision_hour: float) -> pd.Series:
    """Decision moment (UTC) for each delivery day: decision_hour UK time on the day before."""
    local = day - pd.Timedelta(days=1) + pd.to_timedelta(decision_hour, unit="h")
    return local.dt.tz_localize(UK_TZ).dt.tz_convert("UTC")


def forecasts_at_decision(
    forecasts: pd.DataFrame, first_day: str, last_day: str, decision_hour: float
) -> pd.DataFrame:
    """For each target hour in the delivery window, the latest forecast known at decision time."""
    f = forecasts.copy()
    f["day"] = delivery_day(f["start_time"])
    f = f[(f["day"] >= first_day) & (f["day"] <= last_day)]
    f["decided_at"] = decision_time(f["day"], decision_hour)
    f = f[f["publish_time"] <= f["decided_at"]]

    latest = f.loc[f.groupby("start_time")["publish_time"].idxmax()]
    latest = latest.assign(lead_hours=(latest["start_time"] - latest["publish_time"]).dt.total_seconds() / 3600)
    return latest[["start_time", "day", "publish_time", "generation", "lead_hours"]].rename(
        columns={"generation": "forecast"}
    )


def with_actuals(selected: pd.DataFrame, actual_hourly: pd.Series) -> pd.DataFrame:
    joined = selected.join(actual_hourly.rename("actual"), on="start_time").dropna(subset=["actual"])
    return joined.assign(error=joined["actual"] - joined["forecast"])


def with_bias_correction(joined: pd.DataFrame, window_days: int = BIAS_WINDOW_DAYS) -> pd.DataFrame:
    """Add a bias corrected forecast, using only what the desk knew at decision time.

    For delivery day D the desk decides on the morning of D-1, so the last day with complete
    actuals is D-2. The correction is the average error over the last `window_days` complete days.
    Early days with no history get no correction (NaN), and the corrected forecast equals the raw one.
    """
    daily_bias = joined.groupby("day")["error"].mean()
    all_days = pd.date_range(daily_bias.index.min(), daily_bias.index.max(), freq="D")
    known = daily_bias.reindex(all_days).shift(2)  # day D only sees days up to D-2
    correction = known.rolling(window_days, min_periods=1).mean()

    out = joined.join(correction.rename("correction"), on="day")
    corrected = (out["forecast"] + out["correction"].fillna(0)).clip(lower=0)
    return out.assign(corrected=corrected, corrected_error=out["actual"] - corrected)


def summary(errors: pd.Series, actual: pd.Series) -> dict:
    """Headline accuracy numbers for a set of hourly errors."""
    shortfall = (-errors).clip(lower=0)
    return {
        "hours": int(errors.size),
        "mae": float(errors.abs().mean()),
        "rmse": float(np.sqrt((errors**2).mean())),
        "bias": float(errors.mean()),
        # Error as a share of the wind that actually turned up. Safer than MAPE,
        # which explodes in calm hours when actual wind is near zero.
        "wape": float(errors.abs().sum() / actual.sum()),
        "p10_error": float(errors.quantile(0.10)),
        "p90_error": float(errors.quantile(0.90)),
        # Extra MW to hold back so wind shortfall is covered 90% / 95% of hours.
        "buffer_p90": float(shortfall.quantile(0.90)),
        "buffer_p95": float(shortfall.quantile(0.95)),
        "mean_actual": float(actual.mean()),
    }


def by_hour_of_day(joined: pd.DataFrame) -> list[dict]:
    hour = joined["start_time"].dt.tz_convert(UK_TZ).dt.hour
    grouped = joined.groupby(hour)["error"]
    return [
        {"hour": int(h), "mae": float(g.abs().mean()), "bias": float(g.mean())}
        for h, g in grouped
    ]


def by_lead_time(forecasts: pd.DataFrame, actual_hourly: pd.Series, first_day: str, last_day: str) -> list[dict]:
    """How error grows with lead time, using every forecast for the delivery window."""
    f = forecasts.copy()
    f["day"] = delivery_day(f["start_time"])
    f = f[(f["day"] >= first_day) & (f["day"] <= last_day)]
    f = f.join(actual_hourly.rename("actual"), on="start_time").dropna(subset=["actual"])
    lead = (f["start_time"] - f["publish_time"]).dt.total_seconds() / 3600
    bucket = (lead // 6 * 6).astype(int)
    error = f["actual"] - f["generation"]
    rows = []
    for start, g in error.groupby(bucket):
        # Skip negative leads and the thin tail where only a handful of forecasts reach.
        if start < 0 or g.size < 100:
            continue
        rows.append(
            {
                "lead_from": int(start),
                "lead_to": int(start + 6),
                "mae": float(g.abs().mean()),
                "rmse": float(np.sqrt((g**2).mean())),
                "samples": int(g.size),
            }
        )
    return rows


def histogram(errors: pd.Series, width: int = 500) -> list[dict]:
    edges = np.arange(np.floor(errors.min() / width) * width, errors.max() + width, width)
    counts, edges = np.histogram(errors, bins=edges)
    return [{"low": float(a), "high": float(b), "count": int(c)} for a, b, c in zip(edges[:-1], edges[1:], counts)]


def daily(joined: pd.DataFrame) -> list[dict]:
    rows = []
    for day, g in joined.groupby("day"):
        worst = g.loc[g["error"].idxmin()]
        rows.append(
            {
                "day": day.strftime("%Y-%m-%d"),
                "mae": float(g["error"].abs().mean()),
                "bias": float(g["error"].mean()),
                "forecast_mwh": float(g["forecast"].sum()),
                "actual_mwh": float(g["actual"].sum()),
                "worst_shortfall": float(-worst["error"]) if worst["error"] < 0 else 0.0,
                "worst_hour": worst["start_time"].isoformat(),
            }
        )
    return rows
