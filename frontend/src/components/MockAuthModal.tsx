import React, { useState } from 'react';
import { X, User, ArrowRight, ShieldCheck } from 'lucide-react';

interface MockAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (username: string) => void;
}

export const MockAuthModal: React.FC<MockAuthModalProps> = ({ isOpen, onClose, onSelectProfile }) => {
  const [username, setUsername] = useState('student');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim() || 'student';
    setLoading(true);
    try {
      await onSelectProfile(cleanUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Student Sign In</div>
            <p className="modal-subtitle">Access your personalized schemes and applications</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="portal-username">
                Student Account / Portal ID
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="portal-username"
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Enter student ID or username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                <User
                  size={16}
                  color="var(--text-3)"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
              <span className="form-hint">
                Enter your student portal handle to retrieve your saved profile and applications.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', height: 40 }}
            >
              {loading ? (
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : (
                <>
                  Sign In to Portal <ArrowRight size={16} />
                </>
              )}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.74rem',
                color: 'var(--text-3)',
                background: 'var(--surface)',
                padding: '8px 12px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <ShieldCheck size={14} color="var(--success)" style={{ flexShrink: 0 }} />
              <span>Portal authentication active. Third-party OAuth provider not configured in this environment.</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
