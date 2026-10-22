import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Clock, Send, Award, List, Columns3, Compass } from 'lucide-react';
import { api, unwrap, errorMessage } from '../api';
import type { Application, Scheme } from '../../../shared/types';
import { useToast } from '../App';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { PageHeader, EmptyState, ErrorState } from './ui';

const STAGES = [
  { key: 'PLANNING_TO_APPLY', label: 'Planning', icon: <Clock size={15} /> },
  { key: 'APPLIED', label: 'Applied', icon: <Send size={15} /> },
  { key: 'COMPLETED', label: 'Completed', icon: <Award size={15} /> },
];
const LABELS: Record<string, string> = { NOT_APPLIED: 'Not applied', PLANNING_TO_APPLY: 'Planning to apply', APPLIED: 'Applied', COMPLETED: 'Completed / awarded' };

export const TrackerView: React.FC<{ onSelectScheme: (s: Scheme) => void }> = ({ onSelectScheme }) => {
  const { showToast } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'board'>('list');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const res = await api.getApplications();
    if (res.success && res.data) setApps(res.data);
    else if (!silent) setError(res.error?.message ?? 'Could not load your applications.');
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (schemeId: string, status: string, notes?: string) => {
    try {
      unwrap(await api.upsertApplication({ schemeId, status, notes }));
      showToast('Application updated');
      load(true);
    } catch (e) {
      showToast(errorMessage(e, 'Failed to update application'), 'error');
      load(true);
    }
  };

  const tracked = apps.filter((a) => a.scheme && a.status !== 'NOT_APPLIED');
  const by = (k: string) => tracked.filter((a) => a.status === k);

  return (
    <div>
      <PageHeader
        kicker="Applications"
        title="Application tracker"
        subtitle={tracked.length ? `${tracked.length} scheme${tracked.length !== 1 ? 's' : ''} tracked` : 'Follow each application from planning to award.'}
        actions={tracked.length > 0 && (
          <div className="ui-seg" role="group" aria-label="View">
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><List size={14} /> List</button>
            <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}><Columns3 size={14} /> Board</button>
          </div>
        )}
      />

      {error ? <ErrorState title="Couldn’t load applications" message={error} onRetry={() => load()} />
      : loading ? <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
      : tracked.length === 0 ? (
        <EmptyState icon={<CheckSquare size={24} />} title="No applications tracked yet"
          body="Open any scheme and set its status to Planning, Applied or Completed to start tracking it here."
          action={<Link className="btn btn-primary" to="/app/discover"><Compass size={16} /> Discover schemes</Link>} />
      ) : (
        <>
          <div className="trk-stats">
            {STAGES.map((s) => <div key={s.key}>{s.icon}<b>{by(s.key).length}</b><span>{s.label}</span></div>)}
          </div>

          {view === 'list' ? (
            <ul className="trk-list">
              {tracked.map((a) => {
                const s = a.scheme!;
                return (
                  <li key={a.id} className="trk-item">
                    <div className="trk-main">
                      <button className="trk-name" onClick={() => onSelectScheme(s)}>{s.name}</button>
                      <span>{s.department}</span>
                      {s.deadline && <DeadlineBadge deadline={s.deadline} />}
                    </div>
                    <select className="form-select" value={a.status} onChange={(e) => update(s.id, e.target.value, a.notes ?? undefined)} aria-label={`Status for ${s.name}`}>
                      {Object.entries(LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input className="form-input trk-notes" defaultValue={a.notes ?? ''} placeholder="Notes — reference number, documents submitted…" aria-label={`Notes for ${s.name}`}
                      onBlur={(e) => { if (e.target.value !== (a.notes ?? '')) update(s.id, a.status, e.target.value); }} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="trk-board">
              {STAGES.map((st) => (
                <section key={st.key}>
                  <h3>{st.icon} {st.label} <span>{by(st.key).length}</span></h3>
                  {by(st.key).length === 0 ? <p className="dash-muted">Nothing here yet.</p> : by(st.key).map((a) => (
                    <button key={a.id} className="trk-card" onClick={() => onSelectScheme(a.scheme!)}>
                      <strong>{a.scheme!.name}</strong><span>{a.scheme!.department}</span>
                      {a.scheme!.deadline && <DeadlineBadge deadline={a.scheme!.deadline} compact />}
                    </button>
                  ))}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
