import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { api } from '../api';
import type { Scheme } from '../../../shared/types';
import { Search, SlidersHorizontal, GitCompare, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SchemeCardSkeleton } from './shared/SkeletonCard';
import { useRecommendations } from '../hooks/RecommendationsContext';
import { PageHeader, EmptyState, ErrorState, SchemeCard } from './ui';
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

const PAGE_SIZE = 12;
const ELIG_LABELS: Record<string, string> = { ELIGIBLE: 'Eligible for me', NEEDS_VERIFICATION: 'Needs verification', NOT_ELIGIBLE: 'Not eligible' };
const FACET_LABELS: Record<string, string> = {
  scholarship: 'Scholarships', loan: 'Education loans', internship: 'Internships',
  fellowship: 'Fellowships', hostel: 'Hostel support', skill: 'Skill programs',
};

export const SchemeSearchView: React.FC<SchemeSearchViewProps> = ({ onSelectScheme, onNavigate }) => {
  const { selectedForCompare, toggleCompare } = useContext(CompareContext);
  const { bookmarkedIds, toggleBookmark } = useContext(BookmarkContext);
  const { showToast } = useToast();

  const [matching, setMatching] = useState<Scheme[]>([]);
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [govType, setGovType] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [eduLevel, setEduLevel] = useState('');
  const [facet, setFacet]     = useState('');
  const [eligFilter, setEligFilter] = useState('');
  const [sortBy, setSortBy]   = useState('alpha');
  const [page, setPage]       = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const requestId = useRef(0);

  // Debounce the search box so we don't request on every keystroke
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Full catalog size (independent of any filter)
  useEffect(() => {
    api.getSchemes({ page: '1', limit: '1' }).then((res) => {
      if (res.success && res.data) setCatalogTotal(res.data.pagination.total);
    });
  }, []);

  const fetchSchemes = async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { page: '1', limit: '200', sortBy };
    if (debouncedSearch) params.search = debouncedSearch;
    if (govType)         params.centralOrState = govType;
    if (stateFilter)     params.state = stateFilter;
    if (eduLevel)        params.educationLevel = eduLevel;

    const res = await api.getSchemes(params);
    if (id !== requestId.current) return;
    if (res.success && res.data) setMatching(res.data.schemes);
    else setError(res.error?.message ?? 'Could not load schemes.');
    setLoading(false);
  };

  useEffect(() => { fetchSchemes(); }, [debouncedSearch, govType, stateFilter, eduLevel, sortBy]);

  // Facets come from tags actually present in the matching data; nothing is assumed.
  const hasTag = (sc: Scheme, key: string) => (sc.tags ?? []).some((t) => t.name.toLowerCase() === key);
  const facetOptions = Object.keys(FACET_LABELS)
    .map((key) => ({ key, label: FACET_LABELS[key], count: matching.filter((sc) => hasTag(sc, key)).length }))
    .filter((f) => f.count > 0);
  const { recs, hasProfile } = useRecommendations();
  const statusById = useMemo(() => new Map(recs.map((r) => [r.scheme.id, r.eligibilityStatus])), [recs]);
  const filtered = matching
    .filter((sc) => !facet || hasTag(sc, facet))
    .filter((sc) => !eligFilter || statusById.get(sc.id) === eligFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const schemes = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagination = { total: filtered.length, totalPages };

  const clearFilters = () => { setGovType(''); setStateFilter(''); setEduLevel(''); setFacet(''); setEligFilter(''); setSortBy('alpha'); setSearch(''); setDebouncedSearch(''); setPage(1); };

  const activeFilters = [
    eligFilter  && { label: ELIG_LABELS[eligFilter], clear: () => setEligFilter('') },
    facet       && { label: FACET_LABELS[facet] ?? facet, clear: () => setFacet('') },
    govType     && { label: govType === 'CENTRAL' ? 'Central' : 'State', clear: () => setGovType('')  },
    stateFilter && { label: stateFilter,                                  clear: () => setStateFilter('') },
    eduLevel    && { label: EDU_LEVELS.find(e => e.value === eduLevel)?.label ?? eduLevel, clear: () => setEduLevel('') },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const filterCount = [govType, stateFilter, eduLevel, eligFilter].filter(Boolean).length;
  const resetPage = () => setPage(1);

  return (
    <div className="disc">
      <PageHeader
        kicker="Discover"
        title="Find support for your studies"
        subtitle="Scholarships, education loans and student welfare programs across India."
        actions={selectedForCompare.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('compare')}>
            <GitCompare size={14} /> Compare {selectedForCompare.length} selected
          </button>
        )}
      />

      <div className="disc-search">
        <Search size={18} aria-hidden="true" />
        <input type="search" placeholder="Search by scheme name, department or keyword" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search schemes" />
        {search && <button className="ui-icon-btn" onClick={() => setSearch('')} aria-label="Clear search"><X size={16} /></button>}
      </div>

      <div className="disc-controls">
        {facetOptions.length > 0 && (
          <div className="facet-row" role="group" aria-label="Scheme type">
            <button className={`ui-tab ${facet === '' ? 'on' : ''}`} onClick={() => { setFacet(''); resetPage(); }}>All <span>{matching.length}</span></button>
            {facetOptions.map((f) => (
              <button key={f.key} className={`ui-tab ${facet === f.key ? 'on' : ''}`} onClick={() => { setFacet(f.key); resetPage(); }}>
                {f.label} <span>{f.count}</span>
              </button>
            ))}
          </div>
        )}
        <button className="btn btn-secondary btn-sm disc-toggle" onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}>
          <SlidersHorizontal size={14} /> Filters{filterCount > 0 ? ` (${filterCount})` : ''}
        </button>
      </div>

      <div className={`disc-filters ${filterOpen ? 'open' : ''}`}>
        <select className="form-select" value={govType} onChange={(e) => { setGovType(e.target.value); resetPage(); }} aria-label="Central or state">
          <option value="">Central &amp; state</option>
          <option value="CENTRAL">Central</option>
          <option value="STATE">State</option>
        </select>
        <select className="form-select" value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); resetPage(); }} aria-label="State">
          <option value="">All states</option>
          {STATES.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
        <select className="form-select" value={eduLevel} onChange={(e) => { setEduLevel(e.target.value); resetPage(); }} aria-label="Education level">
          <option value="">All education levels</option>
          {EDU_LEVELS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        {hasProfile && (
          <select className="form-select" value={eligFilter} onChange={(e) => { setEligFilter(e.target.value); resetPage(); }} aria-label="Your eligibility">
            <option value="">Any eligibility</option>
            <option value="ELIGIBLE">Eligible for me</option>
            <option value="NEEDS_VERIFICATION">Needs verification</option>
            <option value="NOT_ELIGIBLE">Not eligible</option>
          </select>
        )}
        <select className="form-select" value={sortBy} onChange={(e) => { setSortBy(e.target.value); resetPage(); }} aria-label="Sort by">
          <option value="alpha">Sort: A–Z</option>
          <option value="relevance">Sort: Relevance</option>
          <option value="verified">Sort: Recently verified</option>
          <option value="deadline">Sort: Earliest deadline</option>
        </select>
        {(activeFilters.length > 0 || search) && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={14} /> Clear all</button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="active-filters">
          {activeFilters.map((f) => (
            <button key={f.label} className="filter-chip" onClick={f.clear} aria-label={`Remove filter ${f.label}`}>{f.label} <X size={11} /></button>
          ))}
        </div>
      )}

      <p className="disc-count" aria-live="polite">
        {loading ? 'Loading schemes…' : error ? '' : (
          <><b>{pagination.total}</b> matching scheme{pagination.total !== 1 ? 's' : ''}{catalogTotal !== null ? <> · {catalogTotal} in the catalog</> : null}</>
        )}
      </p>

      {error && !loading ? (
        <ErrorState title="Couldn't load schemes" message={error} onRetry={fetchSchemes} />
      ) : loading ? (
        <div className="scheme-grid">{Array.from({ length: 6 }).map((_, i) => <SchemeCardSkeleton key={i} />)}</div>
      ) : schemes.length === 0 ? (
        <EmptyState
          icon={<Search size={24} />}
          title={catalogTotal === 0 ? 'The catalog is empty' : 'No schemes match these filters'}
          body={catalogTotal === 0 ? 'No schemes have been added yet.' : 'Try different keywords or remove a filter to widen the search.'}
          action={catalogTotal !== 0 ? <button className="btn btn-primary" onClick={clearFilters}>Clear filters</button> : undefined}
        />
      ) : (
        <div className="scheme-grid">
          {schemes.map((sc) => (
            <SchemeCard
              key={sc.id}
              scheme={sc}
              status={hasProfile ? statusById.get(sc.id) : undefined}
              bookmarked={bookmarkedIds.has(sc.id)}
              compared={selectedForCompare.includes(sc.id)}
              onOpen={onSelectScheme}
              onBookmark={toggleBookmark}
              onCompare={toggleCompare}
            />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && !loading && (
        <nav className="pagination" aria-label="Pagination">
          <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
          <span className="pagination-info">Page {currentPage} of {pagination.totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
        </nav>
      )}
    </div>
  );
};
