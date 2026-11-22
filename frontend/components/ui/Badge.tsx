import { SEVERITY_META } from '@/lib/constants';
import type { Severity } from '@/lib/types';
import { cn } from '@/lib/utils';

export function SeverityBadge({ level, className }: { level: Severity; className?: string }) {
  const m = SEVERITY_META[level];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', m.text, m.ring, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', m.bg)} aria-hidden />
      {m.label}
    </span>
  );
}

type Tone = 'neutral' | 'signal' | 'good' | 'warn' | 'bad' | 'gold' | 'info';
const tones: Record<Tone, string> = {
  neutral: 'text-sand ring-line-strong',
  signal: 'text-signal ring-signal/30',
  good: 'text-low ring-low/30',
  warn: 'text-moderate ring-moderate/30',
  bad: 'text-critical ring-critical/30',
  gold: 'text-gold ring-gold/35',
  info: 'text-info ring-info/30',
};

export function Pill({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)} aria-hidden>
      <span className="absolute inset-0 rounded-full bg-signal animate-pulse-ring" />
      <span className="relative h-2 w-2 rounded-full bg-signal" />
    </span>
  );
}
