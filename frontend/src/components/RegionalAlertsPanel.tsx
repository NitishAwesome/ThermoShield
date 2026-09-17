import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

interface Subscription { area_id: string; sms_enabled: boolean; whatsapp_enabled: boolean; consent_at: string | null; }
interface Delivery { id: number; channel: string; forecast_date: string; risk_level: string; status: string; error: string | null; }
interface Channels { sms: { display_status: string }; whatsapp: { display_status: string }; automation_enabled: boolean; }

export const RegionalAlertsPanel: React.FC<{ authority?: boolean }> = ({ authority = false }) => {
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [area, setArea] = useState('');
  const [channels, setChannels] = useState<Channels | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [sms, setSms] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [consent, setConsent] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fail = (err: any) => setError(typeof err?.response?.data?.detail === 'string' ? err.response.data.detail : 'Unable to load regional alerts. Check your connection and account permissions.');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([apiClient.get('/api/regional-alerts/areas', { signal: controller.signal }),
      authority ? apiClient.get('/api/health-data/areas', { signal: controller.signal }) : apiClient.get('/api/regional-alerts/subscriptions', { signal: controller.signal }),
    ]).then(([meta, data]) => {
      setChannels(meta.data); const available = authority ? data.data.areas : meta.data.areas;
      setAreas(available); setArea(available[0]?.id || ''); if (!authority) setSubscriptions(data.data.subscriptions);
    }).catch(err => { if (!controller.signal.aborted) fail(err); });
    return () => controller.abort();
  }, [authority]);
  useEffect(() => {
    setNotice(''); setError('');
    if (!authority) { const current = subscriptions.find(s => s.area_id === area);
      setSms(!!current?.sms_enabled); setWhatsapp(!!current?.whatsapp_enabled); setConsent(!!current?.consent_at); return; }
    if (!area) return;
    const controller = new AbortController(); setDeliveries([]);
    apiClient.get('/api/regional-alerts/deliveries', { params: { area_id: area }, signal: controller.signal })
      .then(({ data }) => setDeliveries(data.deliveries)).catch(err => { if (!controller.signal.aborted) fail(err); });
    return () => controller.abort();
  }, [area, authority, subscriptions]);
  const save = async () => {
    setBusy(true); setError(''); setNotice('');
    try { const { data } = await apiClient.put<Subscription>(`/api/regional-alerts/subscriptions/${area}`, { sms_enabled: sms, whatsapp_enabled: whatsapp, consent });
      setSubscriptions(previous => [...previous.filter(s => s.area_id !== area), data]);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  const evaluate = async () => {
    setBusy(true); setError(''); setNotice('');
    try { const { data } = await apiClient.post(`/api/regional-alerts/evaluate/${area}`, {}, { timeout: 120000 });
      setNotice(`${data.status.split('_').join(' ')} · ${data.dispatch_count ?? 0} new delivery attempts`);
      const history = await apiClient.get('/api/regional-alerts/deliveries', { params: { area_id: area } }); setDeliveries(history.data.deliveries);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  return <section className="rounded-3xl ts-card border ts-border p-6 space-y-4" aria-label="Regional phone alerts">
    <h2 className="text-xl font-bold ts-text-primary">{authority ? 'Regional alert dispatch' : 'SMS & WhatsApp ward alerts'}</h2>
    <p className="text-sm ts-text-muted">{authority ? 'Evaluate the ward forecast and notify consenting subscribers when severe heat is forecast. Duplicate warnings are suppressed.' : 'Choose a ward and the channels you want. Alerts use the phone number saved in your profile. Unsubscribe by turning both channels off.'}</p>
    {channels && <p className="text-xs ts-text-muted">SMS: {channels.sms.display_status} · WhatsApp: {channels.whatsapp.display_status} · Scheduled dispatch: {channels.automation_enabled ? 'enabled' : 'disabled'}</p>}
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}{notice && <p role="status" className="text-sm ts-text-primary">{notice}</p>}
    <label className="block text-sm ts-text-primary">Ward<select disabled={busy || !areas.length} value={area} onChange={e => setArea(e.target.value)} className="w-full rounded-xl ts-card border ts-border p-3">
      {!areas.length && <option>No wards available</option>}{areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select></label>
    {authority ? <><button disabled={busy || !area} onClick={evaluate} className="rounded-xl bg-purple-600 px-4 py-2.5 text-white text-sm font-semibold disabled:opacity-40">{busy ? 'Evaluating…' : 'Evaluate & dispatch ward alerts'}</button>
      <p className="text-xs ts-text-muted">ACCEPTED means the gateway accepted the message. DELIVERED requires a signed provider receipt. SIMULATED sends nothing.</p>
      {deliveries.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm ts-text-primary"><thead><tr><th className="p-2">Channel</th><th className="p-2">Forecast date</th><th className="p-2">Risk</th><th className="p-2">Delivery</th></tr></thead><tbody>{deliveries.map(d => <tr className="border-t ts-border" key={d.id}><td className="p-2">{d.channel}</td><td className="p-2">{d.forecast_date}</td><td className="p-2">{d.risk_level}</td><td className="p-2">{d.status}{d.error && <span className="block text-xs text-red-500">{d.error}</span>}</td></tr>)}</tbody></table></div> : <p className="text-sm ts-text-muted">No delivery attempts for this ward yet.</p>}</> : <>
      <div className="flex flex-wrap gap-6 text-sm ts-text-primary"><label><input type="checkbox" checked={sms} onChange={e => setSms(e.target.checked)} /> SMS</label><label><input type="checkbox" checked={whatsapp} onChange={e => setWhatsapp(e.target.checked)} /> WhatsApp</label></div>
      <label className="flex gap-2 items-start text-sm ts-text-muted"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>I own the phone number in my profile and consent to heat warnings for this ward through the selected channels.</span></label>
      <button disabled={busy || !area || ((sms || whatsapp) && !consent)} onClick={save} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-white text-sm font-semibold disabled:opacity-40">{busy ? 'Saving…' : 'Save ward alert preferences'}</button>
      <p className="text-xs ts-text-muted">Saved wards: {subscriptions.filter(s => s.sms_enabled || s.whatsapp_enabled).map(s => areas.find(a => a.id === s.area_id)?.name || s.area_id).join('; ') || 'None'}</p></>}
  </section>;
};
