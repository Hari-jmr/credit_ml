import { ScaleIcon } from "@heroicons/react/24/solid";

export function ExplanationPanel({ explanation, modelName }: { explanation: string; modelName: string }) {
  const paragraphs = explanation.split("\n\n");
  
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

      <div className="text-[14px] leading-relaxed text-text">
        {paragraphs.map((paragraph, i) => {
          if (paragraph.trim() === "") return null;
          
          // Check if it's a section header
          if (paragraph.endsWith(":") && !paragraph.includes("•")) {
            return (
              <h4 key={i} className="mt-4 mb-2 font-semibold text-navy">
                {paragraph}
              </h4>
            );
          }
          
          // Check if it contains bullet points
          if (paragraph.includes("•")) {
            const lines = paragraph.split("\n").filter(l => l.trim());
            return (
              <ul key={i} className="ml-4 space-y-1">
                {lines.map((line, j) => (
                  <li key={j} className="text-text-muted">{line.replace("• ", "")}</li>
                ))}
              </ul>
            );
          }
          
          return (
            <p key={i} className="mb-2">
              {paragraph}
            </p>
          );
        })}
      </div>
    </div>
  );
}
