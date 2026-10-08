import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Scheme } from '../../../shared/types';
import { GitCompare, X, ExternalLink, Compass } from 'lucide-react';
import { VerificationBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';

interface ComparisonViewProps {
  selectedSchemeIds: string[];
  onRemoveFromCompare: (id: string) => void;
  onClearCompare: () => void;
  onSelectScheme: (s: Scheme) => void;
}

const ROW_DEFS = [
  { key: 'verification', label: 'Verification' },
  { key: 'govType',      label: 'Government Type' },
  { key: 'deadline',     label: 'Deadline' },
  { key: 'benefits',     label: 'Key Benefits' },
  { key: 'eligibility',  label: 'Eligibility' },
  { key: 'documents',    label: 'Required Documents' },
  { key: 'source',       label: 'Official Source' },
];

function renderCell(key: string, scheme: Scheme): React.ReactNode {
  switch (key) {
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

  useEffect(() => {
    if (selectedSchemeIds.length >= 2) fetchComparison();
    else setSchemes([]);
  }, [selectedSchemeIds]);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const res = await api.compareSchemes(selectedSchemeIds);
      if (res.success && res.data) setSchemes(res.data);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Compare Schemes</h1>
            <p className="page-subtitle">Side-by-side comparison of 2–4 schemes</p>
          </div>
          {selectedSchemeIds.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={onClearCompare}>
              <X size={14} /> Clear all
            </button>
          )}
        </div>
      </div>

      {selectedSchemeIds.length < 2 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
              <GitCompare size={28} />
            </div>
            <div className="empty-state-title">Select 2 to 4 schemes to compare</div>
            <p className="empty-state-body">
              Browse the Discover page and tap the compare icon on any scheme card.
              {selectedSchemeIds.length === 1 && ' You have 1 scheme selected — add at least one more.'}
            </p>
            {selectedSchemeIds.length === 0 ? (
              <a href="#" onClick={(e) => { e.preventDefault(); }} className="btn btn-primary" style={{ pointerEvents: 'none', opacity: 0.5 }}>
                <Compass size={16} /> Go to Discover
              </a>
            ) : (
              <div className="info-banner" style={{ display: 'inline-flex', marginTop: 0 }}>
                1 scheme selected — add 1 more to compare
              </div>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner spinner-blue" style={{ margin: '0 auto' }} />
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="comparison-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Scheme</th>
                  {schemes.map((s) => (
                    <th key={s.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <div className="comparison-scheme-header">{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 3 }}>{s.department}</div>
                        </div>
                        <button className="btn btn-ghost btn-icon-sm" onClick={() => onRemoveFromCompare(s.id)} aria-label={`Remove ${s.name}`}>
                          <X size={13} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROW_DEFS.map(({ key, label }) => (
                  <tr key={key}>
                    <th>{label}</th>
                    {schemes.map((s) => (
                      <td key={s.id}>{renderCell(key, s)}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th>Action</th>
                  {schemes.map((s) => (
                    <td key={s.id}>
                      <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => onSelectScheme(s)}>
                        View Details
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
