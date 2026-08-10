// Mirrors predict.ipynb's build_features() exactly, for live client-side preview only.
// The backend recomputes these the same way at prediction time -- this module never decides
// APPROVED/REJECTED, it only lets the form show derived values as the user types.

export const EPS = 1.0;

export const TENURE_BUCKET_MAP: Record<string, number> = {
  "Less than 2 years": 1,
  "2 years - 5 years": 2,
  "More than 5 - 10 years": 3,
  "More than 10 years": 4,
};

export const RISK_GRADE_MAP: Record<string, number> = {
  AA: 5,
  BB: 4,
  CC: 3,
  DD: 2,
  EE: 1,
};

// Winsorize caps learned at training time (from model_outputs/preprocessing_meta.json).
// Placeholder values -- swap for the real caps written by credit_risk_ML_v3.ipynb before relying
// on this for anything beyond a live-preview.
export const DEFAULT_WINSORIZE_CAPS: Record<string, number> = {
  DSR: 69.9,
  UMI: 8996.6,
  lvr: 76.7,
  ANNUAL_COMMITMENT: 20104.1,
  EQUITY_CONTRIBUTION: 422761.9,
  annual_dsr: 137.3,
};

export interface RawApplication {
  LOAN_AMOUNT: number | null;
  EMI: number | null;
  TENURE: number | null;
  INTEREST_RATE: number | null;
  total_exposure: number | null;
  ANNUAL_COMMITMENT: number | null;
  EQUITY_CONTRIBUTION: number | null;
  DSR: number | null;
  annual_dsr: number | null;
  UMI: number | null;
  lvr: number | null;
  KSCORE: number | null;
  AGE_OF_BUSINESS_OR_EMPLOYMENT: string | null;
  LOAN_CYCLE: string | null;
  RISK_GRADE: string | null;
}

export interface DerivedFeatures {
  EMI_to_Income: number | null;
  loan_to_income: number | null;
  exposure_ratio: number | null;
  affordability_buffer: number | null;
  kscore_to_interest: number | null;
  employment_tenure_ordinal: number | null;
  loan_cycle_ordinal: number | null;
  risk_grade_ordinal: number | null;
}

function safeDiv(a: number | null, b: number | null, eps = EPS): number | null {
  if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b)) return null;
  return a / (b + eps);
}

// Same rule as Python's parse_loan_cycle: 'More Then 12' (source data's own spelling) -> 13,
// otherwise pull the first integer out of the string.
export function parseLoanCycle(x: string | null): number | null {
  if (!x) return null;
  if (x.includes("More Then 12")) return 13;
  const m = x.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function clip(value: number | null, cap: number | undefined): number | null {
  if (value === null || cap === undefined) return value;
  return value > cap ? cap : value;
}

/**
 * Live preview of the 8 derived columns. Winsorize caps default to the training-run values
 * baked in above; pass real caps (fetched from the backend) once available for exact parity.
 */
export function deriveFeatures(
  raw: RawApplication,
  caps: Record<string, number> = DEFAULT_WINSORIZE_CAPS
): DerivedFeatures {
  const EMI = raw.EMI;
  const UMI = clip(raw.UMI, caps.UMI);
  const LOAN_AMOUNT = raw.LOAN_AMOUNT;
  const total_exposure = raw.total_exposure;
  const ANNUAL_COMMITMENT = clip(raw.ANNUAL_COMMITMENT, caps.ANNUAL_COMMITMENT);
  const KSCORE = raw.KSCORE;
  const INTEREST_RATE = raw.INTEREST_RATE;

  const EMI_to_Income =
    EMI !== null && UMI !== null ? safeDiv(EMI, UMI + EMI) : null;
  const loan_to_income = safeDiv(LOAN_AMOUNT, UMI);
  const exposure_ratio = safeDiv(LOAN_AMOUNT, total_exposure);
  const affordability_buffer =
    UMI !== null && EMI !== null && ANNUAL_COMMITMENT !== null
      ? UMI - EMI - ANNUAL_COMMITMENT / 12.0
      : null;
  const kscore_to_interest = safeDiv(KSCORE, INTEREST_RATE);
  const employment_tenure_ordinal = raw.AGE_OF_BUSINESS_OR_EMPLOYMENT
    ? TENURE_BUCKET_MAP[raw.AGE_OF_BUSINESS_OR_EMPLOYMENT] ?? null
    : null;
  const loan_cycle_ordinal = parseLoanCycle(raw.LOAN_CYCLE);
  const risk_grade_ordinal = raw.RISK_GRADE ? RISK_GRADE_MAP[raw.RISK_GRADE] ?? null : null;

  return {
    EMI_to_Income,
    loan_to_income,
    exposure_ratio,
    affordability_buffer,
    kscore_to_interest,
    employment_tenure_ordinal,
    loan_cycle_ordinal,
    risk_grade_ordinal,
  };
}

export const DERIVED_LABELS: Record<keyof DerivedFeatures, string> = {
  EMI_to_Income: "Instalment / income",
  loan_to_income: "Loan / income",
  exposure_ratio: "Loan / total exposure",
  affordability_buffer: "Monthly buffer after commitments",
  kscore_to_interest: "Credit score / interest rate",
  employment_tenure_ordinal: "Tenure band (1\u20134)",
  loan_cycle_ordinal: "Prior loan cycle #",
  risk_grade_ordinal: "Risk grade (1\u20135)",
};
