import { DerivedFeatures, DERIVED_LABELS } from "@/lib/deriveFeatures";

function formatValue(key: keyof DerivedFeatures, v: number | null): string {
  if (v === null || Number.isNaN(v)) return "\u2014";
  if (key === "employment_tenure_ordinal" || key === "risk_grade_ordinal" || key === "loan_cycle_ordinal") {
    return String(Math.round(v));
  }
  return v.toFixed(3);
}

export function DerivedPanel({ derived }: { derived: DerivedFeatures }) {
  const entries = Object.entries(derived) as [keyof DerivedFeatures, number | null][];
  const filledCount = entries.filter(([, v]) => v !== null).length;

  return (
    <div className="overflow-hidden card-base">
      <div className="-mx-6 -mt-6 mb-6 flex items-center gap-3 border-b border-border bg-surface-2 px-6 py-3.5 max-sm:-mx-4 max-sm:-mt-4 max-sm:mb-4 max-sm:px-4 max-sm:py-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent-weak text-accent text-xs font-bold">
          fx
        </span>
        <h2 className="text-[13px] font-bold text-text uppercase tracking-[0.04em] sm:text-[13px]">Derived Features</h2>
        <span className="ml-auto font-mono text-xs text-text-dim">
          {filledCount}/{entries.length}
        </span>
      </div>
      <dl>
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-border/40 last:border-b-0"
          >
            <dt className="text-[13px] text-text-muted">{DERIVED_LABELS[key]}</dt>
            <dd
              className={`font-mono text-sm tabular-nums ${
                value === null ? "text-text-dim" : "font-medium text-accent"
              }`}
            >
              {formatValue(key, value)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="-mx-6 -mb-6 mt-4 border-t border-border bg-surface-2 px-6 py-4 text-[12px] leading-relaxed text-text-muted max-sm:-mx-4 max-sm:px-4">
        Auto-computed from form fields. These values feed the model &mdash; not entered directly.
      </p>
    </div>
  );
}
