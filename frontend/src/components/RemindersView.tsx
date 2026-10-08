import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Reminder, Scheme } from '../../../shared/types';
import { Bell, Trash2, CheckCircle } from 'lucide-react';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { useToast } from '../App';

interface RemindersViewProps {
  onSelectScheme: (s: Scheme) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({ onSelectScheme }) => {
  const { showToast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [procRunning, setProcRunning] = useState(false);
  const [devMode, setDevMode]     = useState(false);

  useEffect(() => { fetchReminders(); }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await api.getReminders();
      if (res.success && res.data) setReminders(res.data);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      showToast('Reminder removed');
    } catch { showToast('Failed to remove reminder', 'error'); }
  };

  const handleRunProcessor = async () => {
    setProcRunning(true);
    try {
      const res = await api.triggerReminderProcess();
      if (res.success && res.data) {
        const { processed, sent, errors } = res.data.summary;
        showToast(`Processor run: ${processed} processed, ${sent} sent, ${errors} errors`, 'info');
        fetchReminders();
      }
    } finally { setProcRunning(false); }
  };

  const active  = reminders.filter((r) => !r.isSent);
  const sent    = reminders.filter((r) => r.isSent);

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Reminders</h1></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2].map((i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Reminders</h1>
            <p className="page-subtitle">Deadline alerts for your saved schemes</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setDevMode((v) => !v)} style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
            {devMode ? 'Hide dev tools' : 'Dev tools'}
          </button>
        </div>
      </div>

      {/* Dev mode: processor */}
      {devMode && (
        <div className="card" style={{ marginBottom: 16, border: '1px dashed var(--border-strong)', background: 'var(--surface)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: 10 }}>Developer Tools</div>
          <button className="btn btn-secondary btn-sm" onClick={handleRunProcessor} disabled={procRunning}>
            {procRunning ? <><div className="spinner spinner-blue" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running…</> : 'Run Reminder Processor'}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: 8 }}>
            Manually triggers the cron job to simulate email dispatch. For testing only.
          </p>
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={28} style={{ color: 'var(--text-4)' }} /></div>
            <div className="empty-state-title">No reminders set</div>
            <p className="empty-state-body">
              Set deadline reminders from any scheme detail page. GovAI will alert you 30, 7, or 1 day before the application closes.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Active reminders */}
          {active.length > 0 && (
            <>
              <div className="section-head">
                <span className="section-title">Pending — {active.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {active.map((r) => {
                  const scheme = r.scheme;
                  if (!scheme) return null;
                  return (
                    <div key={r.id} className="card" style={{ padding: '18px 22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)', padding: '2px 9px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                              <Bell size={11} style={{ display: 'inline', marginRight: 3 }} />{r.daysBefore}-day alert
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)', marginBottom: 4 }}>{scheme.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 6 }}>{scheme.department}</div>
                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-3)' }}>
                            <span>Trigger: {new Date(r.triggerDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {scheme.deadline && <DeadlineBadge deadline={scheme.deadline} />}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => onSelectScheme(scheme)}>Details</button>
                          <button className="btn btn-ghost btn-icon-sm" onClick={() => handleDelete(r.id)} aria-label="Delete reminder" style={{ color: 'var(--danger)' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Sent reminders */}
          {sent.length > 0 && (
            <>
              <div className="section-head">
                <span className="section-title" style={{ color: 'var(--text-3)' }}>Sent — {sent.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sent.map((r) => {
                  const scheme = r.scheme;
                  if (!scheme) return null;
                  return (
                    <div key={r.id} className="card" style={{ padding: '14px 20px', opacity: 0.7 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-1)' }}>{scheme.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                            <CheckCircle size={12} color="var(--success)" /> Alert sent on {new Date(r.triggerDate).toLocaleDateString()}
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-icon-sm" onClick={() => handleDelete(r.id)} aria-label="Remove" style={{ color: 'var(--text-4)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
