import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

interface Dataset {
  id: number; source_name: string; source_url: string; data_kind: string; outcome_scope: string;
  record_count: number; date_start: string; date_end: string; trained: boolean;
  report: { train_days: number; holdout_days: number; metrics: Record<string, {
    status: string; mae?: number; baseline_mae?: number; beats_baseline?: boolean;
  }> } | null;
}
interface Outcome { expected: number; baseline: number; error_band: number[]; }
interface Outlook {
  status: string; reason?: string; limitations: string; index_definition?: string; dataset?: Dataset;
  forecast_days: { date: string; mortality_risk_index: number | null; deaths?: Outcome; admissions?: Outcome; outside_training_range: boolean }[];
}
const errorText = (err: any) => typeof err?.response?.data?.detail === 'string'
  ? err.response.data.detail : 'Request failed. Check the CSV fields, account permissions and connection.';

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
  const [outlook, setOutlook] = useState<Outlook | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const input = 'w-full rounded-xl border ts-border ts-card p-3 text-sm ts-text-primary';
  const button = 'rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40';
  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/api/health-data/areas', { signal: controller.signal }).then(({ data }) => {
      const requestedWard = new URLSearchParams(window.location.search).get('ward');
      setAreas(data.areas); setColumns(data.csv_columns);
      setArea(data.areas.some((a: { id: string }) => a.id === requestedWard) ? requestedWard! : data.areas[0]?.id || '');
    }).catch(err => { if (!controller.signal.aborted) setError(errorText(err)); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!area) return;
    const controller = new AbortController();
    setDatasets([]); setSelected(''); setOutlook(null); setNotice(''); setError('');
    apiClient.get('/api/health-data/datasets', { params: { area_id: area }, signal: controller.signal })
      .then(({ data }) => setDatasets(data.datasets))
      .catch(err => { if (!controller.signal.aborted) setError(errorText(err)); });
    return () => controller.abort();
  }, [area]);
  const importData = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !area) return;
    if (file.size > 2_000_000) { setError('CSV must be smaller than 2 MB.'); return; }
    setBusy(true); setError(''); setOutlook(null); setNotice('');
    try {
      const { data } = await apiClient.post<Dataset>('/api/health-data/datasets', {
        area_id: area, source_name: sourceName, source_url: sourceUrl,
        data_kind: kind, outcome_scope: scope, csv_text: await file.text(),
      });
      setDatasets(previous => [data, ...previous]); setSelected(String(data.id));
      setNotice(`Imported ${data.record_count} daily records. Train the model to review its validation results.`);
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  const train = async () => {
    setBusy(true); setError(''); setNotice(''); setOutlook(null);
    try {
      const { data } = await apiClient.post<Dataset>(`/api/health-data/datasets/${selected}/train`, {}, { timeout: 120000 });
      setDatasets(previous => previous.map(d => d.id === data.id ? data : d));
      setNotice('Training complete. Review holdout errors before interpreting the outlook.');
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  const forecast = async () => {
    setBusy(true); setError(''); setNotice(''); setOutlook(null);
    try {
      const { data } = await apiClient.get<Outlook>(`/api/health-data/outlook/${area}`, {
        params: selected ? { dataset_id: selected } : {}, timeout: 60000,
      });
      setOutlook(data);
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  const download = (contents: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const activeDataset = datasets.find(d => String(d.id) === selected);
  const formatOutcome = (value?: Outcome) => value ? `${value.expected.toFixed(1)} (${value.error_band.map(v => v.toFixed(1)).join('–')})` : 'Insufficient events';
  return <section className="rounded-3xl ts-card border ts-border p-6 space-y-5" aria-label="Health surveillance and mortality outlook">
    <div><p className="text-xs uppercase tracking-wider font-bold text-indigo-500">Ward health surveillance</p>
      <h2 className="text-xl font-bold ts-text-primary mt-1">Mortality & hospital demand outlook</h2>
      <p className="text-sm ts-text-muted mt-2">Connect daily ward totals and demographics to forecast the next five days. Estimates remain experimental until independently validated.</p></div>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    {notice && <p role="status" className="text-sm ts-text-primary">{notice}</p>}
    <label className="block text-sm ts-text-primary">Ward<select className={input} value={area} disabled={busy || !areas.length} onChange={e => setArea(e.target.value)}>
      {!areas.length && <option>No wards available in your jurisdiction</option>}{areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select></label>
    <details className="rounded-xl border ts-border p-4"><summary className="cursor-pointer font-semibold ts-text-primary">Import health and demographic data</summary>
      <p className="text-sm ts-text-muted my-3">Aggregate daily totals only. Training needs 90 consecutive days; missing days must not be filled with zero events. Weather fields must describe the same peak-WBGT hour each day. Fractions use 0–1; wind uses m/s and radiation W/m².</p>
      <button type="button" className="text-sm text-indigo-500 underline mb-4" onClick={() => download(columns.join(',') + '\n', 'ward-health-template.csv', 'text/csv')}>Download CSV template</button>
      <form onSubmit={importData} className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm ts-text-primary">Source organisation<input required minLength={3} maxLength={200} className={input} value={sourceName} onChange={e => setSourceName(e.target.value)} /></label>
        <label className="text-sm ts-text-primary">Source reference URL<input type="url" required className={input} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} /></label>
        <label className="text-sm ts-text-primary">Data origin<select className={input} value={kind} onChange={e => setKind(e.target.value)}><option value="observed">Observed surveillance records</option><option value="synthetic_demo">Synthetic demonstration</option></select></label>
        <label className="text-sm ts-text-primary">Outcome definition<select className={input} value={scope} onChange={e => setScope(e.target.value)}><option value="all_cause">All-cause counts</option><option value="heat_related">Recorded heat-related counts</option></select></label>
        <label className="text-sm ts-text-primary sm:col-span-2">CSV file<input type="file" accept=".csv,text/csv" required className={input} onChange={e => setFile(e.target.files?.[0] || null)} /></label>
        <button className={button} disabled={busy || !area || !file}>{busy ? 'Processing…' : 'Import dataset'}</button>
      </form></details>
    <label className="block text-sm ts-text-primary">Dataset<select className={input} value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); setOutlook(null); setNotice(''); }}>
      <option value="">Latest trained observed dataset</option>{datasets.map(d => <option key={d.id} value={d.id}>#{d.id} · {d.source_name} · {d.data_kind === 'synthetic_demo' ? 'DEMO · ' : ''}{d.record_count} days · {d.trained ? 'trained' : 'untrained'}</option>)}
    </select></label>
    {activeDataset && <p className="text-xs ts-text-muted">{activeDataset.date_start} to {activeDataset.date_end} · {activeDataset.outcome_scope.replace('_', '-')} · <a className="underline" href={activeDataset.source_url} target="_blank" rel="noreferrer">Source reference</a></p>}
    <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || !selected} onClick={train}>Train & validate</button>
      <button className={button} disabled={busy || !area || (!!selected && !activeDataset?.trained)} onClick={forecast}>{busy ? 'Processing…' : 'Generate five-day outlook'}</button></div>
    {activeDataset?.report && <div className="rounded-xl ts-card-subtle p-4 text-sm ts-text-primary">
      <p className="font-semibold">Chronological validation: {activeDataset.report.train_days} training days / {activeDataset.report.holdout_days} held-out days</p>
      {Object.entries(activeDataset.report.metrics).map(([name, metric]) => <p key={name} className="mt-2">{name}: {metric.status === 'EVALUATED' ? `MAE ${metric.mae} events/day; calendar baseline ${metric.baseline_mae}. ${metric.beats_baseline ? 'Improves on baseline.' : 'Does not improve on baseline — use cautiously.'}` : 'Insufficient events to estimate this outcome.'}</p>)}</div>}
    {outlook && <div className="space-y-3"><p className="font-semibold ts-text-primary">{outlook.status === 'DEMO_MODEL' ? 'SYNTHETIC DEMONSTRATION — illustrative counts' : outlook.status.split('_').join(' ')}</p>
      {outlook.reason && <p className="text-sm ts-text-muted">{outlook.reason}</p>}
      {!!outlook.forecast_days.length && <><p className="text-sm ts-text-muted">{outlook.dataset?.outcome_scope === 'all_cause' ? 'All-cause totals; these are not heat-attributable counts.' : 'Recorded heat-related events.'} Parentheses show retrospective error bands.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left ts-text-primary"><thead><tr className="border-b ts-border"><th className="p-2">Date</th><th className="p-2">Deaths (band)</th><th className="p-2">Admissions (band)</th><th className="p-2">Mortality index</th></tr></thead><tbody>
          {outlook.forecast_days.map(d => <tr key={d.date} className="border-b ts-border"><td className="p-2">{d.date}{d.outside_training_range && <span className="block text-xs text-amber-600">Outside training weather range</span>}</td><td className="p-2">{formatOutcome(d.deaths)}</td><td className="p-2">{formatOutcome(d.admissions)}</td><td className="p-2">{d.mortality_risk_index ?? 'Unavailable'}</td></tr>)}
        </tbody></table></div><p className="text-xs ts-text-muted">{outlook.index_definition}</p>
        <button className="text-sm text-indigo-500 underline" onClick={() => download(JSON.stringify(outlook, null, 2), `health-outlook-${area}.json`, 'application/json')}>Download forecast and provenance</button></>}
      <p className="text-xs ts-text-muted">{outlook.limitations}</p></div>}
  </section>;
};
