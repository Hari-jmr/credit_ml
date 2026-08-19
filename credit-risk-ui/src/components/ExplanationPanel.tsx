import { ScaleIcon } from "@heroicons/react/24/solid";

export function ExplanationPanel({ explanation, modelName }: { explanation: string; modelName: string }) {
  const lines = explanation.split("\n");
  
  return (
    <div className="card-base card-hover animate-fade-in">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/10">
          <ScaleIcon className="h-5 w-5 text-navy" />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-text">Assessment Rationale</h3>
          <p className="text-xs text-text-muted">{modelName} analysis</p>
        </div>
      </div>

      <div className="text-[13px] leading-relaxed text-text">
        {lines.map((line, i) => {
          const trimmed = line.trim();

          // Blank lines
          if (trimmed === "" || trimmed === "=".repeat(50) || trimmed === "-".repeat(40)) {
            return <div key={i} className="h-3" />;
          }
          
          // RESULT line
          if (trimmed.startsWith("RESULT:")) {
            const isApproved = trimmed.includes("APPROVED");
            return (
              <div key={i} className={`mb-1 text-lg font-bold ${isApproved ? "text-green-600" : "text-red-600"}`}>
                {trimmed}
              </div>
            );
          }
          
          // Probability line
          if (trimmed.includes("Probability:") && trimmed.includes("Threshold:")) {
            return (
              <p key={i} className="mb-1 text-sm font-medium text-text-muted">
                {trimmed}
              </p>
            );
          }
          
          // Section headers (all caps, no colons, longer text)
          if (trimmed === trimmed.toUpperCase() && trimmed.length > 10 && !trimmed.includes(":") && !trimmed.includes("|")) {
            return (
              <h4 key={i} className="mt-5 mb-2 border-b border-navy/20 pb-1 font-bold text-navy uppercase tracking-wide">
                {trimmed}
              </h4>
            );
          }
          
          // Baseline / context paragraph
          if (trimmed.toLowerCase().includes("baseline approval rate") || trimmed.toLowerCase().includes("does not meet") || trimmed.toLowerCase().includes("meets the approval")) {
            return (
              <p key={i} className="mb-1 text-text-muted">
                {trimmed}
              </p>
            );
          }
          
          // Factor lines with + or -
          if (trimmed.startsWith("+ ") || trimmed.startsWith("- ")) {
            const isPositive = trimmed.startsWith("+");
            return (
              <p key={i} className={`ml-3 flex items-start gap-2 ${isPositive ? "text-green-700" : "text-red-700"}`}>
                <span className="font-bold">{trimmed.charAt(0)}</span>
                <span>{trimmed.slice(1).trim()}</span>
              </p>
            );
          }
          
          // Impact description lines
          if (trimmed.includes("INCREASES approval chance") || trimmed.includes("DECREASES approval chance")) {
            const isPositive = trimmed.includes("INCREASES");
            return (
              <p key={i} className={`ml-5 text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {trimmed}
              </p>
            );
          }
          
          // Impact level tags
          if (trimmed.includes("[Significant") || trimmed.includes("[Moderate") || trimmed.includes("[Minor")) {
            const isPositive = trimmed.includes("positive");
            const isSignificant = trimmed.includes("Significant");
            const bgClass = isPositive
              ? (isSignificant ? "bg-green-100 text-green-800" : "bg-green-50 text-green-700")
              : (isSignificant ? "bg-red-100 text-red-800" : "bg-red-50 text-red-700");
            return (
              <p key={i} className={`ml-5 my-0.5 inline-block rounded px-2 py-0.5 text-xs ${bgClass}`}>
                {trimmed}
              </p>
            );
          }
          
          // Summary statistics
          if (trimmed.includes("Baseline probability:") || trimmed.includes("Net factor impact:") || trimmed.includes("Final probability:")) {
            return (
              <p key={i} className="ml-3 flex justify-between font-semibold text-navy">
                <span>{trimmed.split(":")[0]}:</span>
                <span className="text-right">{trimmed.split(":").slice(1).join(":")}</span>
              </p>
            );
          }
          
          // DECISION line
          if (trimmed.startsWith("DECISION:")) {
            const isApproved = trimmed.includes("APPROVED");
            return (
              <div key={i} className={`mt-2 rounded-lg px-3 py-2 text-lg font-bold ${isApproved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {trimmed}
              </div>
            );
          }
          
          // Supporting text (outweigh statements)
          if (trimmed.includes("outweigh") || trimmed.includes("ABOVE the threshold") || trimmed.includes("BELOW the threshold")) {
            return (
              <p key={i} className={`ml-3 text-sm ${trimmed.includes("ABOVE") || trimmed.includes("positive factors outweigh") ? "text-green-700" : "text-red-700"}`}>
                {trimmed}
              </p>
            );
          }
          
          // Final score line
          if (trimmed.includes("Final score") && trimmed.includes("threshold")) {
            const isApproved = trimmed.includes("ABOVE");
            return (
              <p key={i} className={`ml-3 text-sm ${isApproved ? "text-green-700" : "text-red-700"}`}>
                {trimmed}
              </p>
            );
          }
          
          // Default line
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
