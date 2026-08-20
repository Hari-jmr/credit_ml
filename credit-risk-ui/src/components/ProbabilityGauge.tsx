"use client";

function getZoneColor(pct: number): string {
  if (pct < 40) return "var(--l2l-crit)";
  if (pct < 70) return "var(--l2l-warning)";
  return "var(--l2l-success)";
}

export function ProbabilityGauge({
  probability,
  threshold,
}: {
  probability: number;
  threshold: number;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(probability * 100)));
  const thresholdPct = Math.min(100, Math.max(0, Math.round(threshold * 100)));
  const barColor = getZoneColor(pct);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-text-muted">Approval probability</span>
        <span className="text-[28px] font-bold tabular-nums leading-none" style={{ color: barColor }}>
          {pct}%
        </span>
      </div>

      <div
        className="relative h-4 w-full overflow-hidden rounded-full"
        style={{
          background: `linear-gradient(to right,
            var(--l2l-crit-bg) 0%, var(--l2l-crit-bg) 40%,
            var(--l2l-warning-light) 40%, var(--l2l-warning-light) 70%,
            var(--l2l-success-light) 70%, var(--l2l-success-light) 100%)`,
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-text"
          style={{ left: `${thresholdPct}%`, zIndex: 2 }}
        />
      </div>

      <div className="flex justify-between text-xs text-text-dim font-mono">
        <span>0%</span>
        <span>Threshold · {thresholdPct}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
