import { ScaleIcon } from "@heroicons/react/24/solid";

export function ExplanationPanel({ explanation, modelName }: { explanation: string; modelName: string }) {
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

      <p className="text-[14px] leading-relaxed text-text">
        {explanation}
      </p>
    </div>
  );
}
