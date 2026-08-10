# Credit Risk — Underwriting Desk

Enterprise-grade AI-powered credit risk assessment dashboard. Fill in an application, get an
APPROVED/REJECTED decision with SHAP-driven factor analysis and a plain-language explanation
(IBM Granite 4.1 3B, running locally through Ollama).

```
credit-risk-ui/        Next.js frontend (application form + decision dashboard)
credit-risk-backend/   FastAPI backend (model inference, SHAP, LLM explanation)
```

## Why two parts

The trained model (`best_model.pkl`) is a Python object — LightGBM, CatBoost, or XGBoost, saved
via joblib. Next.js can't load that directly, so a local API bridges the UI and the model. Both
run on your machine; nothing leaves it.

## Setup

### 1. Prerequisites

- **Python 3.12** (recommended; Python 3.13 has dependency compatibility gaps with shap/numba)
- **Node.js 20+**
- **Ollama** installed and running
- **[uv](https://docs.astral.sh/uv/)** — Python package manager

### 2. Model artifacts

Run `credit_risk_ML_v3.ipynb` first — it produces `model_outputs/`. Copy that folder into the
backend directory:

```bash
cp -r /path/to/model_outputs credit-risk-backend/
```

### 3. Ollama

```bash
ollama pull granite4.1:3b
ollama list  # verify it's available
```

### 4. Backend

```bash
cd credit-risk-backend
uv sync
uv run serve
```

Verify: `curl http://localhost:8000/health` should return the model name and test AUC.

### 5. Frontend (separate terminal)

```bash
cd credit-risk-ui
npm install
npm run dev
```

Open **http://localhost:3000**.

## Features

### Application Form
- Three sections: Loan Details, Credit Profile, Employment
- Derived features panel updates in real time as you type
- Inputs include currency, percentages, selectable grades, and categorical fields

### Decision Dashboard
After submitting, the result page shows:

- **Decision card** — large APPROVED or REJECTED badge with confidence level
- **Probability gauge** — animated progress bar with red/orange/green color zones and threshold marker
- **Application summary** — key fields in a structured data table
- **Top 10 SHAP factors** — diverging contribution bars showing which features pushed the model toward approval or rejection, with percentage coverage
- **AI explanation** — Granite 4.1 3B writes a plain-language assessment rationale from the SHAP table
- **Improvement recommendations** — actionable suggestions to strengthen the application
- **Download PDF** — print-optimized export of the full decision report
- **Back** and **New Application** navigation

## Config

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL (frontend) |
| `MODEL_DIR` | `model_outputs` | Path to model artifacts (backend) |
| `OLLAMA_MODEL` | `granite4.1:3b` | Ollama model name (backend) |

## Notes

- **Threshold**: tuned assuming false-accept costs 5× a false-decline. If a non-LightGBM model won
  the comparison, falls back to 0.5.
- **Risk grade isn't monotonic** — AA historically approves at lower rates than BB/CC/DD. Don't
  read the grade as a simple ranking.
- **Not adverse-action reasons** — the explanation describes what the model weighted, not a
  compliant regulatory disclosure. Keep a human in the loop and route through compliance before
  customer-facing use.
