import React, { useState } from 'react';
import { api } from '../api';
import { X, Search, BookOpen } from 'lucide-react';

interface TermExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_TERMS = [
  'Domicile Certificate',
  'Non-Creamy Layer (NCL)',
  'Family Income Certificate',
  'Economically Weaker Section (EWS)',
  'Moratorium Period',
  'Capitation Fee',
  'Merit-cum-Means',
];

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.65 }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} style={{ fontWeight: 700, margin: '10px 0 4px', color: 'var(--text-1)' }}>{line.slice(4)}</h4>;
        if (line.startsWith('## '))  return <h3 key={i} style={{ fontWeight: 700, margin: '12px 0 5px', color: 'var(--text-1)' }}>{line.slice(3)}</h3>;
        if (line.startsWith('* ') || line.startsWith('- ')) return <p key={i} style={{ paddingLeft: 14, marginBottom: 4 }}>• {line.slice(2)}</p>;
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} style={{ marginBottom: 4 }}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

export const TermExplainerModal: React.FC<TermExplainerModalProps> = ({ isOpen, onClose }) => {
  const [term, setTerm]         = useState('');
  const [result, setResult]     = useState<{ term: string; explanation: string } | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  if (!isOpen) return null;

  const explain = async (termToExplain: string) => {
    const t = termToExplain.trim();
    if (!t) return;
    setTerm(t);
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await api.explainTerm(t, 'Government scheme eligibility requirement');
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError('Could not load explanation. Please try again.');
      }
    } catch {
      setError('Failed to connect. Please check your connection and try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <BookOpen size={18} color="var(--blue)" />
              <div className="modal-title">Government Glossary</div>
            </div>
            <p className="modal-subtitle">Plain-language explanations of government terms</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Quick terms */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {QUICK_TERMS.map((t) => (
              <button
                key={t}
                className="filter-chip"
                onClick={() => explain(t)}
                style={{ background: term === t ? 'var(--blue)' : undefined, color: term === t ? '#fff' : undefined }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <div className="search-wrap" style={{ flex: 1 }}>
              <Search size={14} />
              <input
                className="form-input"
                placeholder="Enter a government term…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && explain(term)}
                aria-label="Term to explain"
              />
            </div>
            <button className="btn btn-primary" onClick={() => explain(term)} disabled={loading || !term.trim()}>
              {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Explain'}
            </button>
          </div>

          {/* Result */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div className="spinner spinner-blue" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Looking that up…</p>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          {result && !loading && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                {result.term}
              </div>
              <SimpleMarkdown text={result.explanation} />
            </div>
          )}

          {!result && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-4)', fontSize: '0.875rem' }}>
              Select a term above or type one in to get a plain-language explanation
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
