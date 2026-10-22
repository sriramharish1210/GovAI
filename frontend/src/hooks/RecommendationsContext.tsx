import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, errorMessage } from '../api';
import type { RecommendationResult } from '../../../shared/types';

export interface RecCounts {
  all: number;
  eligible: number;
  needs: number;
  notEligible: number;
}

interface RecommendationsContextVal {
  /** Complete, unfiltered evaluation of every scheme for the current profile. */
  recs: RecommendationResult[];
  hasProfile: boolean;
  loading: boolean;
  error: string | null;
  /** True when the loaded set includes AI explanations. */
  explained: boolean;
  /** Always derived from the complete set, never from a filtered view. */
  counts: RecCounts;
  refresh: (opts?: { explain?: boolean }) => Promise<void>;
}

const empty: RecCounts = { all: 0, eligible: 0, needs: 0, notEligible: 0 };

const RecommendationsContext = createContext<RecommendationsContextVal>({
  recs: [], hasProfile: false, loading: true, error: null, explained: false, counts: empty,
  refresh: async () => {},
});

export const useRecommendations = () => useContext(RecommendationsContext);

const STATUS_ORDER = ['ELIGIBLE', 'LIKELY_ELIGIBLE', 'NEEDS_VERIFICATION', 'NOT_ELIGIBLE'];

export const RecommendationsProvider: React.FC<{ enabled: boolean; children: React.ReactNode }> = ({ enabled, children }) => {
  const [recs, setRecs] = useState<RecommendationResult[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explained, setExplained] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async (opts?: { explain?: boolean }) => {
    const id = ++requestId.current;
    const explain = !!opts?.explain;
    setLoading(true);
    setError(null);
    const res = await api.getRecommendations(explain);
    if (id !== requestId.current) return; // a newer request superseded this one
    if (res.success && res.data) {
      const sorted = [...(res.data.recommendations ?? [])].sort(
        (a, b) => STATUS_ORDER.indexOf(a.eligibilityStatus) - STATUS_ORDER.indexOf(b.eligibilityStatus)
      );
      setRecs(sorted);
      setHasProfile(res.data.hasProfile);
      setExplained(explain);
    } else {
      setError(errorMessage(res.error ? new Error(res.error.message) : null, 'Could not load your recommendations.'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    } else {
      requestId.current++;
      setRecs([]); setHasProfile(false); setExplained(false); setError(null); setLoading(false);
    }
  }, [enabled, refresh]);

  const counts = useMemo<RecCounts>(() => ({
    all: recs.length,
    eligible: recs.filter((r) => r.eligibilityStatus === 'ELIGIBLE').length,
    needs: recs.filter((r) => r.eligibilityStatus === 'NEEDS_VERIFICATION').length,
    notEligible: recs.filter((r) => r.eligibilityStatus === 'NOT_ELIGIBLE').length,
  }), [recs]);

  const value = useMemo(
    () => ({ recs, hasProfile, loading, error, explained, counts, refresh }),
    [recs, hasProfile, loading, error, explained, counts, refresh]
  );

  return <RecommendationsContext.Provider value={value}>{children}</RecommendationsContext.Provider>;
};
