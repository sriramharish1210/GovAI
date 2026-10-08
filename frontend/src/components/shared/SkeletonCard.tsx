import React from 'react';

export const SkeletonCard: React.FC<{ height?: number }> = ({ height = 180 }) => (
  <div className="skeleton" style={{ height, borderRadius: 'var(--r-lg)' }} />
);

export const SkeletonText: React.FC<{ width?: string | number; height?: number }> = ({ width = '100%', height = 14 }) => (
  <div className="skeleton skeleton-text" style={{ width, height }} />
);

export const SchemeCardSkeleton: React.FC = () => (
  <div className="scheme-card" style={{ gap: 12 }}>
    <SkeletonText width="40%" height={11} />
    <SkeletonText height={18} />
    <SkeletonText width="60%" height={11} />
    <SkeletonText />
    <SkeletonText width="80%" />
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12 }}>
      <SkeletonText width={80} height={28} />
      <SkeletonText width={100} height={28} />
    </div>
  </div>
);
