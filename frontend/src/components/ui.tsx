import React from 'react';
import { Bookmark, GitCompare, ArrowRight, AlertCircle, ExternalLink } from 'lucide-react';
import type { Scheme } from '../../../shared/types';
import { SchemeStatusBadge, VerificationBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** camelCase / snake_case field → "Camel case" label */
export const humanize = (f: string) => {
  const t = f.replace(/[_.]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const fmtMoney = (n?: number | null) =>
  n === null || n === undefined ? '' : `₹${n.toLocaleString('en-IN')}`;

export const PageHeader: React.FC<{ kicker?: string; title: string; subtitle?: string; actions?: React.ReactNode }> = ({ kicker, title, subtitle, actions }) => (
  <header className="ui-pagehead">
    <div>
      {kicker && <p className="ui-kicker">{kicker}</p>}
      <h1 className="ui-h1">{title}</h1>
      {subtitle && <p className="ui-sub">{subtitle}</p>}
    </div>
    {actions && <div className="ui-pagehead-actions">{actions}</div>}
  </header>
);

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }> = ({ icon, title, body, action }) => (
  <div className="ui-empty">
    {icon && <div className="ui-empty-icon">{icon}</div>}
    <h3>{title}</h3>
    {body && <p>{body}</p>}
    {action}
  </div>
);

export const ErrorState: React.FC<{ title?: string; message: string; onRetry?: () => void }> = ({ title = "Something went wrong", message, onRetry }) => (
  <div className="ui-empty ui-error" role="alert">
    <div className="ui-empty-icon"><AlertCircle size={24} /></div>
    <h3>{title}</h3>
    <p>{message}</p>
    {onRetry && <button className="btn btn-primary" onClick={onRetry}>Try again</button>}
  </div>
);

export const SectionHead: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="ui-sechead"><h2>{title}</h2>{action}</div>
);

const TYPE_TAGS: Record<string, string> = {
  scholarship: 'Scholarship', loan: 'Education loan', internship: 'Internship',
  fellowship: 'Fellowship', hostel: 'Hostel support', skill: 'Skill program',
};

export const schemeKinds = (s: Scheme) =>
  (s.tags ?? []).map((t) => t.name.toLowerCase()).filter((n) => TYPE_TAGS[n]).map((n) => TYPE_TAGS[n]);

interface SchemeCardProps {
  scheme: Scheme;
  /** Eligibility status for the signed-in student, only when real recommendation data exists. */
  status?: string;
  bookmarked: boolean;
  compared: boolean;
  onOpen: (s: Scheme) => void;
  onBookmark: (id: string) => void;
  onCompare: (id: string) => void;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({ scheme, status, bookmarked, compared, onOpen, onBookmark, onCompare }) => {
  const kinds = schemeKinds(scheme);
  const money = scheme.benefits?.find((b) => b.amount)?.amount;
  return (
    <article className="ui-scheme">
      <div className="ui-scheme-top">
        <span className="ui-scheme-where">{scheme.centralOrState === 'CENTRAL' ? 'Central' : 'State'}{scheme.state ? ` · ${scheme.state}` : ''}</span>
        {status ? <SchemeStatusBadge status={status} /> : <VerificationBadge status={scheme.verificationStatus} />}
      </div>
      <h3 className="ui-scheme-title"><button onClick={() => onOpen(scheme)}>{scheme.name}</button></h3>
      <p className="ui-scheme-dept">{scheme.department}</p>
      <p className="ui-scheme-desc">{scheme.shortDescription}</p>
      {(kinds.length > 0 || money || (status && scheme.verificationStatus !== 'VERIFIED')) && (
        <div className="ui-scheme-tags">
          {kinds.map((k) => <span key={k} className="ui-chip">{k}</span>)}
          {status && scheme.verificationStatus !== 'VERIFIED' ? <VerificationBadge status={scheme.verificationStatus} /> : null}
          {money ? <span className="ui-chip ui-chip-lime">Up to {fmtMoney(money)}</span> : null}
        </div>
      )}
      <div className="ui-scheme-foot">
        <DeadlineBadge deadline={scheme.deadline} />
        <div className="ui-scheme-actions">
          <button className={`ui-icon-btn ${bookmarked ? 'on' : ''}`} onClick={() => onBookmark(scheme.id)} aria-pressed={bookmarked} aria-label={bookmarked ? 'Remove from saved' : 'Save scheme'} title={bookmarked ? 'Saved' : 'Save'}>
            <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
          <button className={`ui-icon-btn ${compared ? 'on' : ''}`} onClick={() => onCompare(scheme.id)} aria-pressed={compared} aria-label={compared ? 'Remove from compare' : 'Add to compare'} title="Compare">
            <GitCompare size={16} />
          </button>
          <button className="ui-link-btn" onClick={() => onOpen(scheme)}>Details <ArrowRight size={14} /></button>
        </div>
      </div>
    </article>
  );
};

export const SourceLink: React.FC<{ href?: string | null; children: React.ReactNode }> = ({ href, children }) =>
  href ? <a className="ui-ext" href={href} target="_blank" rel="noopener noreferrer">{children} <ExternalLink size={13} /></a> : null;
