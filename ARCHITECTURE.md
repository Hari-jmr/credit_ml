# Credit Risk Assessment Application — Architecture & Hosting Guide

> **Prepared for:** Management Review  
> **Date:** 2026-08-20  
> **Repository:** https://github.com/Hari-jmr/credit_ml.git  
> **Branch:** `main` (latest commit `06295a2`)

---

## 1. Executive Summary

This is a **standalone, two-tier application** that provides AI-powered credit risk assessment. It accepts loan application data through a modern web form, processes it through a machine learning model (CatBoost), and returns an **APPROVED/REJECTED** decision along with:

- Approval probability with visual gauge
- SHAP-based factor analysis (which features pushed the decision and by how much)
- Plain-language AI explanation (template-based by default, optional LLM via Ollama)
- Actionable recommendations for improvement
- PDF export capability

The application is **not built on Profitto's technology stack**. It uses a modern, independent stack (Next.js + React + FastAPI + Python ML) but its UI was designed to match Profitto's visual design language so it can be embedded or served alongside Profitto seamlessly.

---

## 2. Source Code

| Item | Detail |
|---|---|
| **Repository** | https://github.com/Hari-jmr/credit_ml.git |
| **Branch** | `main` |
| **Latest Commit** | `06295a2` — fix prediction timeout |
| **Total Commits** | ~50 |
| **Lines of Code** | ~2,500 (backend ~500, frontend ~2,000) |
| **License** | Internal / Private |

### Repository Structure

```
credit-risk-app/
├── credit-risk-backend/          # Python FastAPI ML inference service
│   ├── app.py                    # API endpoints, ML pipeline, SHAP, explanations
│   ├── pyproject.toml            # Python dependencies (uv-managed)
│   ├── Dockerfile                # python:3.12-slim
│   ├── .env / .env.example       # Configuration
│   ── model_outputs/            # Pre-trained model artifacts (13 files)
│       ├── best_model.pkl        # CatBoost production model
│       ├── preprocessing_meta.json
│       ├── model_comparison.csv
│       └── ... (LGB, XGB, CB artifacts)
│
├── credit-risk-ui/               # Next.js frontend application
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── layout.tsx        # Root layout + theme toggle
│   │   │   ├── page.tsx          # Application form (26 fields)
│   │   │   ── result/page.tsx   # Decision dashboard
│   │   ├── components/           # 9 React components
│   │   └── lib/                  # API client, feature derivation
│   ├── package.json              # Next.js 16.3, React 19.2, Tailwind 4
│   ├── Dockerfile                # node:20-alpine (2-stage build)
│   └── .env.local                # Environment configuration
│
├── docker-compose.yml            # Orchestration for both services
├── DEPLOY.md                     # Oracle Linux deployment guide
└── README.md                     # Project documentation
```

---

## 3. Is This Built on Profitto's Stack?

**No. This is a completely standalone application.** It shares zero code, frameworks, or infrastructure with Profitto.

| Aspect | Profitto (existing system) | Credit Risk App (this project) |
|---|---|---|
| **Frontend** | Thymeleaf + jQuery + Bootstrap 3 | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| **Backend** | Java / Spring | Python 3.12 + FastAPI |
| **ML/AI** | None (rules-based) | CatBoost + SHAP + Ollama (Granite 4.1 3B) |
| **Database** | Yes (relational) | None (stateless) |
| **HTML mode** | Quirks mode (no DOCTYPE) | Modern HTML5 |
| **Font policy** | System fonts only (CSP strict) | Self-hosted IBM Plex fonts |
| **Navigation** | Left sidebar + breadcrumb | Single-page with header |

### Why the UI Looks Similar to Profitto

The frontend was **visually aligned** to Profitto's design specification (`Profitto-UI-UX-Design-Spec.docx`) so it can be:

1. **Embedded via iframe** inside Profitto's shell without visual jarring
2. **Served as a sibling app** behind the same Nginx reverse proxy with consistent branding
3. **Recognized by users** as part of the same product family

The alignment covers: color palette (emerald-teal accent), typography, spacing, 38px field heights, card radii, light/dark themes, and focus ring behavior. But the underlying code is entirely independent.

---

## 4. Application Architecture

### High-Level Diagram

```
─────────────────────────────────────────────────────────────────────┐
│                          User's Browser                              │
│                                                                       │
│  ┌─────────────────────┐    ┌──────────────────────┐                │
│  │  Application Form   │───▶│  Decision Dashboard   │                │
│  │  (/)                │    │  (/result)            │                │
│  │  26 input fields    │    │  SHAP bars, gauge,    │                │
│  │  3 sections         │    │  explanation, PDF     │                │
│  └──────────┬──────────┘    ──────────────────────┘                │
│             │                                                        │
│             │  POST /predict  (JSON, 26 fields)                     │
│             ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (Node.js 20, port 3535)                    │  │
│  │  - React 19, TypeScript, Tailwind CSS 4                      │  │
│  │  - Live derived feature computation (8 ratios/ordinals)      │  │
│  │  - Light/dark theme toggle (cookie-persisted)                │  │
│  │  - 30-second request timeout with AbortController            │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                      │
│                              │ HTTP POST /predict                  │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  FastAPI Backend (Python 3.12, port 5230)                    │  │
│  │                                                               │  │
│  │  ──────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │ CatBoost     │  │ SHAP         │  │ Ollama           │   │  │
│  │  │ Model        │  │ Explainer    │  │ (optional LLM)   │   │  │
│  │  │ (.pkl)       │  │ (Tree)       │  │ Granite 4.1 3B   │   │  │
│  │  ──────────────┘  └──────────────┘  └──────────────────┘   │  │
│  │                                                               │  │
│  │  Pipeline:                                                    │  │
│  │  1. build_features()     → 8 derived features + winsorization │  │
│  │  2. predict_proba()      → probability (CatBoost)             │  │
│  │  3. shap_drivers()       → top-10 SHAP contributions          │  │
│  │  4. explain_template/llm → plain-language explanation          │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────▼──────────────────────────────────┐  │
│  │  model_outputs/  (13 pre-trained artifact files)             │  │
│  │  - best_model.pkl         (CatBoost, ROC-AUC 0.7310)         │  │
│  │  - preprocessing_meta.json (winsorize caps, mappings)        │  │
│  │  - model_comparison.csv    (LGB vs CB vs XGB)                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow (Step by Step)

1. **User fills the form** — 26 fields across 3 sections (Loan Details, Credit Profile, Employment)
2. **Live derived features** — As the user types, 8 derived features are computed client-side and shown in the sidebar (EMI-to-income ratio, loan-to-income, affordability buffer, etc.)
3. **User clicks "Run Credit Assessment"** — All 26 fields are POSTed to `POST /predict` with a 30-second timeout
4. **Backend processes the request:**
   - **Feature engineering** — Replicates the training pipeline: drops irrelevant columns, clamps negatives, winsorizes outliers, computes 8 derived features
   - **Model inference** — CatBoost returns probability of approval (ROC-AUC: 0.7310 on test set)
   - **SHAP analysis** — TreeExplainer computes each feature's contribution to the decision; top 10 drivers returned with direction (towards approval / towards rejection)
   - **Explanation generation** — Template-based explanation (default, instant) OR Ollama LLM explanation (optional, requires GPU)
5. **Response returned to frontend** — Decision, probability, threshold, SHAP drivers, explanation text
6. **Result page renders** — Decision stamp, probability gauge, application summary, diverging SHAP bars, AI explanation, recommendations, PDF export button

### API Endpoints

| Method | Route | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/health` | Health check | — | Model name, ROC-AUC, threshold, Ollama status |
| GET | `/schema` | Field metadata | — | Tenure buckets, risk grades, winsorize caps |
| POST | `/predict` | Main prediction | 26-field JSON | Decision, probability, SHAP drivers, explanation |

---

## 5. Technology Stack

### Frontend

| Component | Version | Purpose |
|---|---|---|
| Next.js | 16.3.0 (App Router) | React framework, SSR/SSG |
| React | 19.2.8 | UI component library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Heroicons | 2.2.0 | SVG icon library |
| IBM Plex Fonts | Self-hosted .woff2 | Typography (Sans, Mono, Serif) |
| Node.js | 20 (Alpine in Docker) | Runtime |

### Backend

| Component | Version | Purpose |
|---|---|---|
| Python | 3.12 (3.10–3.13 supported) | Runtime |
| FastAPI | ≥ 0.115 | Web framework |
| Uvicorn | ≥ 0.32 | ASGI server |
| CatBoost | ≥ 1.2 | Production ML model (winner) |
| LightGBM | ≥ 4.5 | Alternative model (trained) |
| XGBoost | ≥ 2.1 | Alternative model (trained) |
| SHAP | ≥ 0.46 | Explainability |
| Ollama (Python) | ≥ 0.4 | LLM integration (optional) |
| pandas | ≥ 2.2 | Data manipulation |
| numpy | ≥ 1.26 | Numerical computing |
| joblib | ≥ 1.4 | Model serialization |
| uv | latest | Python package manager |

### ML Model Performance

| Model | ROC-AUC | Gini | KS Statistic | F1 | Precision | Recall | Accuracy |
|---|---|---|---|---|---|---|---|
| **CatBoost** (production) | **0.7310** | 0.4620 | 0.3438 | 0.8055 | 0.9268 | 0.7123 | 0.7012 |
| XGBoost | 0.7293 | 0.4587 | 0.3457 | 0.8153 | 0.9251 | 0.7288 | 0.7132 |
| LightGBM | 0.7283 | 0.4567 | 0.3407 | 0.8351 | 0.9218 | 0.7633 | 0.7382 |

CatBoost was selected as the production model due to the highest ROC-AUC.

### Model Features

- **22 raw input features**: LOAN_AMOUNT, loan_purpose, IS_SECURED, application_score, KSCORE, EMI, TENURE, INTEREST_RATE, DSR, UMI, lvr, total_exposure, annual_dsr, ANNUAL_COMMITMENT, EQUITY_CONTRIBUTION, AGE_OF_BUSINESS_OR_EMPLOYMENT, max_salary, max_benefits, emp_count, emp_sector, emp_position, emp_contract_type
- **8 derived features**: EMI_to_Income, loan_to_income, exposure_ratio, affordability_buffer, kscore_to_interest, employment_tenure_ordinal, loan_cycle_ordinal, risk_grade_ordinal
- **5 categorical features** (encoded natively by CatBoost): loan_purpose, emp_position, emp_contract_type, IS_SECURED, AGE_OF_BUSINESS_OR_EMPLOYMENT

---

## 6. Datasource

### No Database Required

This application is **fully stateless**. There is:

- **No database** — no PostgreSQL, MySQL, MongoDB, Redis, or any persistent store
- **No user authentication** — no login, sessions, or user management
- **No persistent storage** on the backend
- **In-memory only** — all state is ephemeral

### Data Sources

| Source | Purpose | Location | Notes |
|---|---|---|---|
| **Training data** | Used offline to train models | External (`credit_risk_ML_v3.ipynb`) | NOT in repository; produced model artifacts |
| **Model artifacts** | Pre-trained `.pkl` files | `credit-risk-backend/model_outputs/` | 13 files, ~50 MB total |
| **Preprocessing metadata** | Winsorize caps, categorical mappings | `model_outputs/preprocessing_meta.json` | Baked into the model pipeline |
| **User input** | 26 application fields | Entered via web form at runtime | Not stored; processed and discarded |

### Input Schema (26 Fields)

| # | Field | Type | Example | Section |
|---|---|---|---|---|
| 1 | LOAN_AMOUNT | number | 15000 | Loan Details |
| 2 | loan_purpose | string | "Working Capital" | Loan Details |
| 3 | LOAN_CYCLE | string | "02-Loan Cycle-2" | Loan Details |
| 4 | IS_SECURED | boolean | true | Loan Details |
| 5 | TENURE | number | 24 | Loan Details |
| 6 | INTEREST_RATE | number | 14.4 | Loan Details |
| 7 | EMI | number | 352.14 | Loan Details |
| 8 | total_exposure | number | 15000 | Loan Details |
| 9 | ANNUAL_COMMITMENT | number | 0 | Loan Details |
| 10 | EQUITY_CONTRIBUTION | number | 45000 | Loan Details |
| 11 | application_score | number | 700 | Credit Profile |
| 12 | OVERALL_RISK_RATING | string | "01-Low" | Credit Profile |
| 13 | SCORE_GRADE | string | "Grade B" | Credit Profile |
| 14 | RISK_GRADE | string | "BB" | Credit Profile |
| 15 | KSCORE | number | 1050 | Credit Profile |
| 16 | DSR | number | 47.5 | Credit Profile |
| 17 | annual_dsr | number | 106 | Credit Profile |
| 18 | UMI | number | 1610 | Credit Profile |
| 19 | lvr | number | 33.3 | Credit Profile |
| 20 | AGE_OF_BUSINESS_OR_EMPLOYMENT | string | "2 years - 5 years" | Employment |
| 21 | max_salary | number | 1800 | Employment |
| 22 | max_benefits | number | 200 | Employment |
| 23 | emp_count | number | 1 | Employment |
| 24 | emp_sector | number | 3 | Employment |
| 25 | emp_position | string | "Owner" | Employment |
| 26 | emp_contract_type | string | "Permanent" | Employment |

---

## 7. Application Server Requirements

### Minimum Server Specifications

| Resource | Requirement | Notes |
|---|---|---|
| **CPU** | 4 cores minimum, 8+ recommended | CatBoost inference is CPU-bound; SHAP computation benefits from multiple cores |
| **RAM** | 8 GB minimum, 16 GB recommended | CatBoost model ~200 MB, SHAP explainer ~500 MB, Python overhead, Node.js runtime |
| **Storage** | 10 GB minimum | Model artifacts ~50 MB, Docker images ~3 GB, OS + dependencies, logs |
| **Network** | Standard broadband | No high bandwidth needed; all processing is local |
| **OS** | Oracle Linux 8/9, Ubuntu 22.04+, RHEL 8/9, or any Linux with Python 3.12 + Node 20 | Windows not recommended for production |

### Software Dependencies

| Software | Version | Purpose | Required? |
|---|---|---|---|
| Python | 3.12 (recommended), 3.10–3.13 supported | Backend runtime | Yes |
| Node.js | 20.x | Frontend build and runtime | Yes |
| uv | latest (Astral) | Python package manager | Yes (replaces pip) |
| Docker | 24+ | Containerized deployment | Optional |
| Nginx | 1.24+ | Reverse proxy (production) | Recommended |
| Ollama | latest | LLM explanations | **Optional** (disabled by default) |

### If Using Ollama (Optional LLM Explanations)

| Resource | Requirement | Notes |
|---|---|---|
| **GPU** | NVIDIA GPU with 6+ GB VRAM (recommended) | Granite 4.1 3B runs on CPU but is slow; GPU enables real-time responses |
| **CUDA** | 12.x | Required for GPU acceleration |
| **Disk** | Additional ~2 GB for model weights | Downloaded via `ollama pull granite4.1:3b` |
| **Enabled via** | `USE_LLM=true` environment variable | Default is `false` (template explanations only) |

### Port Requirements

| Service | Port | Direction | Notes |
|---|---|---|---|
| Frontend (Next.js) | 3535 | Inbound (user-facing) | Configurable via `PORT` env var |
| Backend (FastAPI) | 5230 | Internal (frontend → backend) | Configurable via `API_PORT` env var |
| Ollama (if used) | 11434 | Internal (backend → Ollama) | Only needed if `USE_LLM=true` |
| Nginx (production) | 80 / 443 | Inbound (user-facing) | Reverse proxy to both services |

### Environment Variables

**Backend** (`credit-risk-backend/.env`):

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | 5230 | Backend listening port |
| `MODEL_DIR` | model_outputs | Path to model artifacts directory |
| `OLLAMA_MODEL` | granite4.1:3b | Ollama model name for LLM explanations |
| `ALLOWED_ORIGINS` | http://localhost:3535 | CORS allowed origins (comma-separated) |
| `USE_LLM` | false | Enable Ollama LLM explanations (`true`/`false`) |

**Frontend** (`credit-risk-ui/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3535 | Frontend listening port |
| `NEXT_PUBLIC_API_URL` | http://localhost:5230 | Backend API URL (baked at build time) |

---

## 8. Deployment Options

### Option A: Docker Compose (Recommended for Development & Quick Deploy)

**Single command to start everything:**

```bash
docker compose up --build -d
```

- Backend runs on port 5230 (host network mode to reach Ollama on host)
- Frontend runs on port 3535
- Both services auto-restart on failure
- No manual dependency installation needed

**`docker-compose.yml`:**

```yaml
services:
  backend:
    build: ./credit-risk-backend
    network_mode: host
    environment:
      - MODEL_DIR=model_outputs
      - OLLAMA_MODEL=granite4.1:3b
      - OLLAMA_HOST=http://localhost:11434
      - ALLOWED_ORIGINS=http://localhost:3535,http://192.168.0.166:3535
    restart: unless-stopped

  frontend:
    build:
      context: ./credit-risk-ui
      args:
        NEXT_PUBLIC_API_URL: http://192.168.0.166:5230
    ports:
      - "3535:3535"
    depends_on:
      - backend
    restart: unless-stopped
```

### Option B: systemd Services (Production on Linux)

Two systemd unit files manage the services:

**`credit-risk-backend.service`:**
```ini
[Unit]
Description=Credit Risk Backend API
After=network.target

[Service]
Type=simple
User=credit-risk
WorkingDirectory=/opt/credit-risk/credit-risk-backend
ExecStart=/opt/credit-risk/.venv/bin/uvicorn app:app --host 0.0.0.0 --port 5230 --workers 2
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**`credit-risk-ui.service`:**
```ini
[Unit]
Description=Credit Risk Frontend
After=network.target credit-risk-backend.service

[Service]
Type=simple
User=credit-risk
WorkingDirectory=/opt/credit-risk/credit-risk-ui
ExecStart=/usr/bin/node /opt/credit-risk/credit-risk-ui/node_modules/.bin/next start --port 3535
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**Nginx reverse proxy configuration:**
```nginx
server {
    listen 80;
    server_name credit-risk.example.com;

    location / {
        proxy_pass http://127.0.0.1:3535;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:5230;
        proxy_set_header Host $host;
    }

    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
}
```

### Option C: Embedded in Profitto (iframe)

The app can be served as a standalone page and embedded inside Profitto via iframe:

```html
<iframe src="http://credit-risk.example.com" 
        style="width:100%; height:100vh; border:none;"></iframe>
```

Since the UI matches Profitto's design spec, it blends seamlessly.

---

## 9. What the Training Notebook Produces

The training notebook (`credit_risk_ML_v3.ipynb`) is **not in this repository** (it exists externally). It produces the `model_outputs/` directory containing:

| File | Description |
|---|---|
| `best_model.json` | Metadata: winning algorithm, test ROC-AUC, threshold |
| `best_model.pkl` | Serialized CatBoost model (the production model) |
| `best_params.json` | Best hyperparameters from Optuna optimization |
| `model_comparison.csv` | Performance comparison across CatBoost, XGBoost, LightGBM |
| `preprocessing_meta.json` | Feature columns, categorical mappings, winsorize caps, risk grade mappings |
| `cb_model.pkl`, `cb_study.pkl`, `cb_test_predictions.csv` | CatBoost artifacts |
| `lgb_model.pkl`, `lgb_study.pkl`, `lgb_test_predictions.csv` | LightGBM artifacts |
| `xgb_model.pkl`, `xgb_study.pkl`, `xgb_test_predictions.csv` | XGBoost artifacts |

These 13 files (~50 MB total) must be copied into `credit-risk-backend/model_outputs/` before the backend can start.

---

## 10. Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Two-service split** (Next.js + FastAPI) | Next.js cannot load Python ML models directly; FastAPI bridges the UI and model |
| **All local processing** | Model inference and LLM calls stay on the local machine — no data leaves the server |
| **CatBoost as winner** | Highest ROC-AUC (0.7310) among three models trained and compared |
| **Template-first explanations** | LLM is opt-in (`USE_LLM=false` by default); template explanations are instant and reliable |
| **Cost-optimized threshold** | Threshold tuned assuming false-accept costs 5× a false-decline |
| **No database** | Entirely stateless; zero persistence needed for the prediction workflow |
| **30-second timeout** | Prevents indefinite hanging; fails fast with a clear error message |
| **Self-hosted fonts** | IBM Plex fonts served from the app itself; no CDN dependency |

---

## 11. Hosting Checklist

Before deploying to production, ensure:

- [ ] Python 3.12 installed and `uv` package manager available
- [ ] Node.js 20 installed
- [ ] `model_outputs/` directory populated with all 13 artifact files
- [ ] Backend `.env` configured (API_PORT, MODEL_DIR, ALLOWED_ORIGINS)
- [ ] Frontend `.env.local` configured (NEXT_PUBLIC_API_URL pointing to backend)
- [ ] Firewall allows inbound traffic on port 3535 (or 80/443 via Nginx)
- [ ] Ollama installed and `granite4.1:3b` pulled (only if `USE_LLM=true`)
- [ ] SSL certificate configured (if serving over HTTPS)
- [ ] systemd services enabled and started (or Docker Compose running)
- [ ] Health endpoint verified: `curl http://localhost:5230/health`

---

## 12. Contact

| Role | Detail |
|---|---|
| **Repository** | https://github.com/Hari-jmr/credit_ml.git |
| **Backend Port** | 5230 |
| **Frontend Port** | 3535 |
| **Health Check** | `GET /health` |
| **Prediction Endpoint** | `POST /predict` |
