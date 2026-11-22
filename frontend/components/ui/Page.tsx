import { cn } from '@/lib/utils';

/** Standard page opening: label, serif title, lede, optional actions. */
export function PageHeader({
  label, title, lede, actions, meta, className,
}: { label?: string; title: React.ReactNode; lede?: React.ReactNode; actions?: React.ReactNode; meta?: React.ReactNode; className?: string }) {
  return (
    <header className={cn('page pb-10 pt-14 sm:pt-20', className)}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-4">
          {label && <p className="eyebrow">{label}</p>}
          <h1 className="display text-balance text-[2.75rem] sm:text-6xl">{title}</h1>
          {lede && <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-stone">{lede}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {meta && <div className="mt-8">{meta}</div>}
    </header>
  );
}

export function Section({
  title, description, actions, children, className,
}: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('page py-10', className)}>
      {(title || actions) && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            {title && <h2 className="text-[1.75rem] leading-tight sm:text-[2rem]">{title}</h2>}
            {description && <p className="max-w-2xl text-sm text-stone">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Panel({ children, className, as: Tag = 'div' }: { children: React.ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'aside' }) {
  return <Tag className={cn('panel p-5 sm:p-6', className)}>{children}</Tag>;
}

export function Stat({ label, value, note, className }: { label: string; value: React.ReactNode; note?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[0.8125rem] text-stone">{label}</p>
      <p className="numeral text-4xl leading-none">{value}</p>
      {note && <p className="text-xs text-stone">{note}</p>}
    </div>
  );
}
