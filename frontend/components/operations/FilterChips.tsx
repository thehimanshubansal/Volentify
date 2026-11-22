'use client';

import { cn } from '@/lib/utils';

/** Single-choice filter chips used across operations lists. */
export function FilterChips<T extends string>({
  label, options, value, onChange,
}: { label: string; options: readonly { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[0.8125rem] text-stone">{label}</span>
      {options.map((o) => (
        <button
          key={o.value || 'all'}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3 py-1 text-[0.8125rem] ring-1 ring-inset transition-colors',
            value === o.value ? 'bg-ivory/[0.1] text-ivory ring-ivory/30' : 'text-stone ring-line hover:text-sand hover:ring-line-strong',
          )}
        >
          {o.label}
          {o.count != null && <span className="ml-1.5 text-ash">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
