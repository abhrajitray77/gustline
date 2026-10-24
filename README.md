# Gustline

[![CI](https://github.com/abhrajitray77/gustline/actions/workflows/ci.yml/badge.svg)](https://github.com/abhrajitray77/gustline/actions/workflows/ci.yml)

A day-ahead wind outlook for a GB energy supplier's trading desk. It answers two questions:

1. **What wind forecast did we have when we had to buy?** For each delivery day it shows the latest national wind forecast published before the day-ahead decision time, with older forecasts and a likely range around it.
2. **How far can we trust it?** It measures the forecast against actual wind over the pilot period and turns the error into a reserve figure the desk can act on.

The pilot covers purchase decisions made in January 2026, so delivery days 2 January to 1 February 2026.

**Live app:** https://gustline.vercel.app (API docs at https://gustline.vercel.app/api/docs)

## How it works

### Data

Both datasets come from the public Elexon BMRS API (no key needed).

| Dataset | What it is | Resolution |
| --- | --- | --- |
| `FUELHH`, fuel type `WIND` | Actual national wind generation | Half-hourly |
| `WINDFOR` | National wind forecast, re-published 8 times a day (02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30, 22:30 UK) | Hourly, about 3 days ahead |

`backend/scripts/fetch_data.py` downloads the window once and saves it as compressed CSV in `backend/data/`. The API reads those files at startup, so requests never wait on Elexon and the deployed app works even if Elexon is down.

### Picking the forecast that mattered

The GB day-ahead auctions close at about 09:20 (EPEX) and 09:50 (N2EX) UK time on the day before delivery. For every delivery hour, the app takes the **latest forecast published before the decision time on the day before**. Newer forecasts exist, but the desk could not have used them, so judging the forecast with them would flatter it.

The decision time is a setting in the app (06:00, 09:00, 09:45, 12:00 UK). 09:00 is the default, which uses the 07:30 forecast. Because a new forecast lands at 09:30, a desk trading on N2EX (closing 09:50) can act on a fresher forecast than one trading on EPEX (closing 09:20).

Two other details:

- **Delivery days are UK calendar days** and decision times are UK local time, converted to UTC with the proper time zone so the logic stays right across clock changes.
- **Actuals are averaged to hourly** (the two half-hours in each hour) to match the hourly forecasts.

### Accuracy measures

Error is `actual - forecast` in MW. A negative error is a shortfall the desk has to cover by buying more.

| Measure | Why it is there |
| --- | --- |
| MAE | Typical size of a miss, in MW |
| RMSE | Weights big misses more, and big misses are what cost money |
| Bias | Whether the forecast leans high or low |
| WAPE | Error as a share of the wind that turned up. Used instead of MAPE, which blows up in calm hours |
| Reserve (P90, P95) | The 90th and 95th percentile of shortfall: how much extra to buy to be covered in 9 or 19 of every 20 hours |
| Error by lead time | Every forecast in the window, grouped by hours ahead, to show how accuracy falls with lead time |
| Error by hour of day, daily error | Where and when the forecast struggles |

### What January showed

At the 09:00 decision time:

- The forecast ran **about 1.7 GW too high on average** and would have left the desk short in about 85% of hours if taken at face value. A likely cause is that actual metered output falls when wind farms are paid to turn down during grid congestion, which the forecast does not include. That needs confirming with more data.
- Holding about **4.1 GW** of reserve on top of the forecast would have covered the shortfall in 9 of 10 hours, and **5.3 GW** in 19 of 20.
- Error grows by about 43% from the freshest forecasts to ones made 60 hours ahead.
- A simple bias correction helps. Each morning, add the average miss of the last 7 delivery days the desk could already see (days up to D-2 for delivery day D, so nothing from the future). That cuts the typical error from 2,039 to 1,687 MW (17%) and the reserve for 90% cover from 4.1 to 3.3 GW. It helps on 19 of 31 days and hurts right after the wind changes regime. The app shows it as a toggle on the chart and as a comparison on the accuracy tab.

## Project layout

```
.
├── .github/workflows/ci.yml  Runs every test, lint, type check and the Docker build on each push
├── api/index.py              Vercel entry point, exposes the FastAPI app as a Python function
├── backend/
│   ├── app/
│   │   ├── main.py           FastAPI routes: /api/meta, /api/accuracy, /api/day/{day}
│   │   ├── analysis.py       Forecast selection and accuracy maths (pandas)
│   │   ├── schemas.py        Pydantic response models
│   │   ├── elexon.py         Small client for the two Elexon endpoints
│   │   └── config.py         Pilot window, file paths, default decision time
│   ├── scripts/fetch_data.py Downloads and saves the January 2026 data
│   ├── data/                 Saved data (compressed CSV)
│   ├── tests/                Analysis unit tests, API tests and checks on the saved data
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx           Layout, decision time setting, tabs
│   │   ├── api.ts            Typed API client
│   │   ├── format.ts         Number and UK time formatting
│   │   ├── components/       DayPanel (decision day), AccuracyPanel, DataTable, common building blocks
│   │   ├── components/ui/    shadcn/ui components (Radix based), added with the shadcn CLI
│   │   └── test/             Test setup and a small sample day used by the tests
│   ├── nginx.conf            Serves the build and forwards /api in Docker
│   └── Dockerfile
├── docker-compose.yml
├── requirements.txt          Python dependencies (used by Docker and Vercel)
├── requirements-dev.txt
└── vercel.json
```

## Running it

### With Docker

```bash
docker compose up --build
```

Open http://localhost:8080. Interactive API docs are at http://localhost:8080/api/docs (the API itself also runs on http://localhost:8000).

### Without Docker

Backend (Python 3.12):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cd backend
uvicorn app.main:app --reload --port 8000
```

Frontend (Node 20+), in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server forwards `/api` to port 8000.

### Tests

```bash
# Backend: forecast selection, metrics, every API endpoint, and checks on the saved data
cd backend
pytest

# Frontend: formatting, chart maths, table sorting, the daily summary card, theme toggle
cd frontend
npm test
```

The same checks, plus lint, the TypeScript build and the Docker build, run on GitHub Actions for every push (see the badge above).

### Refreshing the data

```bash
cd backend
python -m scripts.fetch_data
```

## Deployment

Deployed on Vercel at https://gustline.vercel.app. `vercel.json` builds the React app as static files and runs `api/index.py` as a Python function that serves the FastAPI app, with the saved data included. Requests to `/api/*` go to the function, everything else to the static app.

## Next steps

- Load the latest forecast automatically each morning and show tomorrow, not just the pilot window.
- Break the bias down to confirm the curtailment explanation, and replace the simple 7 day bias correction with one that adapts faster (for example by hour of day and wind level).
- Add solar and demand forecasts so the desk sees the full residual demand it needs to buy for.

## Use of AI tools

I used Claude Code (Anthropic) as a pair programmer while building this, for scaffolding, writing parts of the code and tests, and reviewing the analysis. I checked the approach and the numbers against the raw Elexon data myself, and I can explain every part of the code.
