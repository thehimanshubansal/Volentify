import Link from 'next/link';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,color,border-color,opacity] duration-200 disabled:pointer-events-none disabled:opacity-45';
const variants: Record<Variant, string> = {
  primary: 'bg-signal text-ink hover:bg-signal-soft',
  secondary: 'border border-line-strong text-ivory hover:border-ivory/40 hover:bg-ivory/[0.04]',
  ghost: 'text-sand hover:bg-ivory/[0.06] hover:text-ivory',
  danger: 'bg-critical text-ink hover:bg-critical/85',
  quiet: 'bg-ivory/[0.06] text-ivory hover:bg-ivory/[0.1]',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 rounded-lg px-3 text-[0.8125rem]',
  md: 'h-10 rounded-[10px] px-4 text-sm',
  lg: 'h-12 rounded-full px-6 text-[0.9375rem]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href, variant = 'primary', size = 'md', className, children, ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: React.ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const external = href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:');
  const cls = cn(base, variants[variant], sizes[size], className);
  return external ? (
    <a href={href} className={cls} {...rest}>{children}</a>
  ) : (
    <Link href={href} className={cls} {...rest}>{children}</Link>
  );
}
