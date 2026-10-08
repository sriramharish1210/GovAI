import React from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';

function daysUntil(deadline: string): number {
  const d = new Date(deadline);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const DeadlineBadge: React.FC<{ deadline: string | null | undefined; compact?: boolean }> = ({ deadline, compact }) => {
  if (!deadline) {
    return <span className="deadline-indicator deadline-normal"><Calendar size={12} />Rolling deadline</span>;
  }

  const days = daysUntil(deadline);
  const date = new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (days < 0) {
    return <span className="deadline-indicator" style={{ color: 'var(--text-4)' }}><Calendar size={12} />Closed</span>;
  }
  if (days === 0) {
    return <span className="deadline-indicator deadline-urgent"><AlertTriangle size={12} />Due today</span>;
  }
  if (days <= 7) {
    return <span className="deadline-indicator deadline-urgent"><AlertTriangle size={12} />{days} day{days !== 1 ? 's' : ''} left</span>;
  }
  if (days <= 30) {
    return <span className="deadline-indicator deadline-soon"><Calendar size={12} />{days} days left</span>;
  }
  return <span className="deadline-indicator deadline-normal"><Calendar size={12} />{compact ? `${days}d` : date}</span>;
};
