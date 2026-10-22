import React from 'react';
import { BookOpen } from 'lucide-react';

interface MobileTopbarProps {
  title: string;
  currentUser: { name: string; avatarUrl?: string } | null;
  onLoginClick: () => void;
  onJargonClick: () => void;
}

export const MobileTopbar: React.FC<MobileTopbarProps> = ({ title, currentUser, onLoginClick, onJargonClick }) => {
  return (
    <div className="mobile-topbar">
      <div className="mobile-topbar-brand">GovAI</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn btn-ghost btn-icon-sm"
          onClick={onJargonClick}
          title="Glossary"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <BookOpen size={18} />
        </button>
        {currentUser ? (
          currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="" className="sidebar-avatar" />
          ) : (
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(27, 77, 62,0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.82rem',
            }}>
              {currentUser.name.charAt(0)}
            </div>
          )
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onLoginClick}>Sign In</button>
        )}
      </div>
    </div>
  );
};
