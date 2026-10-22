import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { Scheme } from '../../../shared/types';
import {
  X, ExternalLink, Sparkles, CheckCircle2, XCircle, FileText, Bell, Bookmark, CheckSquare,
  AlertTriangle, BookOpen, CalendarDays, Landmark, ShieldCheck,
} from 'lucide-react';
import { SchemeStatusBadge, VerificationBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { useToast } from '../App';
import { useRecommendations } from '../hooks/RecommendationsContext';
import { fmtDate, fmtMoney, humanize } from './ui';

interface SchemeDetailModalProps {
  scheme: Scheme | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onUpdateAppStatus: (schemeId: string, status: string) => void;
  onAddReminder: (schemeId: string, daysBefore: number) => void;
  onOpenJargon: () => void;
}

const APP_STATUS_LABELS: Record<string, string> = {
  NOT_APPLIED: 'Not applied',
  PLANNING_TO_APPLY: 'Planning to apply',
  APPLIED: 'Applied',
  COMPLETED: 'Completed / awarded',
};
const BENEFIT_LABELS: Record<string, string> = {
  MONETARY: 'Financial support', SUBSIDY: 'Subsidy', STIPEND: 'Stipend', TUITION_WAVIER: 'Tuition waiver', OTHER: 'Other benefit',
};

/** Renders the stored plain-text/markdown requirements as paragraphs and bullets. */
const Requirements: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n').map((l) => l.replace(/\*\*/g, '').trim()).filter(Boolean);
  return (
    <ul className="dm-reqs">
      {lines.map((l, i) => <li key={i}>{l.replace(/^[-*•]\s+/, '').replace(/^#+\s*/, '')}</li>)}
    </ul>
  );
};

export const SchemeDetailModal: React.FC<SchemeDetailModalProps> = ({
  scheme, onClose, isBookmarked, onToggleBookmark, onUpdateAppStatus, onAddReminder, onOpenJargon,
}) => {
  const { showToast } = useToast();
  const { recs } = useRecommendations();
  const [full, setFull] = useState<Scheme | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [appStatus, setAppStatus] = useState('NOT_APPLIED');
  const [reminderDays, setReminderDays] = useState(7);
  const closeRef = useRef<HTMLButtonElement>(null);
  const id = scheme?.id;

  // Load the complete scheme (documents + eligibility text) and the student's tracked status
  useEffect(() => {
    setFull(null); setAiSummary(null); setAppStatus('NOT_APPLIED'); setDetailError(false);
    if (!id) return;
    let cancelled = false;
    api.getSchemeById(id).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setFull(res.data); else setDetailError(true);
    });
    api.getApplications().then((res) => {
      if (cancelled || !res.success || !res.data) return;
      const mine = res.data.find((a) => a.schemeId === id);
      if (mine) setAppStatus(mine.status);
    });
    return () => { cancelled = true; };
  }, [id]);

  // Escape to close, lock background scroll, move focus into the dialog
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [id, onClose]);

  if (!scheme) return null;
  const s: Scheme = { ...scheme, ...(full ?? {}) };
  const rec = recs.find((r) => r.scheme.id === s.id);
  const rules = rec?.rulesEvaluated ?? [];
  const deadlinePassed = !!s.deadline && new Date(s.deadline).getTime() < Date.now();
  const canRemind = !!s.deadline && !deadlinePassed;

  const summarise = async () => {
    setLoadingSummary(true);
    const res = await api.summarizeScheme(s.id);
    if (res.success && res.data) setAiSummary(res.data.summary);
    else showToast(res.error?.message ?? 'Could not generate a summary', 'error');
    setLoadingSummary(false);
  };

  const changeStatus = (status: string) => { setAppStatus(status); onUpdateAppStatus(s.id, status); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ui-detail" role="dialog" aria-modal="true" aria-labelledby="scheme-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="dm-badges">
              {rec && <SchemeStatusBadge status={rec.eligibilityStatus} />}
              <VerificationBadge status={s.verificationStatus} />
              <span className="ui-scheme-where">{s.centralOrState === 'CENTRAL' ? 'Central' : 'State'}{s.state ? ` · ${s.state}` : ''}</span>
            </div>
            <h2 id="scheme-modal-title" className="modal-title">{s.name}</h2>
            <p className="modal-subtitle">{s.department}</p>
          </div>
          <button ref={closeRef} className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="modal-body">
          {s.verificationStatus === 'STALE' && (
            <div className="stale-banner"><AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span><strong>Details may be outdated.</strong> This scheme hasn’t been re-verified recently. Confirm eligibility and deadlines on the official portal before applying.</span>
            </div>
          )}

          <dl className="dm-facts">
            <div><dt><CalendarDays size={14} /> Deadline</dt><dd><DeadlineBadge deadline={s.deadline} />{s.deadline && <small>{fmtDate(s.deadline)}</small>}</dd></div>
            <div><dt><CalendarDays size={14} /> Opens</dt><dd>{s.startDate ? fmtDate(s.startDate) : 'Not specified'}</dd></div>
            <div><dt><ShieldCheck size={14} /> Last verified</dt><dd>{fmtDate(s.lastVerifiedDate)}</dd></div>
            <div><dt><Landmark size={14} /> Source</dt><dd>{s.sourceName}</dd></div>
          </dl>

          <div className="dm-links">
            {s.officialApplicationUrl && <a className="btn btn-primary btn-sm" href={s.officialApplicationUrl} target="_blank" rel="noopener noreferrer">Apply on official site <ExternalLink size={13} /></a>}
            <a className="btn btn-secondary btn-sm" href={s.officialSourceUrl} target="_blank" rel="noopener noreferrer">Official scheme page <ExternalLink size={13} /></a>
          </div>

          {rec && (
            <section className="dm-sec">
              <h3>Your eligibility</h3>
              <p className="dm-muted">{rules.filter((r) => r.passed).length} of {rules.length} rules met · {rec.matchScore}% match</p>
              {rules.length > 0 && (
                <ul className="rec-rule-list">
                  {rules.map((r, i) => (
                    <li key={i} className={r.passed ? 'pass' : 'fail'}>
                      {r.passed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      <span><b>{humanize(r.field)}</b> — {r.message}</span>
                    </li>
                  ))}
                </ul>
              )}
              {rec.aiExplanation && <div className="ai-card" style={{ marginTop: 12 }}><div className="ai-card-label"><Sparkles size={13} /> AI advisor note</div><p className="ai-card-text">{rec.aiExplanation}</p></div>}
            </section>
          )}

          <section className="dm-sec">
            <h3>Overview</h3>
            {!aiSummary ? (
              <button className="btn btn-secondary btn-sm" onClick={summarise} disabled={loadingSummary} style={{ marginBottom: 12 }}>
                {loadingSummary ? <><span className="spinner spinner-blue" style={{ width: 14, height: 14, borderWidth: 2 }} /> Summarising…</> : <><Sparkles size={15} /> Summarise in plain language</>}
              </button>
            ) : (
              <div className="ai-card" style={{ marginBottom: 12 }}><div className="ai-card-label"><Sparkles size={13} /> AI summary</div><div className="ai-card-text" style={{ whiteSpace: 'pre-line' }}>{aiSummary}</div></div>
            )}
            <p className="dm-text">{s.detailedDescription}</p>
          </section>

          <section className="dm-sec dm-two">
            <div>
              <h3>Benefits</h3>
              {s.benefits && s.benefits.length > 0 ? (
                <ul className="dm-benefits">
                  {s.benefits.map((b) => (
                    <li key={b.id}><span>{BENEFIT_LABELS[b.type] ?? b.type}</span><p>{b.description}</p>{b.amount ? <b>{fmtMoney(b.amount)}</b> : null}</li>
                  ))}
                </ul>
              ) : <p className="dm-muted">Benefit details aren’t listed. See the official page.</p>}
            </div>
            <div>
              <h3>Who can apply</h3>
              {s.eligibility?.readableRequirements
                ? <Requirements text={s.eligibility.readableRequirements} />
                : <p className="dm-muted">{detailError ? 'Couldn’t load the requirements. Try reopening this scheme.' : full ? 'Requirements aren’t listed. See the official page.' : 'Loading requirements…'}</p>}
              <button className="ui-link-btn" onClick={onOpenJargon}><BookOpen size={13} /> Jargon dictionary</button>
            </div>
          </section>

          {s.documents && s.documents.length > 0 && (
            <section className="dm-sec">
              <h3><FileText size={15} /> Documents to prepare</h3>
              <div className="dm-docs">
                {s.documents.map((d) => (
                  <span key={d.id} className={d.isRequired ? 'doc-chip doc-chip-required' : 'doc-chip'} title={d.description ?? undefined}>{d.isRequired ? 'Required' : 'Optional'} · {d.name}</span>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="modal-footer dm-foot">
          <label className="dm-field"><CheckSquare size={15} />
            <select className="form-select" value={appStatus} onChange={(e) => changeStatus(e.target.value)} aria-label="Application status">
              {Object.entries(APP_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <div className="dm-field"><Bell size={15} />
            <select className="form-select" value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))} aria-label="Reminder timing" disabled={!canRemind}>
              <option value={30}>30 days before</option><option value={7}>7 days before</option><option value={1}>1 day before</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={() => onAddReminder(s.id, reminderDays)} disabled={!canRemind} title={canRemind ? undefined : s.deadline ? 'This deadline has passed' : 'This scheme has no fixed deadline'}>Remind me</button>
          </div>
          <button className={`btn btn-sm ${isBookmarked ? 'btn-success' : 'btn-secondary'}`} onClick={() => onToggleBookmark(s.id)} aria-pressed={isBookmarked}>
            <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} /> {isBookmarked ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
