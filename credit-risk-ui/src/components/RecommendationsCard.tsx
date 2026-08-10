import { CheckCircleIcon, LightBulbIcon } from "@heroicons/react/24/solid";

const recommendations = [
  "Improve credit bureau score",
  "Reduce debt service ratio",
  "Increase collateral or equity contribution",
  "Apply for a lower loan amount",
  "Increase monthly disposable income",
];

export function RecommendationsCard() {
  return (
    <div className="card-base card-hover animate-fade-in">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-light">
          <LightBulbIcon className="h-5 w-5 text-gold-dark" />
        </div>
        <h3 className="text-[15px] font-semibold text-text">
          Recommendations to improve approval chances
        </h3>
      </div>
      <div className="space-y-0.5">
        {recommendations.map((rec) => (
          <div
            key={rec}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-text transition-colors hover:bg-surface-2"
          >
            <CheckCircleIcon className="h-4 w-4 shrink-0 text-success" />
            <span>{rec}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
