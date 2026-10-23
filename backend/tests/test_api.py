"""End to end checks of the API on the real January data."""

import pytest


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_meta_lists_every_delivery_day(client):
    meta = client.get("/api/meta").json()
    assert meta["first_day"] == "2026-01-02"
    assert meta["last_day"] == "2026-02-01"
    assert len(meta["days"]) == 31
    assert meta["timezone"] == "Europe/London"


def test_accuracy_has_one_value_per_delivery_hour(client):
    data = client.get("/api/accuracy").json()
    summary = data["summary"]

    assert summary["hours"] == 31 * 24
    assert len(data["by_hour"]) == 24
    assert len(data["daily"]) == 31
    assert sum(b["count"] for b in data["histogram"]) == summary["hours"]
    # RMSE is never below MAE, and the reserve for 95% cover is at least the one for 90%.
    assert summary["rmse"] >= summary["mae"] > 0
    assert summary["buffer_p95"] >= summary["buffer_p90"] >= 0


def test_lead_time_buckets_are_ordered(client):
    leads = client.get("/api/accuracy").json()["by_lead"]
    starts = [b["lead_from"] for b in leads]
    assert starts == sorted(starts)
    assert all(b["lead_to"] - b["lead_from"] == 6 for b in leads)


def test_decision_time_changes_the_forecast_used(client):
    # The 09:30 forecast is published after 09:00 but before 09:45.
    at_nine = client.get("/api/day/2026-01-15", params={"decision_hour": 9}).json()
    at_quarter_to_ten = client.get("/api/day/2026-01-15", params={"decision_hour": 9.75}).json()
    assert at_nine["decided_with"] == "2026-01-14T07:30:00+00:00"
    assert at_quarter_to_ten["decided_with"] == "2026-01-14T09:30:00+00:00"


def test_day_view_shape(client):
    day = client.get("/api/day/2026-01-15").json()
    assert len(day["hours"]) == 24
    assert len(day["actual_half_hourly"]) == 48
    assert all(h["low"] <= h["forecast"] <= h["high"] for h in day["hours"])
    assert day["forecast_mwh"] == pytest.approx(sum(h["forecast"] for h in day["hours"]))


def test_older_forecasts_were_all_published_before_the_one_used(client):
    day = client.get("/api/day/2026-01-15").json()
    assert all(f["publish_time"] < day["decided_with"] for f in day["earlier"])


@pytest.mark.parametrize("day", ["2026-01-01", "2026-02-02"])
def test_days_outside_the_pilot_are_not_found(client, day):
    assert client.get(f"/api/day/{day}").status_code == 404


@pytest.mark.parametrize("path", ["/api/day/banana", "/api/day/2026-13-01", "/api/accuracy?decision_hour=30"])
def test_bad_input_is_rejected(client, path):
    assert client.get(path).status_code == 422
