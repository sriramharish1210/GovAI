import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { RecommendationResult, Scheme } from '../../../shared/types';
import {
  Sparkles, RefreshCw, ChevronDown, ChevronUp, CheckCircle,
  XCircle, User, FileDown, ChevronRight,
} from 'lucide-react';
import { SchemeStatusBadge, VerificationBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { SchemeCardSkeleton } from './shared/SkeletonCard';

interface RecommendationsViewProps {
  onSelectScheme: (scheme: Scheme) => void;
  onNavigate: (page: string) => void;
}

const STATUS_ORDER = ['ELIGIBLE', 'NEEDS_VERIFICATION', 'LIKELY_ELIGIBLE', 'NOT_ELIGIBLE'];

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ onSelectScheme, onNavigate }) => {
  const [loading, setLoading]         = useState(true);
  const [hasProfile, setHasProfile]   = useState(true);
  const [recs, setRecs]               = useState<RecommendationResult[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [includeAi, setIncludeAi]     = useState(false);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [aiLoading, setAiLoading]     = useState<Record<string, boolean>>({});

  useEffect(() => { fetchRecs(); }, [statusFilter]);
  useEffect(() => { if (includeAi) fetchRecs(); }, [includeAi]);

  const fetchRecs = async () => {
    setLoading(true);
    try {
      const res = await api.getRecommendations(includeAi, statusFilter);
      if (res.success && res.data) {
        setHasProfile(res.data.hasProfile);
        const sorted = [...(res.data.recommendations ?? [])].sort(
          (a, b) => STATUS_ORDER.indexOf(a.eligibilityStatus) - STATUS_ORDER.indexOf(b.eligibilityStatus)
        );
        setRecs(sorted);
      }
    } finally { setLoading(false); }
  };

  const counts = {
    all: recs.length,
    eligible: recs.filter((r) => r.eligibilityStatus === 'ELIGIBLE').length,
    needs: recs.filter((r) => r.eligibilityStatus === 'NEEDS_VERIFICATION').length,
    not: recs.filter((r) => r.eligibilityStatus === 'NOT_ELIGIBLE').length,
  };

  /* ── No profile ── */
  if (!hasProfile && !loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Recommended for You</h1>
          <p className="page-subtitle">Personalized scheme matches based on your profile</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ background: '#fef3e2', color: 'var(--warning)' }}>
              <User size={28} />
            </div>
            <div className="empty-state-title">Your recommendations are waiting</div>
            <p className="empty-state-body">
              Complete your student profile so GovAI can check your eligibility across all 83+ government schemes — education, income, category, and location all factor in.
            </p>
            <button className="btn btn-primary" onClick={() => onNavigate('profile')}>
              Complete My Profile <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-2)', fontSize: '0.875rem' }}>What personalization unlocks</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { emoji: '✓', text: 'Eligible scheme matches' },
              { emoji: '✓', text: 'Match score for each scheme' },
              { emoji: '✓', text: 'AI-generated explanations' },
              { emoji: '✓', text: 'Rule-by-rule breakdown' },
            ].map(({ emoji, text }) => (
              <div key={text} style={{ display: 'flex', gap: 8, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>{emoji}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Recommended for You</h1>
            <p className="page-subtitle">Matched against your education, income, category and location</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-2)' }}>
              <input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} />
              AI Explanations
            </label>
            <button className="btn btn-secondary btn-sm" onClick={fetchRecs} title="Refresh evaluation">
              <RefreshCw size={14} /> Re-evaluate
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card" style={{ padding: 16 }}>
            <div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.6rem' }}>{counts.eligible}</div>
            <div className="stat-label">Eligible</div>
          </div>
          <div className="stat-card" style={{ padding: 16 }}>
            <div className="stat-value" style={{ color: 'var(--blue)', fontSize: '1.6rem' }}>{counts.needs}</div>
            <div className="stat-label">Need Verification</div>
          </div>
          <div className="stat-card" style={{ padding: 16 }}>
            <div className="stat-value" style={{ color: 'var(--danger)', fontSize: '1.6rem' }}>{counts.not}</div>
            <div className="stat-label">Not Eligible</div>
          </div>
          <div className="stat-card" style={{ padding: 16 }}>
            <div className="stat-value" style={{ fontSize: '1.6rem' }}>{counts.all}</div>
            <div className="stat-label">Total evaluated</div>
          </div>
        </div>
      )}

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { val: '', label: `All (${counts.all})` },
          { val: 'ELIGIBLE', label: `Eligible (${counts.eligible})` },
          { val: 'NEEDS_VERIFICATION', label: `Needs Verification (${counts.needs})` },
          { val: 'NOT_ELIGIBLE', label: `Not Eligible (${counts.not})` },
        ].map(({ val, label }) => (
          <button
            key={val}
            className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1,2,3].map((i) => <SchemeCardSkeleton key={i} />)}
        </div>
      ) : recs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">No schemes in this category</div>
            <p className="empty-state-body">Try a different filter or re-evaluate with AI explanations enabled.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {recs.map((rec) => {
            const { scheme, matchScore, eligibilityStatus, rulesEvaluated, aiExplanation } = rec;
            const isExpanded = expandedId === scheme.id;
            const borderColor = eligibilityStatus === 'ELIGIBLE' ? 'var(--success)'
              : eligibilityStatus === 'NEEDS_VERIFICATION' ? 'var(--blue)'
              : 'var(--danger)';

            return (
              <div key={scheme.id} className="card" style={{ borderLeft: `3px solid ${borderColor}`, padding: '20px 22px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <SchemeStatusBadge status={eligibilityStatus} />
                      <VerificationBadge status={scheme.verificationStatus} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-4)', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                        {scheme.centralOrState}{scheme.state ? ` · ${scheme.state}` : ''}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)', marginBottom: 3 }}>{scheme.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{scheme.department}</div>
                  </div>

                  {/* Match score */}
                  <div className="match-score">
                    <span className="match-score-value" style={{
                      color: matchScore >= 80 ? 'var(--success)' : matchScore >= 50 ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {matchScore}<span style={{ fontSize: '0.8rem', color: 'var(--text-4)', fontWeight: 500 }}>%</span>
                    </span>
                    <span className="match-score-label">
                      {matchScore >= 80 ? 'Strong match' : matchScore >= 50 ? 'Partial match' : 'Weak match'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>
                  {scheme.shortDescription}
                </p>

                {/* Deadline */}
                <div style={{ marginBottom: 10 }}>
                  <DeadlineBadge deadline={scheme.deadline} />
                </div>

                {/* Stale warning */}
                {scheme.verificationStatus === 'STALE' && (
                  <div className="stale-banner" style={{ marginBottom: 10 }}>
                    <span style={{ flexShrink: 0 }}>⚠</span>
                    <span>Scheme data may be outdated. Verify eligibility on the official government portal before applying.</span>
                  </div>
                )}

                {/* AI explanation */}
                {aiExplanation && (
                  <div className="ai-card" style={{ marginBottom: 10 }}>
                    <div className="ai-card-label"><Sparkles size={13} /> AI Advisor note</div>
                    <p className="ai-card-text">{aiExplanation}</p>
                  </div>
                )}

                {/* Rule tree accordion */}
                {rulesEvaluated && rulesEvaluated.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 10 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.8rem' }}
                      onClick={() => setExpandedId(isExpanded ? null : scheme.id)}
                      aria-expanded={isExpanded}
                    >
                      <span>
                        Eligibility breakdown —{' '}
                        <strong style={{ color: 'var(--success)' }}>{rulesEvaluated.filter((r) => r.passed).length} passed</strong>
                        {' '}/ {rulesEvaluated.length} rules
                      </span>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                        {rulesEvaluated.map((rule, idx) => (
                          <div key={idx} className={`rule-row ${rule.passed ? 'rule-row-pass' : 'rule-row-fail'}`}>
                            {rule.passed ? <CheckCircle size={14} style={{ flexShrink: 0 }} color="var(--success)" /> : <XCircle size={14} style={{ flexShrink: 0 }} color="var(--danger)" />}
                            <span className="rule-field">{rule.field}:</span>
                            <span style={{ fontSize: '0.82rem', color: rule.passed ? 'var(--success)' : 'var(--danger)' }}>{rule.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => onSelectScheme(scheme)}>
                    View Full Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
