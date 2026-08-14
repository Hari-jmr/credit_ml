"use client";

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim"
      aria-hidden="true"
    >
      <path
        d="M5.5 7.5l4.5 4.5 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const inputBase =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-[14px] " +
  "text-text placeholder:text-text-dim/40 transition-all duration-150 " +
  "shadow-[0_1px_2px_rgba(0,0,0,0.03)] " +
  "hover:border-border-strong " +
  "focus:border-accent-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] focus:outline-none";

const labelBase = "text-[12.5px] font-semibold text-text";

interface NumberFieldProps {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  suffix?: string;
}

export function NumberField({ label, hint, value, onChange, step = 1, min, suffix }: NumberFieldProps) {
  // Ensure value is always a proper number without leading zeros
  const displayValue = value !== null && value !== undefined ? String(value) : "";
  
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelBase}>{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={displayValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
            } else {
              const parsed = parseFloat(raw);
              onChange(isNaN(parsed) ? null : parsed);
            }
          }}
          className={`${inputBase} ${suffix ? "pr-16" : ""}`}
          placeholder="0"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-text-dim">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="text-[11px] text-text-dim">{hint}</span>}
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({ label, hint, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelBase}>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} appearance-none pr-9`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-white">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown />
      </div>
      {hint && <span className="text-[11px] text-text-dim">{hint}</span>}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function TextField({ label, hint, value, onChange, placeholder }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelBase}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputBase}
      />
      {hint && <span className="text-[11px] text-text-dim">{hint}</span>}
    </label>
  );
}
