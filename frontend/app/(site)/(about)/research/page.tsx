import type { Metadata } from 'next';
import { PageHeader, Section } from '@/components/ui/Page';
import { Pill } from '@/components/ui/Badge';
import { Prose } from '../_components/Prose';

export const metadata: Metadata = { title: 'Research' };

type Status = 'Measured' | 'Specification target' | 'Planned';
const MODELS: { name: string; status: Status; figure: string; detail: string }[] = [
  { name: 'Cyclone intensity & severe-storm models', status: 'Measured', figure: 'Held-out storm scores on the Forecasts page · retrained weekly', detail: 'Two XGBoost models trained on NOAA IBTrACS North Indian Ocean best tracks since 1980: the 24-hour change in maximum wind, and the probability of reaching severe cyclonic storm strength (≥ 48 kt). Evaluated with storm-grouped cross-validation against persistence and climatology.' },
  { name: 'Priority-driven dispatch', status: 'Measured', figure: 'Benchmark against exact optimisation on the Forecasts page · rerun weekly', detail: 'Greedy lexicographic allocation with skill scarcity, an anti-squander penalty, distance decay and fatigue, compared each week with the Hungarian optimum, an exact priority MILP and a nearest-responder baseline.' },
  { name: 'Storm-surge & hazard model', status: 'Specification target', figure: 'Surge RMSE ±0.28 m · < 50 ms', detail: 'A calibrated physical estimator (inverse barometer, saturating wind set-up, rain, tide, coastline decay) driven by the trained 24-hour wind forecast. Not yet validated against observations: no open storm-surge record exists for India.' },
  { name: 'Laya multilingual triage', status: 'Specification target', figure: '< 35 ms end to end', detail: 'Three tiers: a local router package, a hosted endpoint, and a deterministic lexicon matcher across Indian scripts that always answers in under a millisecond. Each call returns its measured latency.' },
  { name: 'Report corroboration', status: 'Specification target', figure: 'Clusters within 15 km and 2 h', detail: 'Spatio-temporal clustering with optional Gemini merging of corroborated facts and 150-word briefings.' },
  { name: 'SitRep language model', status: 'Planned', figure: 'F1 98.1% · 110 ms CPU (target)', detail: 'Multilingual DistilBERT with category, urgency and entity heads, planned as an INT8 ONNX model for on-device use. Not built yet.' },
];

const PAPERS = [
  { venue: 'Volentify ML Plan, v3.5', year: '2026', title: 'Priority-driven heuristic dispatch for spontaneous volunteers in Indian disaster response', note: 'Sperling heuristic formulation, scoring function and comparison against branch-and-cut MILP allocation.' },
  { venue: 'Volentify ML Plan, v3.5', year: '2026', title: 'Spatial hazard probability from coastal meteorology and elevation', note: 'Feature design and risk thresholds for the storm-surge classifier on North Indian Ocean cyclone tracks.' },
  { venue: 'Volentify Mesh specification', year: '2026', title: 'Store-and-forward reporting over BLE for disaster zones without connectivity', note: 'Event envelope, hop budget, deduplication and idempotent gateway synchronisation.' },
];

export default function ResearchPage() {
  return (
    <>
      <PageHeader
        label="Research"
        title="The methods behind the platform."
        lede="How each model and engine works, what has been measured, and what is still a target."
      />
      <Section title="Models and engines">
        <div className="rounded-2xl border border-gold/25 bg-gold/[0.04] p-4 text-sm leading-relaxed text-sand">
          Each figure is labelled. <strong className="font-medium text-ivory">Measured</strong> results are recomputed by the weekly
          pipeline and published on the forecasting page; <strong className="font-medium text-ivory">specification targets</strong> are
          goals from the product specification that have not yet been independently measured.
        </div>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {MODELS.map((m) => (
            <div key={m.name} className="grid gap-3 py-6 md:grid-cols-[16rem_1fr_17rem] md:gap-8">
              <h3 className="text-2xl">{m.name}</h3>
              <p className="max-w-[62ch] text-sm leading-relaxed text-stone">{m.detail}</p>
              <div className="space-y-2 md:text-right">
                <Pill tone={m.status === 'Measured' ? 'gold' : 'neutral'} className="w-fit md:ml-auto">{m.status}</Pill>
                <p className="text-sm text-ivory">{m.figure}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Working papers">
        <ul className="grid gap-4 md:grid-cols-3">
          {PAPERS.map((p) => (
            <li key={p.title} className="panel flex flex-col gap-3 p-6">
              <Pill tone="gold" className="w-fit">{p.venue} · {p.year}</Pill>
              <h3 className="text-2xl leading-snug">{p.title}</h3>
              <p className="text-sm leading-relaxed text-stone">{p.note}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Citing Volentify">
        <Prose>
          <p>If you use the platform, data model or dispatch method in your work, please cite the repository:</p>
          <pre className="overflow-x-auto rounded-xl border border-line bg-ink-900 p-4 font-mono text-[0.8125rem] leading-relaxed text-sand">{`@software{volentify_2026,
  title  = {Volentify: Disaster Intelligence, Offline Mesh Coordination and ML Forecasting},
  year   = {2026},
  url    = {https://github.com/Gyanvir/Volentify},
  license= {MIT}
}`}</pre>
        </Prose>
      </Section>
    </>
  );
}
