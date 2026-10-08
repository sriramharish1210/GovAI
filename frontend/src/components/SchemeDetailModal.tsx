import React, { useState } from 'react';
import { api } from '../api';
import type { Scheme } from '../../../shared/types';
import {
  X, ExternalLink, Sparkles, CheckCircle2, FileText, Bell,
  Bookmark, CheckSquare, ShieldCheck, AlertTriangle, BookOpen,
} from 'lucide-react';
import { VerificationBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { useToast } from '../App';

interface SchemeDetailModalProps {
  scheme: Scheme | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onUpdateAppStatus: (schemeId: string, status: string) => void;
  onAddReminder: (schemeId: string, daysBefore: number) => void;
  onOpenJargon: () => void;
}

export const SchemeDetailModal: React.FC<SchemeDetailModalProps> = ({
  scheme,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onUpdateAppStatus,
  onAddReminder,
  onOpenJargon,
}) => {
  const { showToast } = useToast();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [appStatus, setAppStatus] = useState('NOT_APPLIED');
  const [reminderDays, setReminderDays] = useState(7);

  if (!scheme) return null;

  const handleFetchAiSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await api.summarizeScheme(scheme.id);
      if (res.success && res.data) setAiSummary(res.data.summary);
    } finally { setLoadingSummary(false); }
  };

  const handleSetReminder = () => {
    onAddReminder(scheme.id, reminderDays);
  };

  const handleStatusChange = (status: string) => {
    setAppStatus(status);
    onUpdateAppStatus(scheme.id, status);
  };

  const APP_STATUS_LABELS: Record<string, string> = {
    NOT_APPLIED: 'Not Applied',
    PLANNING_TO_APPLY: 'Planning to Apply',
    APPLIED: 'Applied',
    COMPLETED: 'Completed / Awarded',
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="scheme-modal-title">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              <VerificationBadge status={scheme.verificationStatus} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
                {scheme.centralOrState}{scheme.state ? ` · ${scheme.state}` : ''}
              </span>
            </div>
            <h2 id="scheme-modal-title" className="modal-title">{scheme.name}</h2>
            <p className="modal-subtitle">{scheme.department}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="modal-body">

          {/* Stale warning */}
          {scheme.verificationStatus === 'STALE' && (
            <div className="stale-banner">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Data may be outdated.</strong> Scheme details have not been re-verified recently. Please confirm eligibility and deadlines on the official government portal before applying.
              </span>
            </div>
          )}

          {/* Official source links */}
          <div className="info-banner" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Official Source: {scheme.sourceName}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={scheme.officialSourceUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                Portal <ExternalLink size={13} />
              </a>
              {scheme.officialApplicationUrl && (
                <a href={scheme.officialApplicationUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                  Apply Now <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: 18 }}>
            <DeadlineBadge deadline={scheme.deadline} />
          </div>

          {/* AI Summary */}
          <div className="scheme-section" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            {!aiSummary ? (
              <button className="btn btn-secondary btn-sm" onClick={handleFetchAiSummary} disabled={loadingSummary}>
                {loadingSummary ? (
                  <><div className="spinner spinner-blue" style={{ width: 14, height: 14, borderWidth: 2 }} />Generating…</>
                ) : (
                  <><Sparkles size={15} color="var(--blue)" /> Generate AI Summary</>
                )}
              </button>
            ) : (
              <div className="ai-card">
                <div className="ai-card-label"><Sparkles size={13} /> AI Summary</div>
                <div className="ai-card-text" style={{ whiteSpace: 'pre-line' }}>{aiSummary}</div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="scheme-section">
            <div className="scheme-section-title">Overview</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{scheme.detailedDescription}</p>
          </div>

          {/* Benefits + Eligibility */}
          <div className="scheme-section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Benefits */}
              <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--success)', marginBottom: 10, display: 'flex', gap: 6 }}>
                  <CheckCircle2 size={15} /> Benefits
                </div>
                {scheme.benefits && scheme.benefits.length > 0 ? (
                  <ul style={{ paddingLeft: 16, fontSize: '0.85rem', color: 'var(--success)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {scheme.benefits.map((b: any) => (
                      <li key={b.id}>
                        <strong>{b.type}</strong>: {b.description}
                        {b.amount ? <span style={{ fontWeight: 700 }}> (₹{b.amount.toLocaleString('en-IN')})</span> : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>See official portal for benefit details.</p>
                )}
              </div>

              {/* Eligibility */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 10, display: 'flex', gap: 6 }}>
                  <ShieldCheck size={15} /> Eligibility
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', whiteSpace: 'pre-line', lineHeight: 1.55 }}>
                  {scheme.eligibility?.readableRequirements ?? 'Detailed rules available on official portal.'}
                </p>
                <button className="btn btn-ghost btn-xs" style={{ marginTop: 8 }} onClick={onOpenJargon}>
                  <BookOpen size={12} /> Jargon dictionary
                </button>
              </div>
            </div>
          </div>

          {/* Documents */}
          {scheme.documents && scheme.documents.length > 0 && (
            <div className="scheme-section">
              <div className="scheme-section-title"><FileText size={14} /> Required Documents</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scheme.documents.map((doc: any) => (
                  <span key={doc.id} className={doc.isRequired ? 'doc-chip doc-chip-required' : 'doc-chip'}>
                    {doc.isRequired ? '●' : '○'} {doc.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer action bar ── */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Track status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={16} color="var(--blue)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>Status:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 8px', fontSize: '0.82rem' }}
              value={appStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="Application status"
            >
              {Object.entries(APP_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Reminder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} color="var(--warning)" />
            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 8px', fontSize: '0.82rem' }}
              value={reminderDays}
              onChange={(e) => setReminderDays(Number(e.target.value))}
              aria-label="Reminder timing"
            >
              <option value={30}>30 days before</option>
              <option value={7}>7 days before</option>
              <option value={1}>1 day before</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={handleSetReminder}>
              Set Reminder
            </button>
          </div>

          {/* Save */}
          <button
            className={`btn btn-sm ${isBookmarked ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => onToggleBookmark(scheme.id)}
          >
            <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
            {isBookmarked ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
