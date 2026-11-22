'use client';

import { useApi } from '@/lib/api';
import type { ModelCard as Card } from '@/lib/types';
import { Panel } from '@/components/ui/Page';
import { EmptyState, Skeleton } from '@/components/ui/DataState';

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-[0.8125rem] text-stone">{label}</dt>
      <dd className="numeral text-3xl">{value}</dd>
      {note && <dd className="text-xs text-stone">{note}</dd>}
    </div>
  );
}

const fmt = (v: number | null | undefined, digits = 2) => (v == null ? '—' : v.toFixed(digits));

/** How well the trained cyclone models actually perform, measured on storms they never saw. */
export default function ModelCard() {
  const { data, loading } = useApi<{ trained: boolean; cyclone: Card | null }>('/api/ml/models');
  if (loading) return <Skeleton className="h-56" />;
  const card = data?.cyclone;
  if (!card) {
    return (
      <EmptyState
        title="Models not trained yet"
        body="Run the “Train cyclone models” GitHub workflow. It downloads IBTrACS, evaluates on held-out storms and publishes the results here."
      />
    );
  }
  const i = card.metrics.intensity_24h;
  const s = card.metrics.severe_24h;
  return (
    <Panel className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-sand">
          {card.data.storms.toLocaleString('en-IN')} cyclones · {card.data.fixes.toLocaleString('en-IN')} six-hourly fixes ·{' '}
          {card.data.first.slice(0, 4)}–{card.data.last.slice(0, 4)}
        </p>
        <p className="code">{card.name}@{card.version}</p>
      </div>
      <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="24 h intensity error" value={`${fmt(i.mae_kt_with_history, 1)} kt`}
          note={`Persistence: ${fmt(i.mae_kt_persistence, 1)} kt · single report: ${fmt(i.mae_kt_single_report, 1)} kt`} />
        <Metric label="Skill over persistence" value={i.skill_vs_persistence == null ? '—' : `${Math.round(i.skill_vs_persistence * 100)}%`}
          note="Reduction in mean absolute error" />
        <Metric label="Severe-storm ROC AUC" value={fmt(s.auc_with_history)}
          note={`Single report: ${fmt(s.auc_single_report)} · still weak storms: ${fmt(s.auc_below_threshold)}`} />
        <Metric label="Brier skill score" value={fmt(s.brier_skill_score)}
          note={`vs. climatology (base rate ${Math.round(s.base_rate * 100)}%)`} />
      </dl>
      <p className="max-w-3xl text-xs leading-relaxed text-stone">
        {card.data.source}. Scores come from {card.metrics.folds}-fold {card.evaluation}: every storm is held out
        whole, so these numbers describe performance on cyclones the model has never seen. Retrained weekly.
      </p>
    </Panel>
  );
}
