import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Scheme } from '../../../shared/types';
import { Link } from 'react-router-dom';
import { GitCompare, X, ExternalLink, Compass } from 'lucide-react';
import { useRecommendations } from '../hooks/RecommendationsContext';
import { SchemeStatusBadge } from './shared/SchemeStatusBadge';
import { PageHeader, EmptyState, ErrorState, fmtDate } from './ui';
import { VerificationBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';

interface ComparisonViewProps {
  selectedSchemeIds: string[];
  onRemoveFromCompare: (id: string) => void;
  onClearCompare: () => void;
  onSelectScheme: (s: Scheme) => void;
}

const ROW_DEFS = [
  { key: 'mine',         label: 'Your eligibility' },
  { key: 'verification', label: 'Verification' },
  { key: 'govType',      label: 'Government Type' },
  { key: 'deadline',     label: 'Deadline' },
  { key: 'benefits',     label: 'Key Benefits' },
  { key: 'eligibility',  label: 'Eligibility' },
  { key: 'documents',    label: 'Required Documents' },
  { key: 'source',       label: 'Official Source' },
];

function renderCell(key: string, scheme: Scheme, status?: string): React.ReactNode {
  switch (key) {
    case 'mine':
      return status ? <SchemeStatusBadge status={status} /> : <span style={{ color: 'var(--text-4)', fontSize: '0.82rem' }}>Complete your profile to see this</span>;
    case 'verification':
      return <VerificationBadge status={scheme.verificationStatus} />;
    case 'govType':
      return <span style={{ fontSize: '0.82rem' }}>{scheme.centralOrState}{scheme.state ? ` · ${scheme.state}` : ''}</span>;
    case 'deadline':
      return <DeadlineBadge deadline={scheme.deadline} />;
    case 'benefits':
      if (!scheme.benefits || scheme.benefits.length === 0) return <span style={{ color: 'var(--text-4)', fontSize: '0.82rem' }}>See official portal</span>;
      return (
        <ul style={{ paddingLeft: 14, fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {scheme.benefits.map((b: any) => (
            <li key={b.id}><strong>{b.type}:</strong> {b.description}{b.amount ? ` (₹${b.amount.toLocaleString('en-IN')})` : ''}</li>
          ))}
        </ul>
      );
    case 'eligibility':
      return <span style={{ fontSize: '0.82rem', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{scheme.eligibility?.readableRequirements ?? 'See official portal'}</span>;
    case 'documents':
      if (!scheme.documents || scheme.documents.length === 0) return <span style={{ color: 'var(--text-4)', fontSize: '0.82rem' }}>—</span>;
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {scheme.documents.map((d: any) => (
            <span key={d.id} style={{ background: d.isRequired ? 'var(--warning-bg)' : 'var(--surface)', border: `1px solid ${d.isRequired ? 'var(--warning-border)' : 'var(--border)'}`, padding: '2px 7px', borderRadius: 4, fontSize: '0.75rem', color: d.isRequired ? 'var(--warning)' : 'var(--text-2)' }}>
              {d.name}
            </span>
          ))}
        </div>
      );
    case 'source':
      return (
        <a href={scheme.officialSourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {scheme.sourceName} <ExternalLink size={11} />
        </a>
      );
    default:
      return null;
  }
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  selectedSchemeIds, onRemoveFromCompare, onClearCompare, onSelectScheme,
}) => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { recs, hasProfile } = useRecommendations();
  const statusById = new Map(recs.map((r) => [r.scheme.id, r.eligibilityStatus]));

  useEffect(() => {
    if (selectedSchemeIds.length >= 2) fetchComparison();
    else setSchemes([]);
  }, [selectedSchemeIds]);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    const res = await api.compareSchemes(selectedSchemeIds);
    if (res.success && res.data) setSchemes(res.data);
    else setError(res.error?.message ?? 'Could not compare these schemes.');
    setLoading(false);
  };

  return (
    <div>
      <PageHeader
        kicker="Compare"
        title="Compare schemes"
        subtitle="Put two to four schemes side by side."
        actions={selectedSchemeIds.length > 0 && <button className="btn btn-secondary btn-sm" onClick={onClearCompare}><X size={14} /> Clear all</button>}
      />

      {selectedSchemeIds.length < 2 ? (
        <EmptyState
          icon={<GitCompare size={24} />}
          title="Choose at least two schemes"
          body={selectedSchemeIds.length === 1 ? 'One scheme is selected. Add at least one more using the compare icon on any scheme card.' : 'Use the compare icon on any scheme card in Discover, Matches or Saved.'}
          action={<Link className="btn btn-primary" to="/app/discover"><Compass size={16} /> Go to Discover</Link>}
        />
      ) : error && !loading ? (
        <ErrorState title="Couldn’t compare these schemes" message={error} onRetry={fetchComparison} />
      ) : loading ? (
        <div className="skeleton" style={{ height: 320, borderRadius: 18 }} />
      ) : (
        <div className="cmp-card">
          <div className="comparison-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Attribute</span></th>
                  {schemes.map((s) => (
                    <th key={s.id} scope="col">
                      <div className="cmp-head">
                        <div>
                          <button className="cmp-name" onClick={() => onSelectScheme(s)}>{s.name}</button>
                          <div className="cmp-dept">{s.department}</div>
                        </div>
                        <button className="ui-icon-btn" onClick={() => onRemoveFromCompare(s.id)} aria-label={`Remove ${s.name} from comparison`}><X size={14} /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROW_DEFS.filter((r) => r.key !== 'mine' || hasProfile).map(({ key, label }) => (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    {schemes.map((s) => <td key={s.id}>{renderCell(key, s, statusById.get(s.id))}</td>)}
                  </tr>
                ))}
                <tr>
                  <th scope="row">Opens</th>
                  {schemes.map((s) => <td key={s.id}>{s.startDate ? fmtDate(s.startDate) : '—'}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
