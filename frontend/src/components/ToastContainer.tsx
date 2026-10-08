import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { Toast } from '../App';

export const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="status">
          {t.type === 'success' && <CheckCircle size={16} color="#137333" />}
          {t.type === 'error'   && <AlertCircle size={16} color="#c5221f" />}
          {t.type === 'info'    && <Info size={16} color="#1a73e8" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};
