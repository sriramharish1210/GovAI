import React, { useState } from 'react';
import { X, User, Shield, GraduationCap, Accessibility, TrendingUp } from 'lucide-react';

interface MockAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (username: string) => void;
}

const PROFILES = [
  {
    id: 'student_demo_1',
    icon: <User size={20} />,
    name: 'Student Demo Account 1',
    desc: 'Primary student account for testing portal features',
    color: '#4285f4',
    bg: '#e8f0fe',
  },
  {
    id: 'student_demo_2',
    icon: <User size={20} />,
    name: 'Student Demo Account 2',
    desc: 'Secondary student account for cross-user verification',
    color: '#188038',
    bg: '#e6f4ea',
  },
  {
    id: 'student_demo_3',
    icon: <GraduationCap size={20} />,
    name: 'Student Demo Account 3',
    desc: 'Alternative test profile for testing recommendations and tracking',
    color: '#e37400',
    bg: '#fef3e2',
  },
];

export const MockAuthModal: React.FC<MockAuthModalProps> = ({ isOpen, onClose, onSelectProfile }) => {
  const [customUser, setCustomUser] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = async (id: string) => {
    setLoading(id);
    try { await onSelectProfile(id); } finally { setLoading(null); }
  };

  const handleCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUser.trim()) return;
    setLoading('custom');
    try { await onSelectProfile(customUser.trim()); } finally { setLoading(null); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Sign In</div>
            <p className="modal-subtitle">Select a test profile or enter a custom username</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              disabled={loading !== null}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', background: 'var(--white)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.15s, border-color 0.15s',
                opacity: loading !== null && loading !== p.id ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { (e.currentTarget as any).style.background = 'var(--surface)'; }}
              onMouseLeave={(e) => { (e.currentTarget as any).style.background = 'var(--white)'; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: p.bg, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {loading === p.id ? <div className="spinner" style={{ borderTopColor: p.color, borderColor: `${p.color}40`, width: 18, height: 18, borderWidth: 2 }} /> : p.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)' }}>{p.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>{p.desc}</div>
              </div>
            </button>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
            <form onSubmit={handleCustom} style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="Custom username (e.g. test_user_a)"
                value={customUser}
                onChange={(e) => setCustomUser(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={!customUser.trim() || loading !== null}>
                {loading === 'custom' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
