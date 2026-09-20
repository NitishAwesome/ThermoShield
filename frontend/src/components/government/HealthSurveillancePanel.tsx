import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { Globe, BarChart2, ShieldCheck, HeartPulse, Download, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface Dataset {
  id: number;
  source_name: string;
  source_url: string;
  data_kind: string;
  outcome_scope: string;
  record_count: number;
  date_start: string;
  date_end: string;
  trained: boolean;
  report: {
    train_days: number;
    holdout_days: number;
    metrics: Record<string, {
      status: string;
      mae?: number;
      baseline_mae?: number;
      beats_baseline?: boolean;
    }>;
  } | null;
}

interface Outcome {
  expected: number;
  baseline: number;
  error_band: number[];
}

interface Outlook {
  status: string;
  reason?: string;
  limitations: string;
  index_definition?: string;
  dataset?: Dataset;
  model_description?: string;
  bilingual_advisory?: { en: string; hi: string };
  forecast_days: {
    date: string;
    estimated_wbgt_c?: number;
    mortality_risk_index: number | null;
    excess_mortality_pct?: number;
    hospitalization_surge_pct?: number;
    deaths?: Outcome;
    admissions?: Outcome;
    outside_training_range: boolean;
    model_type?: string;
  }[];
}

const errorText = (err: any) =>
  typeof err?.response?.data?.detail === 'string'
    ? err.response.data.detail
    : 'Request failed. Check the CSV fields, account permissions and connection.';

export const HealthSurveillancePanel: React.FC = () => {
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [area, setArea] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selected, setSelected] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [kind, setKind] = useState('observed');
  const [scope, setScope] = useState('all_cause');
  const [file, setFile] = useState<File | null>(null);

  // Model Source Switcher (Gap 7 — PS 26083)
  const [modelSource, setModelSource] = useState<'baseline' | 'surveillance'>('baseline');
  const [baselineOutlook, setBaselineOutlook] = useState<Outlook | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState<boolean>(false);
  const [advisoryLang, setAdvisoryLang] = useState<'en' | 'hi'>('en');

  // Municipal surveillance outlook
  const [outlook, setOutlook] = useState<Outlook | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const input = 'w-full rounded-xl border ts-border ts-card p-3 text-sm ts-text-primary';
  const button = 'rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition-colors shadow-sm cursor-pointer';

  // Load available wards on mount
  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/api/health-data/areas', { signal: controller.signal })
      .then(({ data }) => {
        const requestedWard = new URLSearchParams(window.location.search).get('ward');
        setAreas(data.areas);
        setColumns(data.csv_columns);
        setArea(data.areas.some((a: { id: string }) => a.id === requestedWard) ? requestedWard! : data.areas[0]?.id || '');
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(errorText(err));
      });
    return () => controller.abort();
  }, []);

  // Load datasets when ward changes
  useEffect(() => {
    if (!area) return;
    const controller = new AbortController();
    setDatasets([]);
    setSelected('');
    setOutlook(null);
    setNotice('');
    setError('');
    apiClient.get('/api/health-data/datasets', { params: { area_id: area }, signal: controller.signal })
      .then(({ data }) => setDatasets(data.datasets))
      .catch(err => {
        if (!controller.signal.aborted) setError(errorText(err));
      });
    return () => controller.abort();
  }, [area]);

  // Load Calibrated National Baseline Outlook whenever ward or modelSource is 'baseline'
  useEffect(() => {
    if (!area || modelSource !== 'baseline') return;
    setLoadingBaseline(true);
    setError('');
    apiClient.get<Outlook>(`/api/health-data/baseline-outlook/${area}`)
      .then(({ data }) => setBaselineOutlook(data))
      .catch(err => {
        setError(errorText(err));
        setBaselineOutlook(null);
      })
      .finally(() => setLoadingBaseline(false));
  }, [area, modelSource]);

  const importData = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !area) return;
    if (file.size > 2_000_000) {
      setError('CSV must be smaller than 2 MB.');
      return;
    }
    setBusy(true);
    setError('');
    setOutlook(null);
    setNotice('');
    try {
      const { data } = await apiClient.post<Dataset>('/api/health-data/datasets', {
        area_id: area,
        source_name: sourceName,
        source_url: sourceUrl,
        data_kind: kind,
        outcome_scope: scope,
        csv_text: await file.text(),
      });
      setDatasets(previous => [data, ...previous]);
      setSelected(String(data.id));
      setNotice(`Imported ${data.record_count} daily records. Train the model to review its validation results.`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const train = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    setOutlook(null);
    try {
      const { data } = await apiClient.post<Dataset>(`/api/health-data/datasets/${selected}/train`, {}, { timeout: 120000 });
      setDatasets(previous => previous.map(d => d.id === data.id ? data : d));
      setNotice('Training complete. Review holdout errors before interpreting the outlook.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const forecast = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    setOutlook(null);
    try {
      const { data } = await apiClient.get<Outlook>(`/api/health-data/outlook/${area}`, {
        params: selected ? { dataset_id: selected } : {},
        timeout: 60000,
      });
      setOutlook(data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const download = (contents: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const activeDataset = datasets.find(d => String(d.id) === selected);
  const formatOutcome = (value?: Outcome) =>
    value
      ? `${value.expected.toFixed(1)} (${value.error_band.map(v => v.toFixed(1)).join('–')})`
      : 'Insufficient events';

  return (
    <section className="rounded-3xl ts-card border ts-border p-6 space-y-5" aria-label="Health surveillance and mortality outlook">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-indigo-500">Ward health surveillance</p>
          <h2 className="text-xl font-bold ts-text-primary mt-1">Mortality & hospital demand outlook</h2>
          <p className="text-sm ts-text-muted mt-1">
            Epidemiological early warning linking thermal strain and local demographics to projected health outcomes.
          </p>
        </div>

        {/* Model Source Switcher (Gap 7) */}
        <div className="flex p-1 rounded-2xl bg-slate-800/80 border ts-border shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setModelSource('baseline'); setError(''); }}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              modelSource === 'baseline'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>National Baseline</span>
            <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.2 rounded font-normal">Automated</span>
          </button>
          <button
            type="button"
            onClick={() => { setModelSource('surveillance'); setError(''); }}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              modelSource === 'surveillance'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Municipal Records</span>
            <span className="text-[10px] bg-slate-700 px-1.5 py-0.2 rounded font-normal">CSV</span>
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-400 font-medium">{notice}</p>}

      {/* Ward Selector */}
      <label className="block text-sm ts-text-primary">
        Ward
        <select
          className={input}
          value={area}
          disabled={busy || !areas.length}
          onChange={e => setArea(e.target.value)}
        >
          {!areas.length && <option>No wards available in your jurisdiction</option>}
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>

      {/* ─── TAB 1: CALIBRATED NATIONAL BASELINE (Automated, No CSV Required) ─── */}
      {modelSource === 'baseline' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Calibrated National Baseline Outlook
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                  Zero Upload Required
                </span>
              </div>

              {/* Advisory language toggle */}
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setAdvisoryLang('en')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    advisoryLang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setAdvisoryLang('hi')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    advisoryLang === 'hi' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>
            <p className="text-xs ts-text-muted leading-relaxed">
              {baselineOutlook?.model_description ||
                'Calibrated to published Indian municipal heat-health curves (Ahmedabad HAP / Mavalankar et al. 2014 & Lancet Planetary Health 2021). Evaluates population exposure and elderly/outdoor-worker vulnerability across 5 forecast days.'}
            </p>
          </div>

          {loadingBaseline && (
            <div className="p-6 text-center text-xs ts-text-muted flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading 5-day calibrated baseline health outlook...</span>
            </div>
          )}

          {baselineOutlook && !loadingBaseline && (
            <div className="space-y-4">
              {/* Forecast Table */}
              <div className="overflow-x-auto rounded-2xl border ts-border">
                <table className="w-full text-sm text-left ts-text-primary">
                  <thead>
                    <tr className="border-b ts-border bg-slate-900/40 text-xs">
                      <th className="p-3">Date</th>
                      <th className="p-3">WBGT</th>
                      <th className="p-3">Mortality Risk Index</th>
                      <th className="p-3">Excess Mortality</th>
                      <th className="p-3">Hospital Surge</th>
                      <th className="p-3">Deaths (band)</th>
                      <th className="p-3">Admissions (band)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baselineOutlook.forecast_days.map(d => {
                      const mi = d.mortality_risk_index ?? 0;
                      const miBadge =
                        mi >= 60 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        mi >= 30 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                        'bg-amber-500/20 text-amber-400 border-amber-500/30';
                      return (
                        <tr key={d.date} className="border-b ts-border hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-mono text-xs">{d.date}</td>
                          <td className="p-3 font-mono text-xs font-bold text-orange-400">
                            {d.estimated_wbgt_c ? `${d.estimated_wbgt_c}°C` : '—'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${miBadge}`}>
                              {d.mortality_risk_index !== null ? `${d.mortality_risk_index}/100` : '—'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-rose-400 font-semibold">
                            {d.excess_mortality_pct !== undefined ? `+${d.excess_mortality_pct}%` : '—'}
                          </td>
                          <td className="p-3 font-mono text-xs text-amber-400 font-semibold">
                            {d.hospitalization_surge_pct !== undefined ? `+${d.hospitalization_surge_pct}%` : '—'}
                          </td>
                          <td className="p-3 text-xs">{formatOutcome(d.deaths)}</td>
                          <td className="p-3 text-xs">{formatOutcome(d.admissions)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bilingual Public Health Advisory Card */}
              {baselineOutlook.bilingual_advisory && (
                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                    <span>📢 Public Health Advisory ({advisoryLang === 'en' ? 'English' : 'हिन्दी'})</span>
                    <span className="text-[10px] font-normal text-slate-400">Published Directive</span>
                  </div>
                  <p className="text-xs ts-text-primary leading-relaxed">
                    {baselineOutlook.bilingual_advisory[advisoryLang]}
                  </p>
                </div>
              )}

              {/* Index definition & provenance note */}
              <div className="space-y-1.5 text-xs ts-text-muted">
                <p>{baselineOutlook.index_definition}</p>
                <p className="italic">{baselineOutlook.limitations}</p>
              </div>

              <button
                type="button"
                className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer flex items-center gap-1 font-medium"
                onClick={() => download(JSON.stringify(baselineOutlook, null, 2), `baseline-health-outlook-${area}.json`, 'application/json')}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download calibrated baseline outlook & provenance JSON</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: MUNICIPAL SURVEILLANCE RECORDS (CSV Training & Validation) ─── */}
      {modelSource === 'surveillance' && (
        <div className="space-y-5">
          <details className="rounded-xl border ts-border p-4">
            <summary className="cursor-pointer font-semibold ts-text-primary">
              Import municipal surveillance data (CSV)
            </summary>
            <p className="text-sm ts-text-muted my-3">
              Aggregate daily totals only. Training needs 90 consecutive days; missing days must not be filled with zero events. Weather fields must describe the same peak-WBGT hour each day. Fractions use 0–1; wind uses m/s and radiation W/m².
            </p>
            <button
              type="button"
              className="text-sm text-indigo-400 hover:text-indigo-300 underline mb-4 cursor-pointer"
              onClick={() => download(columns.join(',') + '\n', 'ward-health-template.csv', 'text/csv')}
            >
              Download CSV template
            </button>
            <form onSubmit={importData} className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm ts-text-primary">
                Source organisation
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  className={input}
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                />
              </label>
              <label className="text-sm ts-text-primary">
                Source reference URL
                <input
                  type="url"
                  required
                  className={input}
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                />
              </label>
              <label className="text-sm ts-text-primary">
                Data origin
                <select className={input} value={kind} onChange={e => setKind(e.target.value)}>
                  <option value="observed">Observed surveillance records</option>
                  <option value="synthetic_demo">Synthetic demonstration</option>
                </select>
              </label>
              <label className="text-sm ts-text-primary">
                Outcome definition
                <select className={input} value={scope} onChange={e => setScope(e.target.value)}>
                  <option value="all_cause">All-cause counts</option>
                  <option value="heat_related">Recorded heat-related counts</option>
                </select>
              </label>
              <label className="text-sm ts-text-primary sm:col-span-2">
                CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  required
                  className={input}
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </label>
              <button className={button} disabled={busy || !area || !file}>
                {busy ? 'Processing…' : 'Import dataset'}
              </button>
            </form>
          </details>

          <label className="block text-sm ts-text-primary">
            Dataset
            <select
              className={input}
              value={selected}
              disabled={busy}
              onChange={e => { setSelected(e.target.value); setOutlook(null); setNotice(''); }}
            >
              <option value="">Latest trained observed dataset</option>
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  #{d.id} · {d.source_name} · {d.data_kind === 'synthetic_demo' ? 'DEMO · ' : ''}{d.record_count} days · {d.trained ? 'trained' : 'untrained'}
                </option>
              ))}
            </select>
          </label>

          {activeDataset && (
            <p className="text-xs ts-text-muted">
              {activeDataset.date_start} to {activeDataset.date_end} · {activeDataset.outcome_scope.replace('_', '-')} ·{' '}
              <a className="underline" href={activeDataset.source_url} target="_blank" rel="noreferrer">
                Source reference
              </a>
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button className={button} disabled={busy || !selected} onClick={train}>
              Train & validate
            </button>
            <button className={button} disabled={busy || !area || (!!selected && !activeDataset?.trained)} onClick={forecast}>
              {busy ? 'Processing…' : 'Generate five-day outlook'}
            </button>
          </div>

          {activeDataset?.report && (
            <div className="rounded-xl ts-card-subtle p-4 text-sm ts-text-primary space-y-1">
              <p className="font-semibold">
                Chronological validation: {activeDataset.report.train_days} training days / {activeDataset.report.holdout_days} held-out days
              </p>
              {Object.entries(activeDataset.report.metrics).map(([name, metric]) => (
                <p key={name} className="text-xs">
                  {name}: {metric.status === 'EVALUATED'
                    ? `MAE ${metric.mae} events/day; calendar baseline ${metric.baseline_mae}. ${metric.beats_baseline ? 'Improves on baseline.' : 'Does not improve on baseline — use cautiously.'}`
                    : 'Insufficient events to estimate this outcome.'}
                </p>
              ))}
            </div>
          )}

          {outlook && (
            <div className="space-y-3">
              <p className="font-semibold ts-text-primary">
                {outlook.status === 'DEMO_MODEL' ? 'SYNTHETIC DEMONSTRATION — illustrative counts' : outlook.status.split('_').join(' ')}
              </p>
              {outlook.reason && <p className="text-sm ts-text-muted">{outlook.reason}</p>}
              {!!outlook.forecast_days.length && (
                <>
                  <p className="text-sm ts-text-muted">
                    {outlook.dataset?.outcome_scope === 'all_cause' ? 'All-cause totals; these are not heat-attributable counts.' : 'Recorded heat-related events.'} Parentheses show retrospective error bands.
                  </p>
                  <div className="overflow-x-auto rounded-2xl border ts-border">
                    <table className="w-full text-sm text-left ts-text-primary">
                      <thead>
                        <tr className="border-b ts-border bg-slate-900/40 text-xs">
                          <th className="p-3">Date</th>
                          <th className="p-3">Deaths (band)</th>
                          <th className="p-3">Admissions (band)</th>
                          <th className="p-3">Mortality index</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outlook.forecast_days.map(d => (
                          <tr key={d.date} className="border-b ts-border hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-xs">
                              {d.date}
                              {d.outside_training_range && (
                                <span className="block text-[10px] text-amber-500 font-medium">Outside training weather range</span>
                              )}
                            </td>
                            <td className="p-3 text-xs">{formatOutcome(d.deaths)}</td>
                            <td className="p-3 text-xs">{formatOutcome(d.admissions)}</td>
                            <td className="p-3 text-xs font-mono font-bold">{d.mortality_risk_index ?? 'Unavailable'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs ts-text-muted">{outlook.index_definition}</p>
                  <button
                    type="button"
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer flex items-center gap-1 font-medium"
                    onClick={() => download(JSON.stringify(outlook, null, 2), `health-outlook-${area}.json`, 'application/json')}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download forecast and provenance</span>
                  </button>
                </>
              )}
              <p className="text-xs ts-text-muted">{outlook.limitations}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
