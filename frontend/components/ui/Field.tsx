import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

const control =
  'rounded-[10px] border border-line bg-ink-800 px-3.5 text-[0.9375rem] text-ivory placeholder:text-ash transition-colors focus:border-signal/70 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-signal/20 disabled:opacity-50';

/** Full width unless the caller sets its own width. */
const height = (className?: string) => (className && /(^|\s)h-/.test(className) ? '' : 'h-11');
const width = (className?: string) => (className && /(^|\s)(w-|min-w-|max-w-)/.test(className) ? '' : 'w-full');

export function Field({
  label, hint, error, children, className, htmlFor,
}: { label: string; hint?: string; error?: string | null; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[0.8125rem] font-medium text-sand">{label}</label>
      {children}
      {error ? <p className="text-xs text-critical" role="alert">{error}</p> : hint ? <p className="text-xs text-stone">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest }, ref,
) {
  return <input ref={ref} className={cn(control, width(className), height(className), className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest }, ref,
) {
  return <textarea ref={ref} className={cn(control, width(className), 'min-h-[110px] py-3 leading-relaxed', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest }, ref,
) {
  return (
    <select ref={ref} className={cn(control, width(className), height(className), 'appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 fill=%27none%27 stroke=%27%238d887e%27 stroke-width=%271.5%27%3E%3Cpath d=%27m3 4.5 3 3 3-3%27/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-10', className)} {...rest}>
      {children}
    </select>
  );
});

/** Multi-select chips (skills, equipment, dependencies). */
export function ChipGroup<T extends string>({
  options, value, onChange, label,
}: { options: readonly T[]; value: T[]; onChange: (next: T[]) => void; label: string }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="space-y-2">
      <p id={id} className="text-[0.8125rem] font-medium text-sand">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== opt) : [...value, opt])}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[0.8125rem] ring-1 ring-inset transition-colors',
                on ? 'bg-signal/[0.12] text-ivory ring-signal/60' : 'text-sand ring-line-strong hover:text-ivory hover:ring-ivory/30',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Single choice segmented control. */
export function Segmented<T extends string>({
  options, value, onChange, size = 'md', ariaLabel,
}: { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md'; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-[10px] border border-line bg-ink-800 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[0.8125rem]',
            value === o.value ? 'bg-ivory/[0.1] text-ivory' : 'text-stone hover:text-sand',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
