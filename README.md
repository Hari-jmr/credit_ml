# Credit Risk Assessment Application

Enterprise-grade AI-powered credit risk assessment dashboard. Fill in a loan application, get an
APPROVED/REJECTED decision with SHAP-driven factor analysis and a plain-language explanation
(IBM Granite 4.1 3B, running locally through Ollama).

```
credit-risk-ui/        Next.js frontend (application form + decision dashboard)
credit-risk-backend/   FastAPI backend (CatBoost inference, SHAP, LLM explanation)
```

## Why Two Services

The trained model (`best_model.pkl`) is a Python CatBoost object saved via joblib. Next.js (Node.js)
cannot load Python pickle files, so a FastAPI backend bridges the UI and the model. Both services
run locally — no data leaves the machine.

## Quick Start

### 1. Prerequisites

- **Python 3.12** (recommended; 3.10–3.13 supported)
- **Node.js 20+**
- **[uv](https://docs.astral.sh/uv/)** — Python package manager
- **Ollama** (optional, only if `USE_LLM=true`)

### 2. Backend

```bash
cd credit-risk-backend
uv sync
uv run uvicorn app:app --host 0.0.0.0 --port 5230
```

Verify: `curl http://localhost:5230/health` returns model name and test AUC.

### 3. Frontend (separate terminal)

```bash
cd credit-risk-ui
npm install
npm run dev
```

Open **http://localhost:3535**.

### 4. Docker (alternative)

```bash
docker compose up --build -d
```

- Frontend: http://localhost:3535
- Backend: http://localhost:5230

## Model Artifacts

The `credit-risk-backend/model_outputs/` directory contains pre-trained model files committed to
this repository. No external notebook is required to run the app.

| File | Purpose |
|---|---|
| `best_model.pkl` | Production CatBoost model (ROC-AUC 0.7310) |
| `preprocessing_meta.json` | Feature columns, winsorize caps, categorical mappings |
| `model_comparison.csv` | CatBoost vs XGBoost vs LightGBM performance |
| `best_model.json` | Winning model metadata |
| `*_model.pkl`, `*_study.pkl`, `*_predictions.csv` | Full training artifacts for all 3 models |

## Features

### Application Form (`/`)
- Three sections: Loan Details, Credit Profile, Employment (26 fields total)
- Derived features panel updates live as you type (8 ratios and ordinal mappings)
- Light/dark theme toggle with cookie persistence

### Decision Dashboard (`/result`)
After submission, the result page shows:

- **Decision stamp** — large APPROVED or REJECTED badge
- **Probability gauge** — color-zoned progress bar with threshold marker
- **Application summary** — key fields in a structured table
- **Top SHAP factors** — diverging bars showing which features pushed toward approval or rejection
- **AI explanation** — plain-language assessment rationale (template-based by default)
- **Recommendations** — actionable suggestions to improve approval chances
- **Download PDF** — print-optimized export of the full report

## Configuration

### Backend (`credit-risk-backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | 5230 | Backend listening port |
| `MODEL_DIR` | model_outputs | Path to model artifacts |
| `OLLAMA_MODEL` | granite4.1:3b | Ollama model for LLM explanations |
| `ALLOWED_ORIGINS` | http://localhost:3535 | CORS allowed origins |
| `USE_LLM` | false | Enable Ollama LLM explanations |

### Frontend (`credit-risk-ui/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3535 | Frontend listening port |
| `NEXT_PUBLIC_API_URL` | http://localhost:5230 | Backend API URL |

## ML Model Details

| Model | ROC-AUC | Gini | F1 | Precision | Recall |
|---|---|---|---|---|---|
| **CatBoost** (production) | **0.7310** | 0.4620 | 0.8055 | 0.9268 | 0.7123 |
| XGBoost | 0.7293 | 0.4587 | 0.8153 | 0.9251 | 0.7288 |
| LightGBM | 0.7283 | 0.4567 | 0.8351 | 0.9218 | 0.7633 |

- **30 total features**: 22 raw + 8 derived
- **5 categorical features** encoded natively by CatBoost
- **Decision threshold**: 0.5 (tuned for 5:1 false-accept vs false-decline cost ratio)

## API Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Model status, ROC-AUC, threshold |
| GET | `/schema` | Field metadata (tenure buckets, risk grades, winsorize caps) |
| POST | `/predict` | Main prediction: returns decision, probability, SHAP drivers, explanation |

## Notes

- **Risk grade isn't monotonic** — AA historically approves at lower rates than BB/CC/DD. Don't
  read the grade as a simple ranking.
- **Not adverse-action reasons** — the explanation describes what the model weighted, not a
  compliant regulatory disclosure. Keep a human in the loop and route through compliance before
  customer-facing use.
- **30-second request timeout** — the frontend fails fast if the backend doesn't respond, rather
  than hanging indefinitely.
