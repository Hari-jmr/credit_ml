"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormSection } from "@/components/FormSection";
import { NumberField, SelectField, TextField } from "@/components/Field";
import { DerivedPanel } from "@/components/DerivedPanel";
import { deriveFeatures } from "@/lib/deriveFeatures";
import { predict, ApiError, ApplicationPayload } from "@/lib/api";
import { RESULT_STORAGE_KEY, APPLICATION_STORAGE_KEY, RETURN_URL_KEY } from "@/lib/resultStorage";

const TENURE_BUCKETS = [
  "Less than 2 years",
  "2 years - 5 years",
  "More than 5 - 10 years",
  "More than 10 years",
];
const RISK_GRADES = ["AA", "BB", "CC", "DD", "EE"];
const SCORE_GRADES = ["Grade A", "Grade B", "Grade C", "Grade D"];
const RISK_RATINGS = [
  { value: "01-Low", label: "01 — Low" },
  { value: "02-Medium", label: "02 — Medium" },
  { value: "03-High", label: "03 — High" },
];

const DEFAULTS: ApplicationPayload = {
  LOAN_AMOUNT: 15000,
  loan_purpose: "Working Capital",
  LOAN_CYCLE: "02-Loan Cycle-2",
  IS_SECURED: true,
  TENURE: 24,
  INTEREST_RATE: 14.4,
  EMI: 352.14,
  total_exposure: 15000,
  ANNUAL_COMMITMENT: 0,
  EQUITY_CONTRIBUTION: 45000,
  application_score: 700,
  OVERALL_RISK_RATING: "01-Low",
  SCORE_GRADE: "Grade B",
  RISK_GRADE: "BB",
  KSCORE: 1050,
  DSR: 47.5,
  annual_dsr: 106,
  UMI: 1610,
  lvr: 33.3,
  AGE_OF_BUSINESS_OR_EMPLOYMENT: "2 years - 5 years",
  max_salary: 1800,
  max_benefits: 200,
  emp_count: 1,
  emp_sector: 3,
  emp_position: "Owner",
  emp_contract_type: "Permanent",
};

type Status = "idle" | "warming" | "loading" | "error";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SessionPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [form, setForm] = useState<ApplicationPayload>(DEFAULTS);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string>("");

  const resolvedParams = useMemo(() => {
    let resolved: { token: string } | null = null;
    // Next.js 15 uses a Promise for params; unwrap it
    if (params instanceof Promise) {
      params.then((p) => { resolved = p; });
    } else {
      resolved = params as { token: string };
    }
    return resolved;
  }, [params]);

  const token = resolvedParams?.token ?? "";

  const set = <K extends keyof ApplicationPayload>(key: K) => (value: ApplicationPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setNum = (key: keyof ApplicationPayload) => (v: number | null) => set(key)(v ?? 0);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/predict/session/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? "Failed to load session");
        }
        const data = await res.json();
        if (data.returnUrl) setReturnUrl(data.returnUrl);
        if (data.application) {
          const converted: ApplicationPayload = {
            ...data.application,
            LOAN_AMOUNT: Number(data.application.LOAN_AMOUNT) || 0,
            TENURE: Number(data.application.TENURE) || 0,
            INTEREST_RATE: Number(data.application.INTEREST_RATE) || 0,
            EMI: Number(data.application.EMI) || 0,
            total_exposure: Number(data.application.total_exposure) || 0,
            ANNUAL_COMMITMENT: Number(data.application.ANNUAL_COMMITMENT) || 0,
            EQUITY_CONTRIBUTION: Number(data.application.EQUITY_CONTRIBUTION) || 0,
            application_score: Number(data.application.application_score) || 0,
            KSCORE: Number(data.application.KSCORE) || 0,
            DSR: Number(data.application.DSR) || 0,
            annual_dsr: Number(data.application.annual_dsr) || 0,
            UMI: Number(data.application.UMI) || 0,
            lvr: Number(data.application.lvr) || 0,
            max_salary: Number(data.application.max_salary) || 0,
            max_benefits: Number(data.application.max_benefits) || 0,
            emp_count: Number(data.application.emp_count) || 0,
            emp_sector: Number(data.application.emp_sector) || 0,
          };
          setForm((prev) => ({ ...prev, ...converted }));
        }
        setStatus("idle");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load session");
        setStatus("error");
      }
    })();
  }, [token]);

  const derived = useMemo(
    () =>
      deriveFeatures({
        LOAN_AMOUNT: form.LOAN_AMOUNT,
        EMI: form.EMI,
        TENURE: form.TENURE,
        INTEREST_RATE: form.INTEREST_RATE,
        total_exposure: form.total_exposure,
        ANNUAL_COMMITMENT: form.ANNUAL_COMMITMENT,
        EQUITY_CONTRIBUTION: form.EQUITY_CONTRIBUTION,
        DSR: form.DSR,
        annual_dsr: form.annual_dsr,
        UMI: form.UMI,
        lvr: form.lvr,
        KSCORE: form.KSCORE,
        AGE_OF_BUSINESS_OR_EMPLOYMENT: form.AGE_OF_BUSINESS_OR_EMPLOYMENT,
        LOAN_CYCLE: form.LOAN_CYCLE,
        RISK_GRADE: form.RISK_GRADE,
      }),
    [form]
  );

  async function handlePredict() {
    setStatus("warming");
    setError(null);
    try {
      const res = await predict(form);
      sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(res));
      sessionStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(form));
      if (returnUrl) sessionStorage.setItem(RETURN_URL_KEY, returnUrl);
      router.push("/result");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not reach the prediction service.";
      setError(msg);
      setStatus("idle");
    }
  }

  if (status === "warming" || status === "loading") {
    return (
      <div className="page-container py-32 text-center">
        <p className="text-xl font-bold text-text">Loading session...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page-container py-32 text-center">
        <p className="text-xl font-bold text-error">Session Error</p>
        <p className="mt-2 text-sm text-text-muted">{error}</p>
        {returnUrl && (
          <a
            href={returnUrl}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-navy-light hover:shadow-lg"
          >
            Back to Profitoo
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="page-container py-8 sm:py-12 lg:py-14 animate-fade-in">
      <header className="mb-8 flex flex-col items-start justify-between gap-4 pb-6 sm:flex-row sm:items-center lg:mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            AI &amp; ML Credit Approval Predictor
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Pre-filled application from Profitoo. Review and submit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {returnUrl && (
            <a
              href={returnUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-text-muted shadow-sm transition-all hover:border-border-strong hover:text-text min-h-[44px]"
            >
              Back to Profitoo
            </a>
          )}
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs tracking-wide text-text-dim">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            System Active
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[70%_30%] lg:gap-8">
        <div className="flex flex-col gap-6">
          <FormSection number="01" title="Loan Details">
            <NumberField label="Loan amount" value={form.LOAN_AMOUNT} onChange={setNum("LOAN_AMOUNT")} step={100} />
            <TextField label="Loan purpose" value={form.loan_purpose} onChange={set("loan_purpose")} placeholder="Working Capital" />
            <TextField
              label="Loan cycle"
              value={form.LOAN_CYCLE}
              onChange={set("LOAN_CYCLE")}
              placeholder="02-Loan Cycle-2"
              hint="e.g. '01-Loan Cycle-1' ... or 'More Then 12'"
            />
            <SelectField
              label="Secured"
              value={form.IS_SECURED ? "true" : "false"}
              onChange={(v) => set("IS_SECURED")(v === "true")}
              options={[
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ]}
            />
            <NumberField label="Tenure" value={form.TENURE} onChange={setNum("TENURE")} suffix="months" />
            <NumberField label="Interest rate" value={form.INTEREST_RATE} onChange={setNum("INTEREST_RATE")} step={0.1} suffix="% p.a." />
            <NumberField label="Monthly instalment (EMI)" value={form.EMI} onChange={setNum("EMI")} step={0.01} />
            <NumberField label="Total exposure" value={form.total_exposure} onChange={setNum("total_exposure")} step={100} />
            <NumberField label="Annual commitments" value={form.ANNUAL_COMMITMENT} onChange={setNum("ANNUAL_COMMITMENT")} step={100} />
            <NumberField label="Collateral / equity" value={form.EQUITY_CONTRIBUTION} onChange={setNum("EQUITY_CONTRIBUTION")} step={100} />
          </FormSection>

          <FormSection number="02" title="Credit Profile">
            <NumberField label="Application score" value={form.application_score} onChange={setNum("application_score")} />
            <SelectField
              label="Overall risk rating"
              value={form.OVERALL_RISK_RATING}
              onChange={set("OVERALL_RISK_RATING")}
              options={RISK_RATINGS}
            />
            <SelectField
              label="Score grade"
              value={form.SCORE_GRADE}
              onChange={set("SCORE_GRADE")}
              options={SCORE_GRADES.map((g) => ({ value: g, label: g }))}
            />
            <SelectField
              label="Risk grade"
              value={form.RISK_GRADE}
              onChange={set("RISK_GRADE")}
              options={RISK_GRADES.map((g) => ({ value: g, label: g }))}
            />
            <NumberField label="Credit bureau score (KSCORE)" value={form.KSCORE} onChange={setNum("KSCORE")} />
            <NumberField label="Debt service ratio (DSR)" value={form.DSR} onChange={setNum("DSR")} step={0.1} suffix="%" />
            <NumberField label="Annual DSR" value={form.annual_dsr} onChange={setNum("annual_dsr")} step={0.1} suffix="%" />
            <NumberField label="Uncommitted monthly income (UMI)" value={form.UMI} onChange={setNum("UMI")} step={10} />
            <NumberField label="Loan-to-value ratio" value={form.lvr} onChange={setNum("lvr")} step={0.1} suffix="%" />
          </FormSection>

          <FormSection number="03" title="Employment">
            <SelectField
              label="Business / employment tenure"
              value={form.AGE_OF_BUSINESS_OR_EMPLOYMENT}
              onChange={set("AGE_OF_BUSINESS_OR_EMPLOYMENT")}
              options={TENURE_BUCKETS.map((b) => ({ value: b, label: b }))}
            />
            <NumberField label="Salary" value={form.max_salary} onChange={setNum("max_salary")} step={10} />
            <NumberField label="Benefits" value={form.max_benefits} onChange={setNum("max_benefits")} step={10} />
            <NumberField label="Number of employments" value={form.emp_count} onChange={setNum("emp_count")} />
            <NumberField label="Employment sector code" value={form.emp_sector} onChange={setNum("emp_sector")} />
            <TextField label="Job position" value={form.emp_position} onChange={set("emp_position")} placeholder="Owner" />
            <TextField label="Contract type" value={form.emp_contract_type} onChange={set("emp_contract_type")} placeholder="Permanent" />
          </FormSection>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-12 lg:self-start">
          <DerivedPanel derived={derived} />

          <button
            onClick={handlePredict}
            disabled={status === "warming" || status === "loading"}
            className="w-full rounded-xl bg-navy px-6 py-4 text-[15px] font-bold text-white shadow-sm transition-all hover:bg-navy-light hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            {status === "warming" ? "Warming up model..." : status === "loading" ? "Analyzing application..." : "Run Credit Assessment"}
          </button>

          {status === "error" && error && (
            <div className="card-base border-error-dim bg-error-light">
              <p className="text-sm font-semibold text-error">Assessment failed</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
