import { ScaleIcon } from "@heroicons/react/24/solid";

export function ExplanationPanel({ explanation, modelName }: { explanation: string; modelName: string }) {
  const lines = explanation.split("\n");

  return (
    <div className="card-base card-hover animate-fade-in">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-weak">
          <ScaleIcon className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-text">Assessment Rationale</h3>
          <p className="text-xs text-text-muted">{modelName} analysis</p>
        </div>
      </div>

      <div className="text-[13px] leading-relaxed text-text">
        {lines.map((line, i) => {
          const trimmed = line.trim();

          if (trimmed === "" || trimmed === "=".repeat(50) || trimmed === "-".repeat(40)) {
            return <div key={i} className="h-3" />;
          }

          if (trimmed.startsWith("RESULT:")) {
            const isApproved = trimmed.includes("APPROVED");
            return (
              <div key={i} className={`mb-1 text-lg font-bold ${isApproved ? "text-success" : "text-error"}`}>
                {trimmed}
              </div>
            );
          }

          if (trimmed.includes("Probability:") && trimmed.includes("Threshold:")) {
            return (
              <p key={i} className="mb-1 text-sm font-medium text-text-muted">
                {trimmed}
              </p>
            );
          }

          if ((trimmed.startsWith("POSITIVE FACTORS") || trimmed.startsWith("NEGATIVE FACTORS") || trimmed === "SUMMARY") && trimmed.length > 5) {
            return (
              <h4 key={i} className="mt-5 mb-2 border-b border-border pb-1 font-bold text-text uppercase tracking-wide">
                {trimmed}
              </h4>
            );
          }

          if (trimmed.toLowerCase().includes("baseline approval rate") || trimmed.toLowerCase().includes("does not meet") || trimmed.toLowerCase().includes("meets the approval")) {
            return (
              <p key={i} className="mb-1 text-text-muted">
                {trimmed}
              </p>
            );
          }

          if (trimmed.startsWith("+ ") || trimmed.startsWith("- ")) {
            const isPositive = trimmed.startsWith("+");
            return (
              <p key={i} className={`ml-3 flex items-start gap-2 ${isPositive ? "text-success" : "text-error"}`}>
                <span className="font-bold">{trimmed.charAt(0)}</span>
                <span>{trimmed.slice(1).trim()}</span>
              </p>
            );
          }

          if (trimmed.includes("INCREASES approval chance") || trimmed.includes("DECREASES approval chance")) {
            const isPositive = trimmed.includes("INCREASES");
            return (
              <p key={i} className={`ml-5 text-sm ${isPositive ? "text-success" : "text-error"}`}>
                {trimmed}
              </p>
            );
          }

          if (trimmed.includes("[Significant") || trimmed.includes("[Moderate") || trimmed.includes("[Minor")) {
            const isPositive = trimmed.includes("positive");
            const isSignificant = trimmed.includes("Significant");
            const bgClass = isPositive
              ? (isSignificant ? "bg-success-dim text-success" : "bg-success-light text-success")
              : (isSignificant ? "bg-error-dim text-error" : "bg-error-light text-error");
            return (
              <p key={i} className={`ml-5 my-0.5 inline-block rounded px-2 py-0.5 text-xs ${bgClass}`}>
                {trimmed}
              </p>
            );
          }

          if (trimmed.includes("Baseline probability:") || trimmed.includes("Net factor impact:") || trimmed.includes("Final probability:")) {
            return (
              <p key={i} className="ml-3 flex justify-between font-semibold text-text">
                <span>{trimmed.split(":")[0]}:</span>
                <span className="text-right">{trimmed.split(":").slice(1).join(":")}</span>
              </p>
            );
          }

          if (trimmed.startsWith("DECISION:")) {
            const isApproved = trimmed.includes("APPROVED");
            return (
              <div key={i} className={`mt-2 rounded-lg px-3 py-2 text-lg font-bold ${isApproved ? "bg-success-dim text-success" : "bg-error-dim text-error"}`}>
                {trimmed}
              </div>
            );
          }

          if (trimmed.includes("outweigh") || trimmed.includes("ABOVE the threshold") || trimmed.includes("BELOW the threshold")) {
            return (
              <p key={i} className={`ml-3 text-sm ${trimmed.includes("ABOVE") || trimmed.includes("positive factors outweigh") ? "text-success" : "text-error"}`}>
                {trimmed}
              </p>
            );
          }

          if (trimmed.includes("Final score") && trimmed.includes("threshold")) {
            const isApproved = trimmed.includes("ABOVE");
            return (
              <p key={i} className={`ml-3 text-sm ${isApproved ? "text-success" : "text-error"}`}>
                {trimmed}
              </p>
            );
          }

          return (
            <p key={i} className="mb-1 text-text-muted">
              {trimmed}
            </p>
          );
        })}
      </div>
    </div>
  );
}
