import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark as BookmarkIcon, Compass } from 'lucide-react';
import { api } from '../api';
import type { Scheme } from '../../../shared/types';
import { CompareContext, BookmarkContext } from '../App';
import { useRecommendations } from '../hooks/RecommendationsContext';
import { SchemeCardSkeleton } from './shared/SkeletonCard';
import { PageHeader, EmptyState, ErrorState, SchemeCard } from './ui';

export const BookmarksView: React.FC<{ onSelectScheme: (s: Scheme) => void }> = ({ onSelectScheme }) => {
  const { selectedForCompare, toggleCompare } = useContext(CompareContext);
  const { bookmarkedIds, toggleBookmark } = useContext(BookmarkContext);
  const { recs, hasProfile } = useRecommendations();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await api.getBookmarks();
    if (res.success && res.data) setSchemes(res.data as unknown as Scheme[]);
    else setError(res.error?.message ?? 'Could not load your saved schemes.');
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // The shared bookmark set is the source of truth, so removing a scheme updates instantly and reverts on failure.
  const visible = schemes.filter((s) => bookmarkedIds.has(s.id));
  const status = new Map(recs.map((r) => [r.scheme.id, r.eligibilityStatus]));

  return (
    <div>
      <PageHeader kicker="Saved" title="Saved schemes" subtitle="Schemes you’ve bookmarked to come back to." />
      {error ? (
        <ErrorState title="Couldn’t load saved schemes" message={error} onRetry={load} />
      ) : loading ? (
        <div className="scheme-grid">{[1, 2, 3].map((i) => <SchemeCardSkeleton key={i} />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon size={24} />}
          title="Nothing saved yet"
          body="Tap the bookmark on any scheme to keep it here."
          action={<Link className="btn btn-primary" to="/app/discover"><Compass size={16} /> Discover schemes</Link>}
        />
      ) : (
        <div className="scheme-grid">
          {visible.map((s) => (
            <SchemeCard key={s.id} scheme={s} status={hasProfile ? status.get(s.id) : undefined}
              bookmarked compared={selectedForCompare.includes(s.id)}
              onOpen={onSelectScheme} onBookmark={toggleBookmark} onCompare={toggleCompare} />
          ))}
        </div>
      )}
    </div>
  );
};
