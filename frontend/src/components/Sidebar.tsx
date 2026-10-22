import React from 'react';
import {
  LayoutDashboard, Compass, Sparkles, GitCompare, MessageSquare,
  Bookmark, CheckSquare, Bell, User, LogOut, FileDown, HelpCircle,
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  currentUser: { name: string; email: string; avatarUrl?: string } | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onGenerateReport: () => void;
  reportLoading: boolean;
  compareCount: number;
}

const NavLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  page: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}> = ({ icon, label, active, onClick, badge }) => (
  <button
    className={`sidebar-link ${active ? 'active' : ''}`}
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
  >
    {icon}
    <span style={{ flex: 1 }}>{label}</span>
    {badge && badge > 0 ? (
      <span style={{
        background: '#1B4D3E',
        color: '#fff',
        borderRadius: '10px',
        fontSize: '0.65rem',
        fontWeight: 700,
        padding: '2px 7px',
        minWidth: '20px',
        textAlign: 'center',
      }}>
        {badge}
      </span>
    ) : null}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  currentUser,
  onLoginClick,
  onLogout,
  onGenerateReport,
  reportLoading,
  compareCount,
}) => {
  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <button className="sidebar-brand" onClick={() => onNavigate('dashboard')}>
        <div>
          <div className="sidebar-brand-mark">GovAI</div>
          <div className="sidebar-brand-sub">Student Portal</div>
        </div>
      </button>

      {/* Main nav */}
      <nav className="sidebar-nav">
        <NavLink icon={<LayoutDashboard size={16} />} label="Dashboard" page="dashboard" active={activePage === 'dashboard'} onClick={() => onNavigate('dashboard')} />

        <div className="sidebar-section">Explore</div>
        <NavLink icon={<Compass size={16} />} label="Discover" page="discover" active={activePage === 'discover'} onClick={() => onNavigate('discover')} />
        <NavLink icon={<Sparkles size={16} />} label="For You" page="recommendations" active={activePage === 'recommendations'} onClick={() => onNavigate('recommendations')} />
        <NavLink icon={<GitCompare size={16} />} label="Compare" page="compare" active={activePage === 'compare'} onClick={() => onNavigate('compare')} badge={compareCount} />
        <NavLink icon={<MessageSquare size={16} />} label="AI Advisor" page="chat" active={activePage === 'chat'} onClick={() => onNavigate('chat')} />

        <div className="sidebar-section">My Activity</div>
        <NavLink icon={<Bookmark size={16} />} label="Saved Schemes" page="saved" active={activePage === 'saved'} onClick={() => onNavigate('saved')} />
        <NavLink icon={<CheckSquare size={16} />} label="Applications" page="applications" active={activePage === 'applications'} onClick={() => onNavigate('applications')} />
        <NavLink icon={<Bell size={16} />} label="Reminders" page="reminders" active={activePage === 'reminders'} onClick={() => onNavigate('reminders')} />

        <div className="sidebar-section">Account</div>
        <NavLink icon={<User size={16} />} label="My Profile" page="profile" active={activePage === 'profile'} onClick={() => onNavigate('profile')} />
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        {currentUser ? (
          <>
            {/* Download report */}
            <button
              className="sidebar-link"
              onClick={onGenerateReport}
              disabled={reportLoading}
              style={{ opacity: reportLoading ? 0.6 : 1 }}
            >
              <FileDown size={16} />
              <span>{reportLoading ? 'Generating…' : 'Download Report'}</span>
            </button>

            {/* User info */}
            <div className="sidebar-user">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="sidebar-avatar" />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(27, 77, 62,0.3)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                }}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sidebar-user-name">{currentUser.name}</div>
                <div className="sidebar-user-email" style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.65)' }}>Student Account</div>
              </div>
            </div>

            <button className="sidebar-link" onClick={onLogout} style={{ color: 'rgba(255,100,100,0.7)' }}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm btn-full" onClick={onLoginClick} style={{ margin: '0 2px' }}>
            Sign In to Continue
          </button>
        )}
      </div>
    </aside>
  );
};
