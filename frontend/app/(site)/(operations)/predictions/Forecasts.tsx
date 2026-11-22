'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError, useApi } from '@/lib/api';
import type { Disaster, Prediction } from '@/lib/types';
import { cn, pct } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/Badge';
import { ErrorState, LoadingRows, Skeleton } from '@/components/ui/DataState';
import { Field, Input } from '@/components/ui/Field';
import { PageHeader, Panel, Section } from '@/components/ui/Page';
import ModelCard from './ModelCard';
import DispatchBenchmark from './DispatchBenchmark';
import TriagePlayground from './TriagePlayground';

interface SurgeInputs {
  wind_speed: number; rainfall_mm: number; pressure_hpa: string; lat: number; lng: number;
  coast_distance_km: string; elevation_m: string; tidal_phase: number;
}

const PRESETS: { id: string; label: string; place: string; values: SurgeInputs }[] = [
  { id: 'puri', label: 'Severe cyclone at Puri', place: 'Puri, Odisha',
    values: { wind_speed: 142, rainfall_mm: 285, pressure_hpa: '966', lat: 19.8135, lng: 85.8312, coast_distance_km: '', elevation_m: '', tidal_phase: 0.6 } },
  { id: 'chennai', label: 'Cyclonic storm at Chennai', place: 'Chennai, Tamil Nadu',
    values: { wind_speed: 95, rainfall_mm: 210, pressure_hpa: '', lat: 13.0827, lng: 80.2707, coast_distance_km: '', elevation_m: '6', tidal_phase: 0 } },
  { id: 'delhi', label: 'Inland heat, no storm', place: 'New Delhi',
    values: { wind_speed: 18, rainfall_mm: 0, pressure_hpa: '', lat: 28.6139, lng: 77.209, coast_distance_km: '', elevation_m: '', tidal_phase: 0 } },
];

const FEATURE_LABEL: Record<string, string> = {
  x1_wind_norm: 'x₁ wind ÷ 250 km/h', x2_rain_norm: 'x₂ rainfall ÷ 500 mm', x3_pressure_deficit_hpa: 'x₃ pressure deficit (hPa)',
  x4_lat: 'x₄ latitude', x5_lng: 'x₅ longitude', x6_coast_distance_km: 'x₆ distance to coast (km)',
  x7_elevation_m: 'x₇ ground elevation (m)', x8_tidal_phase: 'x₈ tidal phase',
};

const optional = (v: string) => (v.trim() === '' ? undefined : Number(v));

function SurgeSandbox() {
  const [preset, setPreset] = useState('puri');
  const [inputs, setInputs] = useState<SurgeInputs>(PRESETS[0].values);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await api.post<Prediction>('/api/predict', {
          lat: inputs.lat, lng: inputs.lng, wind_speed: inputs.wind_speed, rainfall_mm: inputs.rainfall_mm,
          pressure_hpa: optional(inputs.pressure_hpa), coast_distance_km: optional(inputs.coast_distance_km),
          elevation_m: optional(inputs.elevation_m), tidal_phase: inputs.tidal_phase,
        });
        if (id === seq.current) { setResult(r); setError(null); }
      } catch (e) {
        if (id === seq.current) setError(e instanceof ApiError ? e.message : 'Forecast service unavailable');
      } finally {
        if (id === seq.current) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [inputs]);

  const set = <K extends keyof SurgeInputs>(k: K, v: SurgeInputs[K]) => { setPreset(''); setInputs((s) => ({ ...s, [k]: v })); };
  const trained = result?.severe_probability != null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <Panel className="space-y-6">
        <div className="space-y-2">
          <p className="text-[0.8125rem] font-medium text-sand">Start from a scenario</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => { setPreset(p.id); setInputs(p.values); }}
                className={cn('rounded-full px-3.5 py-1.5 text-[0.8125rem] ring-1 ring-inset transition-colors',
                  preset === p.id ? 'bg-signal/[0.12] text-ivory ring-signal/60' : 'text-sand ring-line-strong hover:text-ivory')}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5 border-t border-line pt-5">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-[0.8125rem]">
              <label htmlFor="wind" className="font-medium text-sand">Sustained wind</label>
              <span className="data text-ivory">{inputs.wind_speed} km/h</span>
            </div>
            <input id="wind" type="range" min={0} max={260} value={inputs.wind_speed} onChange={(e) => set('wind_speed', Number(e.target.value))} className="w-full accent-[rgb(255,107,0)]" />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-[0.8125rem]">
              <label htmlFor="rain" className="font-medium text-sand">24-hour rainfall</label>
              <span className="data text-ivory">{inputs.rainfall_mm} mm</span>
            </div>
            <input id="rain" type="range" min={0} max={600} step={5} value={inputs.rainfall_mm} onChange={(e) => set('rainfall_mm', Number(e.target.value))} className="w-full accent-[rgb(143,179,217)]" />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-[0.8125rem]">
              <label htmlFor="tide" className="font-medium text-sand">Tidal phase</label>
              <span className="data text-ivory">{inputs.tidal_phase > 0 ? '+' : ''}{inputs.tidal_phase.toFixed(1)} <span className="font-sans text-stone">{inputs.tidal_phase > 0.3 ? 'rising high tide' : inputs.tidal_phase < -0.3 ? 'low tide' : 'mid tide'}</span></span>
            </div>
            <input id="tide" type="range" min={-1} max={1} step={0.1} value={inputs.tidal_phase} onChange={(e) => set('tidal_phase', Number(e.target.value))} className="w-full accent-[rgb(212,180,131)]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude" htmlFor="lat"><Input id="lat" type="number" step="0.0001" min={-90} max={90} value={inputs.lat} onChange={(e) => set('lat', Number(e.target.value))} /></Field>
            <Field label="Longitude" htmlFor="lng"><Input id="lng" type="number" step="0.0001" min={-180} max={180} value={inputs.lng} onChange={(e) => set('lng', Number(e.target.value))} /></Field>
            <Field label="Central pressure (hPa)" htmlFor="pressure" hint="Blank: estimated from wind"><Input id="pressure" type="number" min={850} max={1050} placeholder="Auto" value={inputs.pressure_hpa} onChange={(e) => set('pressure_hpa', e.target.value)} /></Field>
            <Field label="Distance to coast (km)" htmlFor="coast" hint="Blank: measured from the coastline"><Input id="coast" type="number" min={0} placeholder="Auto" value={inputs.coast_distance_km} onChange={(e) => set('coast_distance_km', e.target.value)} /></Field>
            <Field label="Ground elevation (m)" htmlFor="elev" hint="Blank: coastal default" className="col-span-2 sm:col-span-1"><Input id="elev" type="number" min={-50} placeholder="Auto" value={inputs.elevation_m} onChange={(e) => set('elevation_m', e.target.value)} /></Field>
          </div>
        </div>
      </Panel>

      <div className="space-y-6" aria-live="polite">
        {error ? <ErrorState message={error} />
          : !result ? <Skeleton className="h-80" />
          : (
            <div className={cn('space-y-6 transition-opacity', busy && 'opacity-70')}>
              <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
                <div>
                  <p className="text-[0.8125rem] text-stone">Hazard probability</p>
                  <p className="numeral text-[5.5rem] leading-none sm:text-[6.5rem]">{pct(result.hazard_probability)}</p>
                </div>
                <div className="space-y-3 pb-2 text-right">
                  <SeverityBadge level={result.risk_level} className="text-sm" />
                  <p className="text-sm text-sand">Confidence {pct(result.confidence_score)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[0.8125rem] text-stone">Predicted storm surge at this point</p>
                  <p className="numeral mt-1 text-5xl">{result.predicted_surge_m}<span className="font-sans text-lg text-stone"> m</span></p>
                </div>
                <div>
                  <p className="text-[0.8125rem] text-stone">Inference time</p>
                  <p className="numeral mt-1 text-5xl">{result.latency_ms.toFixed(1)}<span className="font-sans text-lg text-stone"> ms</span></p>
                </div>
              </div>
              <table className="w-full text-[0.8125rem]">
                <caption className="mb-2 text-left text-[0.8125rem] font-medium text-sand">Engineered feature vector</caption>
                <tbody className="divide-y divide-line border-y border-line">
                  {Object.entries(result.features).map(([k, v]) => (
                    <tr key={k}><td className="py-2 text-stone">{FEATURE_LABEL[k] ?? k}</td><td className="data py-2 text-right text-ivory">{v}</td></tr>
                  ))}
                </tbody>
              </table>
              {trained && (
                <div className="grid grid-cols-2 gap-6 border-t border-line pt-6">
                  <div>
                    <p className="text-[0.8125rem] text-stone">Wind in 24 hours</p>
                    <p className="numeral mt-1 text-5xl">{Math.round(result.wind_24h_kmh ?? 0)}<span className="font-sans text-lg text-stone"> km/h</span></p>
                  </div>
                  <div>
                    <p className="text-[0.8125rem] text-stone">Severe cyclonic storm within 24 h</p>
                    <p className="numeral mt-1 text-5xl">{pct(result.severe_probability ?? 0)}</p>
                  </div>
                </div>
              )}
              <p className="text-xs leading-relaxed text-stone">
                <span className="code mr-1.5">{result.model}</span>
                {trained
                  ? 'Intensity and severe-storm probability come from XGBoost models trained on IBTrACS North Indian Ocean best tracks. Surge height is a calibrated physical estimate driven by the forecast peak wind — no open surge-observation archive exists for India to train on.'
                  : 'The trained cyclone models have not been exported to this deployment yet, so this is the calibrated physical estimator: inverse-barometer rise plus saturating wind set-up, decaying inland from the coastline.'}
              </p>
            </div>
          )}
        <dl className="grid gap-3 rounded-2xl border border-line p-5 text-[0.8125rem] sm:grid-cols-3">
          <div><dt><SeverityBadge level="CRITICAL" /></dt><dd className="mt-2 text-stone">Probability above 80%, or surge above 3 m</dd></div>
          <div><dt><SeverityBadge level="HIGH" /></dt><dd className="mt-2 text-stone">Probability between 50% and 80%</dd></div>
          <div><dt><SeverityBadge level="MODERATE" /></dt><dd className="mt-2 text-stone">Probability below 50%</dd></div>
        </dl>
      </div>
    </div>
  );
}

function IncidentForecasts() {
  const disasters = useApi<Disaster[]>('/api/disasters');
  const [rows, setRows] = useState<Record<string, Prediction | 'error'>>({});

  useEffect(() => {
    if (!disasters.data) return;
    let alive = true;
    disasters.data.forEach((d) => {
      api.post<Prediction>('/api/predict', { lat: d.lat, lng: d.lng, district: d.location, state: d.state,
        wind_speed: d.wind_speed_kmh ?? 0, rainfall_mm: d.rainfall_mm ?? 0 })
        .then((p) => alive && setRows((r) => ({ ...r, [d.id]: p })))
        .catch(() => alive && setRows((r) => ({ ...r, [d.id]: 'error' })));
    });
    return () => { alive = false; };
  }, [disasters.data]);

  if (disasters.loading && !disasters.data) return <LoadingRows rows={3} />;
  if (disasters.error) return <ErrorState message={disasters.error.message} onRetry={disasters.reload} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[0.8125rem] text-stone">
            <th className="py-3 pr-4 font-normal">Incident</th>
            <th className="py-3 pr-4 font-normal">Inputs</th>
            <th className="py-3 pr-4 text-right font-normal">Probability</th>
            <th className="py-3 pr-4 text-right font-normal">Surge</th>
            <th className="py-3 font-normal">Model risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {(disasters.data ?? []).map((d) => {
            const p = rows[d.id];
            return (
              <tr key={d.id}>
                <td className="py-4 pr-4">
                  <Link href={`/disasters/${d.id}`} className="text-ivory hover:text-signal">{d.title}</Link>
                  <p className="text-xs text-stone">{d.location}, {d.state}</p>
                </td>
                <td className="data py-4 pr-4 text-xs text-sand">{d.wind_speed_kmh ?? 0} km/h · {d.rainfall_mm ?? 0} mm</td>
                <td className="numeral py-4 pr-4 text-right text-2xl">{p && p !== 'error' ? pct(p.hazard_probability) : p === 'error' ? '—' : '…'}</td>
                <td className="data py-4 pr-4 text-right text-sand">{p && p !== 'error' ? `${p.predicted_surge_m} m` : ''}</td>
                <td className="py-4">{p && p !== 'error' ? <SeverityBadge level={p.risk_level} /> : p === 'error' ? <span className="text-xs text-critical">Unavailable</span> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-stone">The model scores storm-surge and cyclonic hazard. River floods, landslides and heatwaves read low here by design; their severity comes from field evidence on each dossier.</p>
    </div>
  );
}

export default function Forecasts() {
  return (
    <>
      <PageHeader
        label="Forecasting"
        title="See the surge before it reaches shore."
        lede="Test the storm-surge and hazard model against any coastal point, compare it across active incidents, and try the multilingual triage engine that reads field messages in under 35 milliseconds."
      />
      <Section title="Storm-surge sandbox" description="Adjust the atmospheric inputs; the forecast updates as you move." className="pt-0">
        <SurgeSandbox />
      </Section>
      <Section title="How the trained models perform" description="Measured on cyclones held out from training, against the simple baselines forecasters use.">
        <ModelCard />
      </Section>
      <Section title="How dispatch performs" description="The live Sperling engine measured against exact optimisation and a nearest-responder baseline.">
        <DispatchBenchmark />
      </Section>
      <Section title="Forecasts for active incidents">
        <IncidentForecasts />
      </Section>
      <Section title="Laya multilingual triage" description="Paste a distress message in any Indian language. Laya classifies it without generating text, so it cannot invent details.">
        <TriagePlayground />
      </Section>
    </>
  );
}
