"""Response shapes. FastAPI uses these to validate output and document the API at /docs."""

from pydantic import BaseModel


class Meta(BaseModel):
    first_day: str
    last_day: str
    days: list[str]
    default_decision_hour: float
    timezone: str
    forecast_count: int


class Summary(BaseModel):
    hours: int
    mae: float
    rmse: float
    bias: float
    wape: float
    p10_error: float
    p90_error: float
    buffer_p90: float
    buffer_p95: float
    mean_actual: float


class HourError(BaseModel):
    hour: int
    mae: float
    bias: float


class LeadError(BaseModel):
    lead_from: int
    lead_to: int
    mae: float
    rmse: float
    samples: int


class Bin(BaseModel):
    low: float
    high: float
    count: int


class DayStats(BaseModel):
    day: str
    mae: float
    bias: float
    forecast_mwh: float
    actual_mwh: float
    worst_shortfall: float
    worst_hour: str


class Accuracy(BaseModel):
    decision_hour: float
    summary: Summary
    by_hour: list[HourError]
    by_lead: list[LeadError]
    histogram: list[Bin]
    daily: list[DayStats]


class HourPoint(BaseModel):
    time: str
    forecast: float
    actual: float
    error: float
    low: float
    high: float


class ActualPoint(BaseModel):
    time: str
    actual: float


class ForecastPoint(BaseModel):
    time: str
    forecast: float


class EarlierForecast(BaseModel):
    publish_time: str
    points: list[ForecastPoint]


class DayView(BaseModel):
    day: str
    decision_hour: float
    decided_with: str
    hours: list[HourPoint]
    actual_half_hourly: list[ActualPoint]
    earlier: list[EarlierForecast]
    summary: Summary
    forecast_mwh: float
    actual_mwh: float
    plan_mwh: float
