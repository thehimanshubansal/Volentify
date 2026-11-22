import { AlertTriangle, Inbox, RotateCw } from 'lucide-react';
import type { DataSource } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-ivory/[0.05]', className)} aria-hidden />;
}

export function LoadingRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-20" />)}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-start gap-3 rounded-2xl border border-critical/25 bg-critical/[0.05] p-5', className)} role="alert">
      <div className="flex items-center gap-2 text-sm text-ivory">
        <AlertTriangle className="h-4 w-4 text-critical" aria-hidden />
        {message}
      </div>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}><RotateCw className="h-3.5 w-3.5" />Try again</Button>}
    </div>
  );
}

export function EmptyState({ title, body, action, className }: { title: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center', className)}>
      <Inbox className="h-5 w-5 text-stone" aria-hidden />
      <p className="font-serif text-xl text-ivory">{title}</p>
      {body && <p className="max-w-sm text-sm text-stone">{body}</p>}
      {action}
    </div>
  );
}

const SOURCE_LABEL: Record<DataSource, { text: string; tone: string; title: string }> = {
  database: { text: 'Live database', tone: 'text-low', title: 'Served from the operational Neon PostgreSQL database' },
  fallback: { text: 'Database offline', tone: 'text-moderate', title: 'Database unreachable — showing live hazard feeds only; saved records will return when it reconnects' },
  memory: { text: 'Not saved', tone: 'text-stone', title: 'No database connected — live hazard feeds are shown, but nothing created here is stored' },
  request: { text: 'Custom input', tone: 'text-stone', title: 'Computed from the data you supplied' },
};

/** Small provenance marker so operators always know whether data is live. */
export function SourceTag({ source, className }: { source: DataSource | null; className?: string }) {
  if (!source) return null;
  const s = SOURCE_LABEL[source];
  return (
    <span title={s.title} className={cn('inline-flex items-center gap-1.5 text-xs', s.tone, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {s.text}
    </span>
  );
}
