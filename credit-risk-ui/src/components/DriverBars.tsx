import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/20/solid";
import { Driver } from "@/lib/api";

interface DriverBarsProps {
  drivers: Driver[];
  otherCount?: number;
  otherShapSum?: number;
  coveragePct?: number;
}

function Bar({
  label,
  valueText,
  shapValue,
  caption,
  maxAbs,
  muted,
}: {
  label: string;
  valueText: string;
  shapValue: number;
  caption: string;
  maxAbs: number;
  muted?: boolean;
}) {
  const halfWidthPct = Math.round((Math.abs(shapValue) / maxAbs) * 50);
  const isPositive = shapValue >= 0;
  const barColor = isPositive ? "var(--success)" : "var(--error)";
  const barBg = isPositive ? "var(--success-light)" : "var(--error-light)";

  return (
    <div className={`flex flex-col gap-1.5 ${muted ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          {isPositive ? (
            <ArrowTrendingUpIcon className="h-3.5 w-3.5 shrink-0 text-success" />
          ) : (
            <ArrowTrendingDownIcon className="h-3.5 w-3.5 shrink-0 text-error" />
          )}
          <span className={`text-[13px] font-medium truncate ${muted ? "italic text-text-muted" : "text-text"}`}>
            {label}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-dim">{valueText}</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="absolute inset-y-0 rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${halfWidthPct}%`,
            backgroundColor: barColor,
            [isPositive ? "left" : "right"]: "50%",
          }}
        />
      </div>
      <span className="font-mono text-[10.5px] tabular-nums" style={{ color: barColor }}>
        {shapValue >= 0 ? "+" : ""}{shapValue.toFixed(3)} · {caption}
      </span>
    </div>
  );
}

export function DriverBars({ drivers, otherCount, otherShapSum, coveragePct }: DriverBarsProps) {
  const maxAbs = Math.max(
    ...drivers.map((d) => Math.abs(d.shap)),
    Math.abs(otherShapSum ?? 0),
    0.0001
  );

  return (
    <div className="flex flex-col gap-4">
      {typeof coveragePct === "number" && (
        <p className="text-xs text-text-muted">
          Top {drivers.length} factors account for {coveragePct.toFixed(0)}% of the model&apos;s reasoning on this application.
        </p>
      )}
      {drivers.map((d) => (
        <Bar
          key={d.feature}
          label={d.label}
          valueText={typeof d.value === "number" ? d.value.toFixed(2) : d.value ?? "n/a"}
          shapValue={d.shap}
          caption={d.direction}
          maxAbs={maxAbs}
        />
      ))}
      {typeof otherCount === "number" && otherCount > 0 && typeof otherShapSum === "number" && (
        <Bar
          label={`+${otherCount} other factors`}
          valueText=""
          shapValue={otherShapSum}
          caption={otherShapSum >= 0 ? "net towards approval" : "net towards rejection"}
          maxAbs={maxAbs}
          muted
        />
      )}
    </div>
  );
}
