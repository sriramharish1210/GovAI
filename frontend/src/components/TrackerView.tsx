import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Application, Scheme } from '../../../shared/types';
import { CheckSquare, Clock, CheckCircle2, ListFilter } from 'lucide-react';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { useToast } from '../App';

interface TrackerViewProps {
  onSelectScheme: (s: Scheme) => void;
}

const STATUS_CONFIG = {
  PLANNING_TO_APPLY: { label: 'Planning',  color: 'var(--warning)',  bg: 'var(--warning-bg)',  icon: <Clock size={14} /> },
  APPLIED:           { label: 'Applied',   color: 'var(--blue)',    bg: 'var(--blue-light)',  icon: <CheckSquare size={14} /> },
  COMPLETED:         { label: 'Completed', color: 'var(--success)', bg: 'var(--success-bg)', icon: <CheckCircle2 size={14} /> },
};

const APP_LABELS: Record<string, string> = {
  NOT_APPLIED: 'Not Applied',
  PLANNING_TO_APPLY: 'Planning to Apply',
  APPLIED: 'Applied',
  COMPLETED: 'Completed / Awarded',
};

export const TrackerView: React.FC<TrackerViewProps> = ({ onSelectScheme }) => {
  const { showToast } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('list');

  useEffect(() => { fetchApps(); }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.getApplications();
      if (res.success && res.data) setApps(res.data);
    } finally { setLoading(false); }
  };

  const handleStatusChange = async (schemeId: string, status: string, notes?: string) => {
    try {
      await api.upsertApplication({ schemeId, status, notes });
      showToast('Application status updated');
      fetchApps();
    } catch { showToast('Failed to update status', 'error'); }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Applications</h1></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map((i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">Track your scheme application pipeline</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CheckSquare size={28} style={{ color: 'var(--text-4)' }} /></div>
            <div className="empty-state-title">No applications tracked yet</div>
            <p className="empty-state-body">
              Set a status on any scheme — "Planning to Apply", "Applied", or "Completed" — from the scheme detail page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const grouped: Record<string, Application[]> = {
    PLANNING_TO_APPLY: apps.filter((a) => a.status === 'PLANNING_TO_APPLY'),
    APPLIED:           apps.filter((a) => a.status === 'APPLIED'),
    COMPLETED:         apps.filter((a) => a.status === 'COMPLETED'),
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Applications</h1>
            <p className="page-subtitle">{apps.length} scheme{apps.length !== 1 ? 's' : ''} tracked</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}>
              <ListFilter size={14} /> List
            </button>
            <button className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('kanban')}>
              Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Summary stat row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: cfg.bg, borderRadius: 'var(--r-md)', color: cfg.color, fontSize: '0.85rem', fontWeight: 600 }}>
            {cfg.icon} {grouped[key]?.length ?? 0} {cfg.label}
          </div>
        ))}
      </div>

      {view === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {apps.map((app) => {
            const scheme = app.scheme;
            if (!scheme) return null;
            const cfg = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];

            return (
              <div key={app.id} className="card" style={{ borderLeft: `3px solid ${cfg?.color ?? 'var(--border)'}`, padding: '18px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)', marginBottom: 4 }}>{scheme.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{scheme.department}</div>
                    {scheme.deadline && <div style={{ marginTop: 6 }}><DeadlineBadge deadline={scheme.deadline} /></div>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      className="form-select"
                      style={{ width: 'auto', padding: '6px 10px', fontSize: '0.82rem' }}
                      value={app.status}
                      onChange={(e) => handleStatusChange(scheme.id, e.target.value, app.notes ?? undefined)}
                      aria-label="Application status"
                    >
                      {Object.entries(APP_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <button className="btn btn-secondary btn-sm" onClick={() => onSelectScheme(scheme)}>Details</button>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginTop: 12 }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.82rem' }}
                    placeholder="Add notes — reference number, portal link, documents submitted…"
                    defaultValue={app.notes ?? ''}
                    onBlur={(e) => handleStatusChange(scheme.id, app.status, e.target.value)}
                    aria-label="Application notes"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Kanban */
        <div className="kanban-grid">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} className="kanban-col">
              <div className="kanban-col-header" style={{ color: cfg.color, background: cfg.bg }}>
                {cfg.icon} {cfg.label}
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 800 }}>
                  {grouped[status]?.length ?? 0}
                </span>
              </div>
              <div className="kanban-cards">
                {(grouped[status] ?? []).map((app) => {
                  const scheme = app.scheme;
                  if (!scheme) return null;
                  return (
                    <div key={app.id} className="kanban-card" onClick={() => onSelectScheme(scheme)}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4, color: 'var(--text-1)' }}>{scheme.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 6 }}>{scheme.department}</div>
                      {scheme.deadline && <DeadlineBadge deadline={scheme.deadline} />}
                    </div>
                  );
                })}
                {(grouped[status] ?? []).length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-4)', textAlign: 'center', padding: '12px 0' }}>No applications</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
