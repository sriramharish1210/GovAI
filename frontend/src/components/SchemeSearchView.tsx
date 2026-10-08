import React, { useState, useEffect, useRef, useContext } from 'react';
import { api } from '../api';
import type { Scheme } from '../../../shared/types';
import { Search, SlidersHorizontal, Bookmark, GitCompare, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { VerificationBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { SchemeCardSkeleton } from './shared/SkeletonCard';
import { CompareContext, BookmarkContext, useToast } from '../App';

interface SchemeSearchViewProps {
  onSelectScheme: (scheme: Scheme) => void;
  onNavigate: (page: string) => void;
}

const STATES = ['Maharashtra','Karnataka','Tamil Nadu','Delhi','Uttar Pradesh','West Bengal','Gujarat','Andhra Pradesh','Rajasthan','Kerala'];
const EDU_LEVELS = [
  { value: '10th', label: '10th Grade' },
  { value: '12th', label: '12th Grade' },
  { value: 'UG',   label: 'Undergraduate' },
  { value: 'PG',   label: 'Postgraduate' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'PhD',  label: 'PhD' },
];

export const SchemeSearchView: React.FC<SchemeSearchViewProps> = ({ onSelectScheme, onNavigate }) => {
  const { selectedForCompare, toggleCompare } = useContext(CompareContext);
  const { bookmarkedIds, toggleBookmark } = useContext(BookmarkContext);
  const { showToast } = useToast();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [govType, setGovType] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [eduLevel, setEduLevel] = useState('');
  const [sortBy, setSortBy]   = useState('alpha');
  const [page, setPage]       = useState(1);
  const [pagination, setPagination] = useState({ page:1, limit:12, total:0, totalPages:1 });
  const [filterOpen, setFilterOpen] = useState(false);

  const searchTimer = useRef<any>(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => { fetchSchemes(); }, [search, govType, stateFilter, eduLevel, sortBy, page]);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '12', sortBy };
      if (search)      params.search = search;
      if (govType)     params.centralOrState = govType;
      if (stateFilter) params.state = stateFilter;
      if (eduLevel)    params.educationLevel = eduLevel;

      const res = await api.getSchemes(params);
      if (res.success && res.data) {
        setSchemes(res.data.schemes);
        setPagination(res.data.pagination);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const clearFilters = () => { setGovType(''); setStateFilter(''); setEduLevel(''); setSortBy('alpha'); setSearch(''); setPage(1); };

  const activeFilters = [
    govType     && { label: govType === 'CENTRAL' ? 'Central' : 'State', clear: () => setGovType('')  },
    stateFilter && { label: stateFilter,                                  clear: () => setStateFilter('') },
    eduLevel    && { label: EDU_LEVELS.find(e => e.value === eduLevel)?.label ?? eduLevel, clear: () => setEduLevel('') },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Discover Schemes</h1>
        <p className="page-subtitle">Scholarships, loans, internships and welfare programs for students across India</p>
      </div>

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={15} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, department or keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search schemes"
          />
        </div>

        {/* Desktop filter dropdowns */}
        <select className="form-select" style={{ width: 'auto' }} value={govType} onChange={(e) => { setGovType(e.target.value); setPage(1); }} aria-label="Government type">
          <option value="">All types</option>
          <option value="CENTRAL">Central</option>
          <option value="STATE">State</option>
        </select>

        <select className="form-select" style={{ width: 'auto' }} value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }} aria-label="State">
          <option value="">All states</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="form-select" style={{ width: 'auto' }} value={eduLevel} onChange={(e) => { setEduLevel(e.target.value); setPage(1); }} aria-label="Education level">
          <option value="">All levels</option>
          {EDU_LEVELS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>

        <select className="form-select" style={{ width: 'auto' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort by">
          <option value="alpha">A–Z</option>
          <option value="relevance">Relevance</option>
          <option value="verified">Recently verified</option>
          <option value="deadline">Earliest deadline</option>
        </select>

        {activeFilters.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} title="Clear all filters">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="active-filters">
          {activeFilters.map((f) => (
            <button key={f.label} className="filter-chip" onClick={f.clear}>
              {f.label} <X size={11} />
            </button>
          ))}
        </div>
      )}

      {/* Results header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontWeight: 500 }}>
          {loading ? 'Loading…' : `${pagination.total} scheme${pagination.total !== 1 ? 's' : ''} found`}
        </span>
        {selectedForCompare.length > 0 && (
          <button className="btn btn-sm btn-primary" onClick={() => onNavigate('compare')}>
            <GitCompare size={14} /> Compare {selectedForCompare.length} selected
          </button>
        )}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="scheme-grid">
          {Array.from({ length: 6 }).map((_, i) => <SchemeCardSkeleton key={i} />)}
        </div>
      ) : schemes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={28} style={{ color: 'var(--text-4)' }} /></div>
            <div className="empty-state-title">No schemes found</div>
            <p className="empty-state-body">Try different keywords or remove some filters to see more results.</p>
            <button className="btn btn-primary" onClick={clearFilters}>Clear Filters</button>
          </div>
        </div>
      ) : (
        <div className="scheme-grid">
          {schemes.map((scheme) => {
            const isBookmarked = bookmarkedIds.has(scheme.id);
            const isCompared   = selectedForCompare.includes(scheme.id);
            return (
              <div key={scheme.id} className="scheme-card">
                {/* Type + Verification */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="scheme-card-type">
                    {scheme.centralOrState}{scheme.state ? ` · ${scheme.state}` : ''}
                  </span>
                  <VerificationBadge status={scheme.verificationStatus} />
                </div>

                {/* Title */}
                <div>
                  <div className="scheme-card-title">{scheme.name}</div>
                  <div className="scheme-card-dept" style={{ marginTop: 3 }}>{scheme.department}</div>
                </div>

                {/* Description */}
                <p className="scheme-card-desc">{scheme.shortDescription}</p>

                {/* Deadline */}
                <DeadlineBadge deadline={scheme.deadline} />

                {/* Actions */}
                <div className="scheme-card-actions">
                  <div className="scheme-card-icon-btns">
                    <button
                      className={`btn btn-icon-sm ${isBookmarked ? 'btn-success' : 'btn-ghost'}`}
                      onClick={() => toggleBookmark(scheme.id)}
                      aria-label={isBookmarked ? 'Remove from saved' : 'Save scheme'}
                      title={isBookmarked ? 'Saved' : 'Save'}
                    >
                      <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className={`btn btn-icon-sm ${isCompared ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => toggleCompare(scheme.id)}
                      aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
                      title="Compare"
                    >
                      <GitCompare size={15} />
                    </button>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => onSelectScheme(scheme)}>
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={15} />
          </button>
          <span className="pagination-info">Page {page} of {pagination.totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
