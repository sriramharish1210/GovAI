import React from 'react';
import { Link } from 'react-router-dom';

export const BrandMark: React.FC<{ light?: boolean }> = ({ light }) => (
  <span className={`brand-mark ${light ? 'brand-mark-light' : ''}`}>
    <span className="brand-dot" aria-hidden="true" />GovAI
  </span>
);

export const FullPageLoader: React.FC<{ label?: string }> = ({ label = 'Loading GovAI…' }) => (
  <div className="screen-center" role="status" aria-live="polite">
    <div className="spinner" />
    <p>{label}</p>
  </div>
);

export const FullPageError: React.FC<{ title: string; message: string; onRetry?: () => void }> = ({ title, message, onRetry }) => (
  <div className="screen-center">
    <BrandMark />
    <h1 className="display-sm">{title}</h1>
    <p>{message}</p>
    <div className="screen-actions">
      {onRetry && <button className="btn btn-primary" onClick={onRetry}>Try again</button>}
      <Link className="btn btn-secondary" to="/">Back to home</Link>
    </div>
  </div>
);

export const NotFoundPage: React.FC = () => (
  <FullPageError title="This page doesn't exist" message="The link may be broken, or the page may have moved." />
);
