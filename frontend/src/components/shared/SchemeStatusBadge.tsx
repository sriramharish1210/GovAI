import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export const SchemeStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'ELIGIBLE':
      return <span className="badge badge-eligible"><CheckCircle size={12} />Eligible</span>;
    case 'NEEDS_VERIFICATION':
      return <span className="badge badge-needs-verification"><HelpCircle size={12} />Needs Verification</span>;
    case 'NOT_ELIGIBLE':
      return <span className="badge badge-not-eligible"><XCircle size={12} />Not Eligible</span>;
    case 'LIKELY_ELIGIBLE':
      return <span className="badge badge-planning"><AlertTriangle size={12} />Likely Eligible</span>;
    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
};

export const VerificationBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'VERIFIED':
      return <span className="badge badge-verified"><CheckCircle size={11} />Verified</span>;
    case 'STALE':
      return <span className="badge badge-stale"><AlertTriangle size={11} />Stale Data</span>;
    default:
      return <span className="badge badge-unverified"><HelpCircle size={11} />Unverified</span>;
  }
};
