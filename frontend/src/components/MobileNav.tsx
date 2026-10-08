import React, { useState } from 'react';
import { LayoutDashboard, Compass, Sparkles, MessageSquare, MoreHorizontal, X, Bookmark, CheckSquare, Bell, User, GitCompare, FileDown } from 'lucide-react';

interface MobileNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  compareCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activePage, onNavigate, compareCount }) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const go = (page: string) => {
    onNavigate(page);
    setMoreOpen(false);
  };

  return (
    <>
      <nav className="mobile-nav" role="navigation" aria-label="Mobile navigation">
        <button className={`mobile-nav-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => go('dashboard')}>
          <LayoutDashboard size={20} />
          Home
        </button>
        <button className={`mobile-nav-item ${activePage === 'discover' ? 'active' : ''}`} onClick={() => go('discover')}>
          <Compass size={20} />
          Discover
        </button>
        <button className={`mobile-nav-item ${activePage === 'recommendations' ? 'active' : ''}`} onClick={() => go('recommendations')}>
          <Sparkles size={20} />
          For You
        </button>
        <button className={`mobile-nav-item ${activePage === 'chat' ? 'active' : ''}`} onClick={() => go('chat')}>
          <MessageSquare size={20} />
          AI Advisor
        </button>
        <button className={`mobile-nav-item ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen(true)}>
          <MoreHorizontal size={20} />
          More
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setMoreOpen(false)} />
          <div className="drawer">
            <div className="drawer-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span className="drawer-title" style={{ marginBottom: 0 }}>More</span>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setMoreOpen(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { page: 'compare', icon: <GitCompare size={22} />, label: 'Compare', badge: compareCount },
                { page: 'saved', icon: <Bookmark size={22} />, label: 'Saved' },
                { page: 'applications', icon: <CheckSquare size={22} />, label: 'Applications' },
                { page: 'reminders', icon: <Bell size={22} />, label: 'Reminders' },
                { page: 'profile', icon: <User size={22} />, label: 'Profile' },
              ].map(({ page, icon, label, badge }) => (
                <button
                  key={page}
                  className={`quick-action-card ${activePage === page ? 'active' : ''}`}
                  onClick={() => go(page)}
                  style={{ border: activePage === page ? '2px solid var(--blue)' : undefined }}
                >
                  <div className="quick-action-icon" style={{ background: activePage === page ? 'var(--blue-light)' : 'var(--surface-2)', color: activePage === page ? 'var(--blue)' : 'var(--text-3)', position: 'relative' }}>
                    {icon}
                    {badge && badge > 0 ? (
                      <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--blue)', color: '#fff', borderRadius: '10px', fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px' }}>{badge}</span>
                    ) : null}
                  </div>
                  <span className="quick-action-label">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};
