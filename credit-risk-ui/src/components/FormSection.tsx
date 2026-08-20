interface FormSectionProps {
  number: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({ number, title, description, children }: FormSectionProps) {
  return (
    <section className="overflow-hidden card-base">
      <div className="-mx-6 -mt-6 mb-6 flex items-center gap-3 border-b border-border bg-surface-2 px-6 py-3.5 max-sm:-mx-4 max-sm:-mt-4 max-sm:mb-4 max-sm:px-4 max-sm:py-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white text-xs font-bold">
          {number}
        </span>
        <h2 className="text-[13px] font-bold text-text uppercase tracking-[0.04em] sm:text-[13px]">{title}</h2>
        {description && <span className="ml-auto text-xs text-text-dim">{description}</span>}
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">{children}</div>
    </section>
  );
}
