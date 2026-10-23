"""Gustline API.

Data for the pilot (January 2026 decisions) is loaded once at startup from the
files saved by scripts/fetch_data.py, so requests never wait on Elexon.
"""

from functools import lru_cache

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import analysis
from app.config import (
    ACTUALS_FILE,
    DEFAULT_DECISION_HOUR,
    FIRST_DELIVERY_DAY,
    FORECASTS_FILE,
    LAST_DELIVERY_DAY,
    UK_TZ,
)
from app.schemas import Accuracy, DayView, Meta

# Docs live under /api so they work behind the same /api route on Vercel and in Docker.
app = FastAPI(title="Gustline API", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

DATA = analysis.load(ACTUALS_FILE, FORECASTS_FILE)
ACTUAL_HOURLY = analysis.hourly_actuals(DATA.actuals)

DecisionHour = Query(DEFAULT_DECISION_HOUR, ge=0, le=23.5, description="UK local hour on D-1 when the trader decides")


@lru_cache(maxsize=64)
def joined_for(decision_hour: float) -> pd.DataFrame:
    selected = analysis.forecasts_at_decision(DATA.forecasts, FIRST_DELIVERY_DAY, LAST_DELIVERY_DAY, decision_hour)
    return analysis.with_actuals(selected, ACTUAL_HOURLY)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/meta", response_model=Meta)
def meta() -> Meta:
    days = pd.date_range(FIRST_DELIVERY_DAY, LAST_DELIVERY_DAY, freq="D")
    return Meta(
        first_day=FIRST_DELIVERY_DAY,
        last_day=LAST_DELIVERY_DAY,
        days=[d.strftime("%Y-%m-%d") for d in days],
        default_decision_hour=DEFAULT_DECISION_HOUR,
        timezone=UK_TZ,
        forecast_count=int(DATA.forecasts["publish_time"].nunique()),
    )


@app.get("/api/accuracy", response_model=Accuracy)
def accuracy(decision_hour: float = DecisionHour) -> Accuracy:
    joined = joined_for(decision_hour)
    return Accuracy(
        decision_hour=decision_hour,
        summary=analysis.summary(joined["error"], joined["actual"]),
        by_hour=analysis.by_hour_of_day(joined),
        by_lead=analysis.by_lead_time(DATA.forecasts, ACTUAL_HOURLY, FIRST_DELIVERY_DAY, LAST_DELIVERY_DAY),
        histogram=analysis.histogram(joined["error"]),
        daily=analysis.daily(joined),
    )


@app.get("/api/day/{day}", response_model=DayView)
def day_view(day: str, decision_hour: float = DecisionHour) -> DayView:
    if not FIRST_DELIVERY_DAY <= day <= LAST_DELIVERY_DAY:
        raise HTTPException(404, f"Day must be between {FIRST_DELIVERY_DAY} and {LAST_DELIVERY_DAY}")

    joined = joined_for(decision_hour)
    today = joined[joined["day"] == day]
    if today.empty:
        raise HTTPException(404, "No data for that day")

    # Typical error across the whole pilot gives the uncertainty band for this day.
    stats = analysis.summary(joined["error"], joined["actual"])

    # Earlier forecasts for the same hours, to show how the outlook moved.
    hours = today["start_time"]
    decided_at = today["publish_time"].max()
    history = DATA.forecasts[
        DATA.forecasts["start_time"].isin(hours) & (DATA.forecasts["publish_time"] <= decided_at)
    ]
    earlier = [
        {
            "publish_time": publish.isoformat(),
            "points": [{"time": t.isoformat(), "forecast": float(v)} for t, v in zip(g["start_time"], g["generation"])],
        }
        for publish, g in history.groupby("publish_time")
        if publish < decided_at
    ]

    actual_half_hourly = DATA.actuals[
        (analysis.delivery_day(DATA.actuals["start_time"]) == day)
    ]

    return DayView(
        day=day,
        decision_hour=decision_hour,
        decided_with=decided_at.isoformat(),
        hours=[
            {
                "time": row.start_time.isoformat(),
                "forecast": float(row.forecast),
                "actual": float(row.actual),
                "error": float(row.error),
                "low": max(0.0, float(row.forecast + stats["p10_error"])),
                "high": float(row.forecast + stats["p90_error"]),
            }
            for row in today.itertuples()
        ],
        actual_half_hourly=[
            {"time": t.isoformat(), "actual": float(v)}
            for t, v in zip(actual_half_hourly["start_time"], actual_half_hourly["generation"])
        ],
        earlier=earlier,
        summary=analysis.summary(today["error"], today["actual"]),
        forecast_mwh=float(today["forecast"].sum()),
        actual_mwh=float(today["actual"].sum()),
        plan_mwh=float((today["forecast"] + stats["p10_error"]).clip(lower=0).sum()),
    )
