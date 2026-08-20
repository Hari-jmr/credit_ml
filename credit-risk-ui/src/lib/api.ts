const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5230";
const REQUEST_TIMEOUT = 30_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export interface ApplicationPayload {
  LOAN_AMOUNT: number;
  loan_purpose: string;
  LOAN_CYCLE: string;
  IS_SECURED: boolean;
  TENURE: number;
  INTEREST_RATE: number;
  EMI: number;
  total_exposure: number;
  ANNUAL_COMMITMENT: number;
  EQUITY_CONTRIBUTION: number;
  application_score: number;
  OVERALL_RISK_RATING: string;
  SCORE_GRADE: string;
  RISK_GRADE: string;
  KSCORE: number;
  DSR: number;
  annual_dsr: number;
  UMI: number;
  lvr: number;
  AGE_OF_BUSINESS_OR_EMPLOYMENT: string;
  max_salary: number;
  max_benefits: number;
  emp_count: number;
  emp_sector: number;
  emp_position: string;
  emp_contract_type: string;
}

export interface Driver {
  feature: string;
  label: string;
  value: number | string | null;
  shap: number;
  direction: "towards approval" | "towards rejection";
}

export interface PredictResponse {
  decision: "APPROVED" | "REJECTED";
  probability: number;
  threshold: number;
  model: string;
  threshold_note: string | null;
  base_probability: number;
  drivers: Driver[];
  other_factors_count: number;
  other_factors_shap: number;
  top_k_coverage_pct: number;
  explanation: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function predict(application: ApplicationPayload, retries = 1): Promise<PredictResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(application),
      });

      if (!res.ok) {
        let detail = res.statusText;
        try {
          const body = await res.json();
          detail = body.detail ?? detail;
        } catch {
          // response wasn't JSON — keep statusText
        }
        throw new ApiError(detail, res.status);
      }

      return res.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(`Request timed out after ${REQUEST_TIMEOUT / 1000}s. The prediction service may be overloaded.`, 504);
      }
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new ApiError(`Cannot connect to ${API_URL}. Is the backend running?`, 0);
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw lastError!;
}

export interface HealthResponse {
  status: string;
  model: string;
  test_roc_auc: number;
  threshold: number;
  threshold_note: string | null;
  ollama_model: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetchWithTimeout(`${API_URL}/health`);
  if (!res.ok) throw new ApiError("API is not reachable", res.status);
  return res.json();
}
