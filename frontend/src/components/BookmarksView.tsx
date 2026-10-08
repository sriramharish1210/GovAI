import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import type { Scheme } from '../../../shared/types';
import { Bookmark, Trash2, Compass, GitCompare } from 'lucide-react';
import { VerificationBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { SchemeCardSkeleton } from './shared/SkeletonCard';
import { CompareContext, useToast } from '../App';

interface BookmarksViewProps {
  onSelectScheme: (s: Scheme) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({ onSelectScheme }) => {
  const { selectedForCompare, toggleCompare } = useContext(CompareContext);
  const { showToast } = useToast();
  const [bookmarks, setBookmarks] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBookmarks(); }, []);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const res = await api.getBookmarks();
      if (res.success && res.data) setBookmarks(res.data);
    } finally { setLoading(false); }
  };

  const handleRemove = async (schemeId: string) => {
    try {
      await api.removeBookmark(schemeId);
      setBookmarks((prev) => prev.filter((b) => b.id !== schemeId));
      showToast('Scheme removed from saved');
    } catch {
      showToast('Failed to remove scheme', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Saved Schemes</h1>
        <p className="page-subtitle">Schemes you've bookmarked for easy access</p>
      </div>

      {loading ? (
        <div className="scheme-grid">
          {[1,2,3].map((i) => <SchemeCardSkeleton key={i} />)}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Bookmark size={28} style={{ color: 'var(--text-4)' }} /></div>
            <div className="empty-state-title">No saved schemes yet</div>
            <p className="empty-state-body">
              Save schemes while browsing to revisit them when you're ready to apply. Tap the bookmark icon on any scheme.
            </p>
            <button className="btn btn-primary">
              <Compass size={16} /> Discover Schemes
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 16, fontWeight: 500 }}>
            {bookmarks.length} saved scheme{bookmarks.length !== 1 ? 's' : ''}
          </div>
          <div className="scheme-grid">
            {bookmarks.map((scheme) => {
              const isCompared = selectedForCompare.includes(scheme.id);
              return (
                <div key={scheme.id} className="scheme-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="scheme-card-type">{scheme.centralOrState}{scheme.state ? ` · ${scheme.state}` : ''}</span>
                      <VerificationBadge status={scheme.verificationStatus} />
                    </div>
                    <button
                      className="btn btn-ghost btn-icon-sm"
                      onClick={() => handleRemove(scheme.id)}
                      aria-label="Remove from saved"
                      title="Remove"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div>
                    <div className="scheme-card-title">{scheme.name}</div>
                    <div className="scheme-card-dept" style={{ marginTop: 3 }}>{scheme.department}</div>
                  </div>

                  <p className="scheme-card-desc">{scheme.shortDescription}</p>
                  <DeadlineBadge deadline={scheme.deadline} />

                  <div className="scheme-card-actions">
                    <button
                      className={`btn btn-icon-sm ${isCompared ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => toggleCompare(scheme.id)}
                      title="Compare"
                      aria-label="Add to compare"
                    >
                      <GitCompare size={15} />
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => onSelectScheme(scheme)}>
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
