"""
Credit risk prediction API.

Wraps the exact pipeline from predict.ipynb (build_features -> predict_proba -> shap_drivers ->
Ollama explanation) behind HTTP endpoints for the Next.js UI. Runs entirely locally: model
inference and the LLM call both stay on this machine.

Run:
    uvicorn app:app --reload --port 8000

Requires model_outputs/ (from credit_risk_ML_v3.ipynb) in the same directory as this file, and
`ollama pull granite4.1:3b` already done.
"""

import json
import os
import re
import uuid
import warnings
from datetime import datetime, timedelta
from typing import Optional, Union

import joblib
import numpy as np
import pandas as pd
import shap
import ollama
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

warnings.filterwarnings("ignore")

MODEL_DIR = os.environ.get("MODEL_DIR", "model_outputs")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "granite4.1:3b")
USE_LLM = os.environ.get("USE_LLM", "false").lower() == "true"

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://192.168.0.166:3000").split(",")

app = FastAPI(title="Credit Risk Prediction API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------------------------
# Load model + preprocessing contract once, at process start
# ---------------------------------------------------------------------------------------------

_required = ["best_model.json", "best_model.pkl", "preprocessing_meta.json", "model_comparison.csv"]
_missing = [f for f in _required if not os.path.exists(os.path.join(MODEL_DIR, f))]
if _missing:
    raise FileNotFoundError(
        f"{MODEL_DIR}/ is missing {_missing}. Run credit_risk_ML_v3.ipynb first to produce model_outputs/."
    )

with open(os.path.join(MODEL_DIR, "best_model.json")) as f:
    BEST = json.load(f)
with open(os.path.join(MODEL_DIR, "preprocessing_meta.json")) as f:
    META = json.load(f)

BEST_ALGO = BEST["best_model"]
model = joblib.load(os.path.join(MODEL_DIR, "best_model.pkl"))
explainer = shap.TreeExplainer(model)

FEATURE_COLS = META["feature_cols"]
CAT_FEATURES = META["cat_features"]
NON_NEGATIVE = META["non_negative_cols"]
WINSORIZE_CAPS = META["winsorize_caps"]
TENURE_MAP = META["tenure_bucket_map"]
RISK_GRADE_MAP = META["risk_grade_map"]
EPS = META["safe_div_eps"]
XGB_CATS = META.get("xgb_cat_categories", {})
LGB_CATS = META.get("lgb_cat_categories", {})

if BEST_ALGO == "LightGBM" and BEST.get("cost_optimal_threshold_lightgbm") is not None:
    THRESHOLD = float(BEST["cost_optimal_threshold_lightgbm"])
    THRESHOLD_NOTE = None
else:
    THRESHOLD = 0.5
    THRESHOLD_NOTE = (
        f"Winning model is {BEST_ALGO}; the saved cost-optimal threshold was tuned for LightGBM, "
        f"so falling back to {THRESHOLD}. Re-tune for {BEST_ALGO} before relying on this for real decisions."
    )
    print(f"WARNING: {THRESHOLD_NOTE}")

print(f"Loaded {BEST_ALGO}  (test ROC-AUC {BEST['test_roc_auc']:.4f})  threshold={THRESHOLD:.3f}")

DROP_COLS = [
    "status_raw", "customer_code", "customer_risk_color", "customer_score", "applicant_type",
    "ES_RISK_CLASSIFICATION", "bm_recommendation", "is_staff_app", "INCOME_RATIO",
    "product_interest_rate", "application_date", "spread", "segment", "label",
]

FEATURE_LABELS = {
    "LOAN_AMOUNT": "loan amount", "loan_purpose": "loan purpose", "IS_SECURED": "secured loan",
    "application_score": "application score", "KSCORE": "credit bureau score (KSCORE)",
    "EMI": "monthly instalment", "TENURE": "loan tenure (months)", "INTEREST_RATE": "interest rate",
    "DSR": "debt service ratio", "UMI": "uncommitted monthly income", "lvr": "loan-to-value ratio",
    "total_exposure": "total existing exposure", "annual_dsr": "annual debt service ratio",
    "ANNUAL_COMMITMENT": "existing annual commitments", "EQUITY_CONTRIBUTION": "collateral / asset value",
    "AGE_OF_BUSINESS_OR_EMPLOYMENT": "employment / business tenure", "max_salary": "salary",
    "max_benefits": "benefits", "emp_count": "number of employments", "emp_sector": "employment sector",
    "emp_position": "job position", "emp_contract_type": "employment contract type",
    "EMI_to_Income": "instalment as a share of income", "loan_to_income": "loan size vs monthly income",
    "exposure_ratio": "this loan as a share of total exposure",
    "affordability_buffer": "cash left over each month after commitments",
    "kscore_to_interest": "credit score relative to the rate charged",
    "employment_tenure_ordinal": "employment tenure band", "loan_cycle_ordinal": "number of prior loans",
    "risk_grade_ordinal": "internal risk grade",
}

SYSTEM_PROMPT = (
    "You are a credit analyst assistant. You will be given the output of a credit risk model: a decision, "
    "a probability, and a ranked list of the factors that drove it, taken from SHAP. Write a short "
    "plain-language explanation for a credit officer of WHY the model reached this decision.\n"
    "Rules:\n"
    "- Use ONLY the factors provided. Never introduce a factor that is not in the list.\n"
    "- Do not invent numbers. Quote only values given to you.\n"
    "- Do not give advice on whether to override the decision.\n"
    '- Say "the model" rather than "we" - this describes a statistical output, not a human judgement.\n'
    "Format your response with these exact section headers on their own lines:\n"
    "RESULT: [APPROVED or REJECTED]\n"
    "[1-2 sentence summary]\n"
    "POSITIVE FACTORS\n"
    "[factors supporting approval]\n"
    "NEGATIVE FACTORS\n"
    "[factors working against approval]\n"
    "SUMMARY\n"
    "[concluding sentence]"
)


def safe_div(a, b, eps=EPS):
    return a / (b + eps)


def parse_loan_cycle(x):
    if pd.isna(x):
        return np.nan
    s = str(x)
    if "More Then 12" in s:
        return 13
    m = re.search(r"(\d+)", s)
    return int(m.group(1)) if m else np.nan


def build_features(raw: pd.DataFrame) -> pd.DataFrame:
    df = raw.copy()
    df = df.drop(columns=[c for c in DROP_COLS if c in df.columns], errors="ignore")

    for c in NON_NEGATIVE:
        if c in df.columns:
            df.loc[df[c] < 0, c] = np.nan

    for c, cap in WINSORIZE_CAPS.items():
        if c in df.columns:
            df[c] = df[c].clip(upper=cap)

    df["EMI_to_Income"] = safe_div(df["EMI"], df["UMI"] + df["EMI"])
    df["loan_to_income"] = safe_div(df["LOAN_AMOUNT"], df["UMI"])
    df["exposure_ratio"] = safe_div(df["LOAN_AMOUNT"], df["total_exposure"])
    df["affordability_buffer"] = df["UMI"] - df["EMI"] - (df["ANNUAL_COMMITMENT"] / 12.0)
    df["kscore_to_interest"] = safe_div(df["KSCORE"], df["INTEREST_RATE"])
    df["employment_tenure_ordinal"] = df["AGE_OF_BUSINESS_OR_EMPLOYMENT"].map(TENURE_MAP)
    df["loan_cycle_ordinal"] = df["LOAN_CYCLE"].apply(parse_loan_cycle)
    df["risk_grade_ordinal"] = df["RISK_GRADE"].map(RISK_GRADE_MAP)

    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        raise KeyError(f"application is missing fields the model needs: {missing}")
    return df[FEATURE_COLS].copy()


def cat_encode(X: pd.DataFrame) -> pd.DataFrame:
    X = X.copy()
    if BEST_ALGO == "LightGBM":
        # Match training-time category dtype exactly, not a stringified version of it. IS_SECURED
        # is a real Python bool in the source data (not 'Y'/'N'), so its saved categories are
        # [False, True] — casting to str here would turn that into 'True'/'False' and fail to match
        # LGB_CATS at all, corrupting every boolean/categorical feature via the code-0 bug this
        # LGB_CATS lookup exists to prevent in the first place.
        for c in CAT_FEATURES:
            X[c] = (
                pd.Categorical(X[c], categories=LGB_CATS[c])
                if c in LGB_CATS
                else X[c].astype("category")
            )
    elif BEST_ALGO == "CatBoost":
        for c in CAT_FEATURES:
            X[c] = X[c].astype(str).where(X[c].notna(), "missing")
    else:  # XGBoost
        for c in CAT_FEATURES:
            X[c] = (
                pd.Categorical(X[c].astype(str), categories=XGB_CATS[c])
                if c in XGB_CATS
                else X[c].astype(str).astype("category")
            )
    return X


def predict_proba(X: pd.DataFrame) -> np.ndarray:
    Xe = cat_encode(X)
    if BEST_ALGO == "LightGBM":
        return model.predict(Xe, num_iteration=getattr(model, "best_iteration", None))
    return model.predict_proba(Xe)[:, 1]


def shap_drivers(X: pd.DataFrame, k: int = 6) -> tuple[pd.DataFrame, float, int, float, float]:
    Xe = cat_encode(X)
    if BEST_ALGO == "CatBoost":
        import catboost as cb
        sv = explainer.shap_values(cb.Pool(Xe, cat_features=[c for c in CAT_FEATURES if c in Xe.columns]))
    else:
        sv = explainer.shap_values(Xe)
    sv = np.asarray(sv[1] if isinstance(sv, list) else sv)
    if sv.ndim == 3:
        sv = sv[:, :, 1]
    sv = sv[0]

    exp = explainer.expected_value
    if isinstance(exp, (list, np.ndarray)):
        base_prob = float(exp[1] if len(exp) > 1 else exp)
    else:
        base_prob = float(exp)

    df = pd.DataFrame(
        {
            "feature": X.columns,
            "label": [FEATURE_LABELS.get(c, c) for c in X.columns],
            "value": X.iloc[0].values,
            "shap": sv,
        }
    )
    df["direction"] = np.where(df["shap"] >= 0, "towards approval", "towards rejection")

    order = np.argsort(np.abs(sv))[::-1]
    top = df.iloc[order[:k]].reset_index(drop=True)
    rest_shap = float(sv[order[k:]].sum())
    total_abs = float(np.abs(sv).sum())
    coverage = float(np.abs(sv[order[:k]]).sum() / total_abs * 100) if total_abs > 0 else 100.0
    other_count = len(order) - k

    return top, base_prob, other_count, rest_shap, coverage


def explain_with_template(decision: str, prob: float, drivers: pd.DataFrame, base_prob: float) -> str:
    """Generate a detailed plain-language explanation from SHAP drivers without an LLM (instant)."""
    top = drivers.head(5)
    push_factors = top[top["shap"] >= 0]
    pull_factors = top[top["shap"] < 0]

    prob_pct = prob * 100
    base_pct = base_prob * 100

    lines = []

    # Decision header
    if decision == "APPROVED":
        lines.append("RESULT: APPROVED")
    else:
        lines.append("RESULT: REJECTED")
    lines.append(f"Probability: {prob_pct:.1f}%  |  Threshold: {THRESHOLD:.0%}")
    lines.append("")

    # Decision summary
    if decision == "APPROVED":
        lines.append(f"This application meets the approval criteria. The model predicts a {prob_pct:.1f}% chance of successful repayment, which is above the minimum threshold of {THRESHOLD:.0%}.")
    else:
        lines.append(f"This application does not meet the approval criteria. The model predicts only a {prob_pct:.1f}% chance of successful repayment, which is below the minimum threshold of {THRESHOLD:.0%}.")
    lines.append(f"Baseline approval rate: {base_pct:.1f}% of all applications are approved.")
    lines.append("")

    # Positive factors
    if len(push_factors):
        lines.append("POSITIVE FACTORS (Supporting Approval)")
        lines.append("-" * 40)
        for _, r in push_factors.iterrows():
            val = "not provided" if pd.isna(r["value"]) else (
                f"{r['value']:.2f}" if isinstance(r["value"], (int, float, np.number)) else str(r["value"])
            )
            impact_pct = abs(r["shap"]) * 100
            impact_label = "[Significant positive impact]" if r["shap"] > 0.1 else "[Moderate positive impact]" if r["shap"] > 0.05 else "[Minor positive impact]"
            lines.append(f"  + {r['label']}: {val}")
            lines.append(f"    Increases approval chance by +{impact_pct:.1f}% {impact_label}")
        lines.append("")

    # Negative factors
    if len(pull_factors):
        lines.append("NEGATIVE FACTORS (Working Against Approval)")
        lines.append("-" * 40)
        for _, r in pull_factors.iterrows():
            val = "not provided" if pd.isna(r["value"]) else (
                f"{r['value']:.2f}" if isinstance(r["value"], (int, float, np.number)) else str(r["value"])
            )
            impact_pct = abs(r["shap"]) * 100
            impact_label = "[Significant negative impact]" if abs(r["shap"]) > 0.1 else "[Moderate negative impact]" if abs(r["shap"]) > 0.05 else "[Minor negative impact]"
            lines.append(f"  - {r['label']}: {val}")
            lines.append(f"    Decreases approval chance by -{impact_pct:.1f}% {impact_label}")
        lines.append("")

    # Summary
    net_effect = sum(push_factors["shap"]) + sum(pull_factors["shap"]) if len(push_factors) or len(pull_factors) else 0
    net_pct = net_effect * 100

    lines.append("SUMMARY")
    lines.append("-" * 40)
    lines.append(f"  Baseline probability:  {base_pct:.1f}%")
    lines.append(f"  Net factor impact:     {net_pct:+.1f}%")
    lines.append(f"  Final probability:     {prob_pct:.1f}%")
    lines.append("")

    if prob >= THRESHOLD:
        lines.append("  The positive factors outweigh the negative ones.")
        lines.append(f"  Final score ({prob_pct:.1f}%) is ABOVE the threshold ({THRESHOLD:.0%}).")
        lines.append("  DECISION: APPROVED")
    else:
        lines.append("  The negative factors outweigh the positive ones.")
        lines.append(f"  Final score ({prob_pct:.1f}%) is BELOW the threshold ({THRESHOLD:.0%}).")
        lines.append("  DECISION: REJECTED")

    return "\n".join(lines)


def explain_with_llm(decision: str, prob: float, drivers: pd.DataFrame) -> str:
    lines = [
        f"Decision: {decision}",
        f"Probability of approval: {prob:.3f} (threshold {THRESHOLD:.3f}, model {BEST_ALGO})",
        "",
        "Factors, strongest first:",
    ]
    for _, d in drivers.iterrows():
        val = (
            "not provided"
            if pd.isna(d["value"])
            else (f"{d['value']:.2f}" if isinstance(d["value"], (int, float, np.number)) else str(d["value"]))
        )
        lines.append(f"- {d['label']}: {val} | pushes {d['direction']} (effect {d['shap']:+.3f})")
    prompt = "\n".join(lines)

    resp = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        options={"temperature": 0.2, "num_predict": 150, "num_ctx": 2048, "num_thread": 1},
    )
    return resp["message"]["content"].strip()


SESSIONS: dict[str, dict] = {}
SESSION_TTL = timedelta(hours=2)

# ---------------------------------------------------------------------------------------------
# API schema
# ---------------------------------------------------------------------------------------------

class Application(BaseModel):
    LOAN_AMOUNT: float
    loan_purpose: str
    LOAN_CYCLE: str
    IS_SECURED: bool
    TENURE: float
    INTEREST_RATE: float
    EMI: float
    total_exposure: float
    ANNUAL_COMMITMENT: float
    EQUITY_CONTRIBUTION: float
    application_score: float
    OVERALL_RISK_RATING: str
    SCORE_GRADE: str
    RISK_GRADE: str
    KSCORE: float
    DSR: float
    annual_dsr: float
    UMI: float
    lvr: float
    AGE_OF_BUSINESS_OR_EMPLOYMENT: str
    max_salary: float
    max_benefits: float
    emp_count: float
    emp_sector: float
    emp_position: str
    emp_contract_type: str
    eligibility: Optional[str] = None
    PRIORITY: Optional[str] = None


class SessionRequest(BaseModel):
    returnUrl: str
    application: Optional[Application] = None

class SessionResponse(BaseModel):
    token: str
    url: str


class Driver(BaseModel):
    feature: str
    label: str
    value: Optional[Union[float, str]] = None
    shap: float
    direction: str


def _driver_value(raw) -> Optional[Union[float, str]]:
    """Top SHAP drivers can be categorical (e.g. IS_SECURED='Y') as easily as numeric — cast
    accordingly instead of assuming every driver is a number, which crashed on any categorical
    feature that happened to rank in the top 6."""
    if pd.isna(raw):
        return None
    if isinstance(raw, (int, float, np.integer, np.floating)):
        return float(raw)
    return str(raw)


class PredictResponse(BaseModel):
    decision: str
    probability: float
    threshold: float
    model: str
    threshold_note: Optional[str] = None
    base_probability: float
    drivers: list[Driver]
    other_factors_count: int
    other_factors_shap: float
    top_k_coverage_pct: float
    explanation: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": BEST_ALGO,
        "test_roc_auc": BEST["test_roc_auc"],
        "threshold": THRESHOLD,
        "threshold_note": THRESHOLD_NOTE,
        "ollama_model": OLLAMA_MODEL,
        "explanation_mode": "llm" if USE_LLM else "template",
    }


@app.get("/schema")
def schema():
    """Field metadata for the frontend form: labels, groups, and known categorical options."""
    return {
        "tenure_buckets": list(TENURE_MAP.keys()),
        "risk_grades": list(RISK_GRADE_MAP.keys()),
        "winsorize_caps": WINSORIZE_CAPS,
    }


@app.post("/predict/session", response_model=SessionResponse)
def create_session(req: SessionRequest):
    """Create a session token for cross-app redirect. Profitoo calls this to get a URL."""
    token = str(uuid.uuid4())
    SESSIONS[token] = {
        "application": req.application.model_dump() if req.application else None,
        "returnUrl": req.returnUrl,
        "createdAt": datetime.now().isoformat(),
    }
    base_ui = os.environ.get("UI_BASE_URL", "http://localhost:3000")
    return SessionResponse(token=token, url=f"{base_ui}/predict/{token}")


@app.get("/predict/session/{token}")
def get_session(token: str):
    """Retrieve and consume a session token (one-time use)."""
    session = SESSIONS.pop(token, None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    created = datetime.fromisoformat(session["createdAt"])
    if datetime.now() - created > SESSION_TTL:
        raise HTTPException(status_code=410, detail="Session expired")
    return session


@app.post("/predict", response_model=PredictResponse)
def predict(application: Application):
    try:
        raw = pd.DataFrame([application.model_dump()])
        X = build_features(raw)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))

    prob = float(predict_proba(X)[0])
    decision = "APPROVED" if prob >= THRESHOLD else "REJECTED"
    drivers_df, base_prob, other_count, other_shap, coverage_pct = shap_drivers(X, k=10)

    if USE_LLM:
        try:
            explanation = explain_with_llm(decision, prob, drivers_df)
        except Exception as e:
            explanation = explain_with_template(decision, prob, drivers_df, base_prob) + \
                f" [LLM unavailable: {e}. Showing template explanation.]"
    else:
        explanation = explain_with_template(decision, prob, drivers_df, base_prob)

    drivers = [
        Driver(
            feature=row["feature"],
            label=row["label"],
            value=_driver_value(row["value"]),
            shap=float(row["shap"]),
            direction=row["direction"],
        )
        for _, row in drivers_df.iterrows()
    ]

    return PredictResponse(
        decision=decision,
        probability=prob,
        threshold=THRESHOLD,
        model=BEST_ALGO,
        threshold_note=THRESHOLD_NOTE,
        base_probability=base_prob,
        drivers=drivers,
        other_factors_count=other_count,
        other_factors_shap=other_shap,
        top_k_coverage_pct=coverage_pct,
        explanation=explanation,
    )
