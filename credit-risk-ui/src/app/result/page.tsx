"use client";

import { useMemo, useSyncExternalStore, useCallback } from "react";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon, DocumentArrowDownIcon } from "@heroicons/react/20/solid";
import { DecisionStamp } from "@/components/DecisionStamp";
import { DriverBars } from "@/components/DriverBars";
import { ProbabilityGauge } from "@/components/ProbabilityGauge";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { PredictResponse, ApplicationPayload } from "@/lib/api";
import { RESULT_STORAGE_KEY, APPLICATION_STORAGE_KEY, RETURN_URL_KEY } from "@/lib/resultStorage";

function noopSubscribe() {
  return () => {};
}

function useSessionStorageValue(key: string): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => sessionStorage.getItem(key),
    () => null
  );
}

const SUMMARY_FIELDS: { key: keyof ApplicationPayload; label: string; suffix?: string }[] = [
  { key: "LOAN_AMOUNT", label: "Loan Amount" },
  { key: "loan_purpose", label: "Purpose" },
  { key: "TENURE", label: "Tenure", suffix: "mo" },
  { key: "INTEREST_RATE", label: "Interest Rate", suffix: "%" },
  { key: "KSCORE", label: "Credit Bureau Score" },
  { key: "RISK_GRADE", label: "Risk Grade" },
  { key: "DSR", label: "DSR", suffix: "%" },
  { key: "UMI", label: "Monthly Income (UMI)" },
  { key: "IS_SECURED", label: "Collateral" },
];

interface ResultPageState {
  status: "ready" | "missing";
  result: PredictResponse | null;
  application: ApplicationPayload | null;
}

export default function ResultPage() {
  const resultRaw = useSessionStorageValue(RESULT_STORAGE_KEY);
  const applicationRaw = useSessionStorageValue(APPLICATION_STORAGE_KEY);
  const returnUrlRaw = useSessionStorageValue(RETURN_URL_KEY);

  const { status, result, application }: ResultPageState = useMemo(() => {
    if (!resultRaw) return { status: "missing", result: null, application: null };
    try {
      return {
        status: "ready",
        result: JSON.parse(resultRaw) as PredictResponse,
        application: applicationRaw ? (JSON.parse(applicationRaw) as ApplicationPayload) : null,
      };
    } catch {
      return { status: "missing", result: null, application: null };
    }
  }, [resultRaw, applicationRaw]);

  const returnUrl = useMemo(() => {
    if (!returnUrlRaw) return null;
    try {
      return JSON.parse(returnUrlRaw) as string;
    } catch {
      return returnUrlRaw;
    }
  }, [returnUrlRaw]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (status === "missing" || !result) {
    return (
      <div className="page-container py-32 text-center">
        <p className="text-xl font-bold text-text">No result to show</p>
        <p className="mt-2 text-sm text-text-muted">
          Results are available only after submitting an application in this tab.
        </p>
        <Link
          href="/"
          className="btn btn-primary inline-flex items-center gap-1.5 mt-6"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Go to application form
        </Link>
      </div>
    );
  }

  const isApprove = result.decision === "APPROVED";

  return (
    <div className="page-container py-8 sm:py-12 lg:py-14 animate-fade-in">
      <header className="no-print mb-8 flex flex-col items-start justify-between gap-4 pb-6 sm:flex-row sm:items-center lg:mb-10 lg:pb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">Decision</h1>
          <p className="mt-1.5 text-sm text-text-muted">Detailed breakdown of the credit risk assessment</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {returnUrl && (
            <a
              href={returnUrl}
              className="btn btn-secondary inline-flex items-center gap-1.5"
            >
              Back to Profitoo
            </a>
          )}
          <Link
            href="/"
            className="btn btn-secondary inline-flex items-center gap-1.5"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Link>
          <Link
            href="/"
            className="btn btn-primary inline-flex items-center gap-1.5"
          >
            <PlusIcon className="h-4 w-4" />
            New Application
          </Link>
          <button
            onClick={handlePrint}
            className="btn btn-secondary inline-flex items-center gap-1.5"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[35%_65%] lg:gap-8">
        <div className="flex flex-col gap-6 md:sticky md:top-8 md:self-start lg:top-12">

          <div className="card-base">
            <DecisionStamp decision={result.decision} probability={result.probability} />
            <div className="my-5 h-px bg-border" />
            <ProbabilityGauge
              probability={result.probability}
              threshold={result.threshold}
            />
            <div className="mt-5 space-y-2 rounded-lg bg-surface-2 px-4 py-3 text-[11px]">
              <div className="flex justify-between">
                <span className="text-text-muted">Model</span>
                <span className="font-mono font-medium text-text">{result.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Threshold</span>
                <span className="font-mono font-medium text-text">{result.threshold.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Decision</span>
                <span className={`font-mono font-semibold ${isApprove ? "text-success" : "text-error"}`}>
                  {result.decision}
                </span>
              </div>
            </div>
          </div>

          {application && (
            <div className="overflow-hidden card-base">
              <div className="-mx-6 -mt-6 mb-6 border-b border-border bg-surface-2 px-6 py-3.5 max-sm:-mx-4 max-sm:-mt-4 max-sm:mb-4 max-sm:px-4 max-sm:py-3">
                <h2 className="text-sm font-semibold text-text">Application Summary</h2>
              </div>
              <dl className="-mx-6 -mb-6 max-sm:-mx-4 max-sm:-mb-4">
                {SUMMARY_FIELDS.map(({ key, label, suffix }, i) => {
                  const raw = application[key];
                  let value: string;
                  if (key === "IS_SECURED") {
                    value = raw ? "Secured" : "Unsecured";
                  } else if (typeof raw === "boolean") {
                    value = raw ? "Yes" : "No";
                  } else {
                    value = `${raw}${suffix ?? ""}`;
                  }
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between gap-3 px-6 py-2.5 text-[13px] max-sm:px-4 ${
                        i % 2 === 0 ? "bg-surface-2/40" : ""
                      }`}
                    >
                      <dt className="text-text-muted">{label}</dt>
                      <dd className="font-mono font-medium text-accent">{value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:gap-8">

          <div className="card-base lg:flex-1 lg:flex lg:flex-col">
            <h2 className="mb-1 text-lg font-bold text-text">Top Factors Affecting the Decision</h2>
            <p className="mb-5 text-[13px] text-text-muted">
              These features contributed the most to the model&apos;s prediction.
            </p>
            <div className="flex-1">
              <DriverBars
                drivers={result.drivers}
                otherCount={result.other_factors_count}
                otherShapSum={result.other_factors_shap}
                coveragePct={result.top_k_coverage_pct}
              />
            </div>
          </div>

          <ExplanationPanel explanation={result.explanation} modelName="Granite 4.1 3B" />

          <RecommendationsCard />
        </div>
      </div>
    </div>
  );
}
