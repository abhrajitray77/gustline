"""Thin client for the two Elexon BMRS datasets we use.

Both endpoints are public and need no API key:
- FUELHH  half-hourly actual generation by fuel type (we keep WIND only)
- WINDFOR hourly national wind forecasts, re-published every couple of hours
"""

from datetime import date, datetime, timedelta

import httpx

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

# Elexon rejects very wide ranges, so we ask for a week at a time.
CHUNK = timedelta(days=7)


def _get(client: httpx.Client, path: str, params: dict) -> list[dict]:
    response = client.get(f"{BASE_URL}/{path}", params=params, timeout=60)
    response.raise_for_status()
    return response.json()


def fetch_actuals(start: date, end: date) -> list[dict]:
    """Actual wind generation for settlement dates start..end (inclusive)."""
    rows: list[dict] = []
    with httpx.Client() as client:
        day = start
        while day <= end:
            chunk_end = min(day + CHUNK - timedelta(days=1), end)
            rows += _get(
                client,
                "FUELHH/stream",
                {
                    "settlementDateFrom": day.isoformat(),
                    "settlementDateTo": chunk_end.isoformat(),
                    "fuelType": "WIND",
                },
            )
            day = chunk_end + timedelta(days=1)
    return [{"start_time": r["startTime"], "generation": r["generation"]} for r in rows]


def fetch_forecasts(publish_from: datetime, publish_to: datetime) -> list[dict]:
    """Every wind forecast published between publish_from and publish_to."""
    rows: list[dict] = []
    with httpx.Client() as client:
        start = publish_from
        while start < publish_to:
            end = min(start + CHUNK, publish_to)
            rows += _get(
                client,
                "WINDFOR/stream",
                {
                    "publishDateTimeFrom": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "publishDateTimeTo": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
            )
            start = end
    return [
        {
            "publish_time": r["publishTime"],
            "start_time": r["startTime"],
            "generation": r["generation"],
        }
        for r in rows
    ]
