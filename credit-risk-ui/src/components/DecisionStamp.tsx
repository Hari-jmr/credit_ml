"use client";

import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

export function DecisionStamp({
  decision,
  probability,
}: {
  decision: "APPROVED" | "REJECTED";
  probability: number;
}) {
  const isApprove = decision === "APPROVED";

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-bold ${
          isApprove
            ? "bg-success-dim text-success border border-success"
            : "bg-error-dim text-error border border-error"
        }`}
      >
        {isApprove ? (
          <CheckCircleIcon className="h-5 w-5 text-success" />
        ) : (
          <XCircleIcon className="h-5 w-5 text-error" />
        )}
        <span>{decision}</span>
      </div>
      <p className="text-sm text-text-muted">
        {isApprove ? "Above decision threshold" : "Below decision threshold"}
      </p>
    </div>
  );
}
