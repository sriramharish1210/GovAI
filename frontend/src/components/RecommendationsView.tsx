import React, { useState, useEffect, useContext } from 'react';
import { useRecommendations } from '../hooks/RecommendationsContext';
import { BookmarkContext, CompareContext } from '../App';
import type { RecommendationResult, Scheme } from '../../../shared/types';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle, User, ChevronRight, Bookmark, GitCompare, Inbox } from 'lucide-react';
import { SchemeStatusBadge, VerificationBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { SchemeCardSkeleton } from './shared/SkeletonCard';
import { PageHeader, EmptyState, ErrorState, SourceLink, fmtMoney, schemeKinds, humanize } from './ui';

interface Props {
  onSelectScheme: (scheme: Scheme) => void;
  onNavigate: (page: string) => void;
}

const TABS = [
  { val: '', label: 'All' },
  { val: 'ELIGIBLE', label: 'Eligible' },
  { val: 'NEEDS_VERIFICATION', label: 'Needs verification' },
  { val: 'NOT_ELIGIBLE', label: 'Not eligible' },
];

const RecCard: React.FC<{ rec: RecommendationResult; onOpen: (s: Scheme) => void }> = ({ rec, onOpen }) => {
  const { scheme, matchScore, eligibilityStatus, rulesEvaluated, aiExplanation } = rec;
  const { bookmarkedIds, toggleBookmark } = useContext(BookmarkContext);
  const { selectedForCompare, toggleCompare } = useContext(CompareContext);
  const [open, setOpen] = useState(false);
  const rules = rulesEvaluated ?? [];
  const passed = rules.filter((r) => r.passed).length;
  const failed = rules.filter((r) => !r.passed);
  const saved = bookmarkedIds.has(scheme.id);
  const compared = selectedForCompare.includes(scheme.id);
  const money = scheme.benefits?.find((b) => b.amount)?.amount;
  const tone = eligibilityStatus === 'ELIGIBLE' ? 'ok' : eligibilityStatus === 'NEEDS_VERIFICATION' ? 'warn' : 'no';

  return (
    <article className={`rec rec-${tone}`}>
      <div className="rec-main">
        <div className="rec-badges">
          <SchemeStatusBadge status={eligibilityStatus} />
          <VerificationBadge status={scheme.verificationStatus} />
          <span className="ui-scheme-where">{scheme.centralOrState === 'CENTRAL' ? 'Central' : 'State'}{scheme.state ? ` · ${scheme.state}` : ''}</span>
        </div>
        <h3 className="rec-title"><button onClick={() => onOpen(scheme)}>{scheme.name}</button></h3>
        <p className="ui-scheme-dept">{scheme.department}</p>
        <p className="rec-desc">{scheme.shortDescription}</p>

        {failed.length > 0 && eligibilityStatus !== 'ELIGIBLE' && (
          <div className="rec-why">
            <strong>{eligibilityStatus === 'NEEDS_VERIFICATION' ? 'Still to confirm' : 'Why it doesn’t match'}</strong>
            <ul>{failed.slice(0, 3).map((r, i) => <li key={i}>{r.message}</li>)}</ul>
          </div>
        )}
        {aiExplanation && (
          <div className="ai-card" style={{ marginTop: 12 }}>
            <div className="ai-card-label"><Sparkles size={13} /> AI advisor note</div>
            <p className="ai-card-text">{aiExplanation}</p>
          </div>
        )}

        <div className="ui-scheme-tags" style={{ marginTop: 12 }}>
          {schemeKinds(scheme).map((k) => <span key={k} className="ui-chip">{k}</span>)}
          {money ? <span className="ui-chip ui-chip-lime">Up to {fmtMoney(money)}</span> : null}
          <DeadlineBadge deadline={scheme.deadline} />
        </div>

        {rules.length > 0 && (
          <div className="rec-rules">
            <button className="rec-rules-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <span>Eligibility breakdown · <b>{passed}</b> of {rules.length} rules met</span>
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {open && (
              <ul className="rec-rule-list">
                {rules.map((r, i) => (
                  <li key={i} className={r.passed ? 'pass' : 'fail'}>
                    {r.passed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    <span><b>{humanize(r.field)}</b> — {r.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <aside className="rec-side">
        <div className="rec-score" aria-label={`Match score ${matchScore} percent`}>
          <b>{matchScore}<small>%</small></b>
          <span>match</span>
          <div className="rec-meter"><i style={{ width: `${Math.max(0, Math.min(100, matchScore))}%` }} /></div>
        </div>
        <div className="rec-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onOpen(scheme)}>View details</button>
          {eligibilityStatus !== 'NOT_ELIGIBLE' && scheme.officialApplicationUrl && (
            <SourceLink href={scheme.officialApplicationUrl}>Apply on official site</SourceLink>
          )}
          <div className="rec-icons">
            <button className={`ui-icon-btn ${saved ? 'on' : ''}`} onClick={() => toggleBookmark(scheme.id)} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save scheme'}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} /></button>
            <button className={`ui-icon-btn ${compared ? 'on' : ''}`} onClick={() => toggleCompare(scheme.id)} aria-pressed={compared} aria-label={compared ? 'Remove from compare' : 'Add to compare'}><GitCompare size={16} /></button>
          </div>
        </div>
      </aside>
    </article>
  );
};

export const RecommendationsView: React.FC<Props> = ({ onSelectScheme, onNavigate }) => {
  const { recs: allRecs, hasProfile, loading, error, explained, counts, refresh } = useRecommendations();
  const [statusFilter, setStatusFilter] = useState('');
  const [includeAi, setIncludeAi] = useState(false);

  // Controlled, event-driven toggle: only trigger refresh when user actively turns AI on
  const handleToggleAi = (checked: boolean) => {
    setIncludeAi(checked);
    if (checked && !explained && !loading) {
      refresh({ explain: true });
    }
  };

  const tabCount = (val: string) =>
    val === '' ? counts.all : val === 'ELIGIBLE' ? counts.eligible : val === 'NEEDS_VERIFICATION' ? counts.needs : counts.notEligible;
  const visible = statusFilter ? allRecs.filter((r) => r.eligibilityStatus === statusFilter) : allRecs;

  if (!hasProfile && !loading && !error) {
    return (
      <div>
        <PageHeader kicker="Matches" title="Recommended for you" subtitle="Matched against your education, income, category and location." />
        <EmptyState
          icon={<User size={24} />}
          title="Your matches are waiting"
          body="Complete your student profile and GovAI will check every scheme in the catalog against it — education, income, category and location all count."
          action={<button className="btn btn-primary" onClick={() => onNavigate('profile')}>Complete my profile <ChevronRight size={16} /></button>}
        />
      </div>
    );
  }

  return (
    <div className="recs">
      <PageHeader
        kicker="Matches"
        title="Recommended for you"
        subtitle="Every scheme in the catalog, checked against your profile."
        actions={
          <>
            <label className="ui-switch">
              <input type="checkbox" checked={includeAi} onChange={(e) => handleToggleAi(e.target.checked)} />
              <span aria-hidden="true" /> AI explanations
            </label>
            <button className="btn btn-secondary btn-sm" onClick={() => refresh({ explain: includeAi })} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Re-evaluate
            </button>
          </>
        }
      />

      <div className="rec-tabs" role="tablist" aria-label="Filter by eligibility">
        {TABS.map((t) => (
          <button key={t.val} role="tab" aria-selected={statusFilter === t.val} className={`rec-tab ${statusFilter === t.val ? 'on' : ''}`} onClick={() => setStatusFilter(t.val)}>
            <b>{loading && allRecs.length === 0 ? '–' : tabCount(t.val)}</b>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {error && !loading ? (
        <ErrorState title="Couldn’t load your matches" message={error} onRetry={() => refresh({ explain: includeAi })} />
      ) : loading && allRecs.length === 0 ? (
        <div className="rec-list">{[1, 2, 3].map((i) => <SchemeCardSkeleton key={i} />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState icon={<Inbox size={24} />} title="Nothing in this group" body="No schemes have this eligibility status for your profile." action={<button className="btn btn-secondary" onClick={() => setStatusFilter('')}>Show all</button>} />
      ) : (
        <div className="rec-list" style={{ opacity: loading ? .6 : 1 }}>
          {visible.map((rec) => <RecCard key={rec.scheme.id} rec={rec} onOpen={onSelectScheme} />)}
        </div>
      )}
    </div>
  );
};
