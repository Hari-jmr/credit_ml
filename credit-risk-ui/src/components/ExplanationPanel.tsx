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

      <div className="font-mono text-[13px] leading-relaxed text-text">
        {lines.map((line, i) => {
          // Section headers (all caps with colons or === lines)
          if (line === "" || line === "=" .repeat(50) || line === "-" .repeat(40)) {
            return <div key={i} className="h-2" />;
          }
          
          // RESULT line
          if (line.startsWith("RESULT:")) {
            const isApproved = line.includes("APPROVED");
            return (
              <div key={i} className={`text-lg font-bold ${isApproved ? "text-green-600" : "text-red-600"}`}>
                {line}
              </div>
            );
          }
          
          // Section headers
          if (line === line.toUpperCase() && line.length > 10 && !line.includes(":")) {
            return (
              <h4 key={i} className="mt-4 mb-2 font-bold text-navy uppercase tracking-wide">
                {line}
              </h4>
            );
          }
          
          // Probability line
          if (line.includes("Probability:") || line.includes("threshold:")) {
            return (
              <p key={i} className="text-text-muted">
                {line}
              </p>
            );
          }
          
          // Factor lines with + or -
          if (line.trim().startsWith("+") || line.trim().startsWith("-")) {
            const isPositive = line.trim().startsWith("+");
            return (
              <p key={i} className={`ml-2 ${isPositive ? "text-green-700" : "text-red-700"}`}>
                {line}
              </p>
            );
          }
          
          // Impact lines
          if (line.includes("INCREASES") || line.includes("DECREASES")) {
            const isPositive = line.includes("INCREASES");
            return (
              <p key={i} className={`ml-4 text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {line}
              </p>
            );
          }
          
          // Impact level
          if (line.includes("[Significant") || line.includes("[Moderate") || line.includes("[Minor")) {
            return (
              <p key={i} className="ml-4 text-xs text-text-muted italic">
                {line}
              </p>
            );
          }
          
          // Summary section
          if (line.includes("Baseline probability:") || line.includes("Net factor impact:") || line.includes("Final probability:")) {
            return (
              <p key={i} className="ml-2 font-semibold text-navy">
                {line}
              </p>
            );
          }
          
          // DECISION line
          if (line.startsWith("DECISION:")) {
            const isApproved = line.includes("APPROVED");
            return (
              <div key={i} className={`mt-2 text-lg font-bold ${isApproved ? "text-green-600" : "text-red-600"}`}>
                {line}
              </div>
            );
          }
          
          // Default line
          return (
            <p key={i} className="text-text-muted">
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}
