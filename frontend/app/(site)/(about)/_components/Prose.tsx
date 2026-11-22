import { cn } from '@/lib/utils';

/** Long-form reading column: left-aligned, < 75ch measure, generous leading. */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'max-w-[68ch] space-y-5 text-[1.0625rem] leading-[1.75] text-sand',
      '[&_h2]:pt-8 [&_h2]:text-[2rem] [&_h2]:leading-tight [&_h3]:pt-4 [&_h3]:text-2xl',
      '[&_a]:text-ivory [&_a]:underline [&_a]:decoration-line-strong [&_a]:underline-offset-4 hover:[&_a]:decoration-signal',
      '[&_strong]:font-medium [&_strong]:text-ivory [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5',
      className,
    )}>
      {children}
    </div>
  );
}

export function LegalMeta({ updated }: { updated: string }) {
  return <p className="text-sm text-stone">Last updated <span className="code">{updated}</span></p>;
}
