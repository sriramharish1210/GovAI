import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Trash2, CheckCircle2, Compass } from 'lucide-react';
import { api, unwrap, errorMessage } from '../api';
import type { Reminder, Scheme } from '../../../shared/types';
import { useToast } from '../App';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { PageHeader, EmptyState, ErrorState, SectionHead, fmtDate } from './ui';

export const RemindersView: React.FC<{ onSelectScheme: (s: Scheme) => void }> = ({ onSelectScheme }) => {
  const { showToast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procRunning, setProcRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await api.getReminders();
    if (res.success && res.data) setReminders(res.data);
    else setError(res.error?.message ?? 'Could not load your reminders.');
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    try {
      unwrap(await api.deleteReminder(id));
      setReminders((p) => p.filter((r) => r.id !== id));
      showToast('Reminder removed');
    } catch (e) { showToast(errorMessage(e, 'Failed to remove reminder'), 'error'); }
  };

  // Development-only: manually runs the server's reminder job.
  const runProcessor = async () => {
    setProcRunning(true);
    const res = await api.triggerReminderProcess();
    if (res.success && res.data) {
      const { processed, sent, errors } = res.data.summary;
      showToast(`Processor run: ${processed} processed, ${sent} sent, ${errors} errors`, 'info');
      load();
    } else showToast(res.error?.message ?? 'Reminder processor failed', 'error');
    setProcRunning(false);
  };

  const pending = reminders.filter((r) => !r.isSent && r.scheme).sort((a, b) => +new Date(a.triggerDate) - +new Date(b.triggerDate));
  const sent = reminders.filter((r) => r.isSent && r.scheme);

  return (
    <div>
      <PageHeader kicker="Reminders" title="Deadline reminders" subtitle="Alerts before the schemes you care about close."
        actions={import.meta.env.DEV && <button className="btn btn-ghost btn-sm" onClick={runProcessor} disabled={procRunning}>{procRunning ? 'Running…' : 'Run reminder job (dev)'}</button>} />

      {error ? <ErrorState title="Couldn’t load reminders" message={error} onRetry={load} />
      : loading ? <div className="skeleton" style={{ height: 200, borderRadius: 18 }} />
      : pending.length + sent.length === 0 ? (
        <EmptyState icon={<Bell size={24} />} title="No reminders set"
          body="Open a scheme that has a deadline and choose “Remind me” — you can be alerted 30, 7 or 1 day before it closes."
          action={<Link className="btn btn-primary" to="/app/discover"><Compass size={16} /> Discover schemes</Link>} />
      ) : (
        <>
          {pending.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <SectionHead title={`Pending · ${pending.length}`} />
              <ul className="rem-list">
                {pending.map((r) => (
                  <li key={r.id} className="rem-item">
                    <span className="rem-badge"><Bell size={13} /> {r.daysBefore} day{r.daysBefore !== 1 ? 's' : ''} before</span>
                    <div className="rem-main">
                      <button className="trk-name" onClick={() => onSelectScheme(r.scheme!)}>{r.scheme!.name}</button>
                      <span>{r.scheme!.department}</span>
                      <span className="rem-when">Alert on {fmtDate(r.triggerDate)} {r.scheme!.deadline && <DeadlineBadge deadline={r.scheme!.deadline} />}</span>
                    </div>
                    <button className="ui-icon-btn" onClick={() => remove(r.id)} aria-label={`Delete reminder for ${r.scheme!.name}`}><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {sent.length > 0 && (
            <section>
              <SectionHead title={`Sent · ${sent.length}`} />
              <ul className="rem-list rem-sent">
                {sent.map((r) => (
                  <li key={r.id} className="rem-item">
                    <CheckCircle2 size={16} color="var(--success)" />
                    <div className="rem-main"><strong>{r.scheme!.name}</strong><span>Alert sent for {fmtDate(r.triggerDate)}</span></div>
                    <button className="ui-icon-btn" onClick={() => remove(r.id)} aria-label={`Remove ${r.scheme!.name}`}><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
};
