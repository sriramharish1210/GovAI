import React from 'react';
import { 
  Compass, 
  Sparkles, 
  User, 
  GitCompare, 
  MessageSquare, 
  Bookmark, 
  CheckSquare, 
  Bell, 
  LogOut, 
  FileText 
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { name: string; email: string; avatarUrl?: string } | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onGenerateReport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLoginClick,
  onLogout,
  onGenerateReport,
}) => {
  return (
    <header className="app-header">
      <a href="#" className="brand" onClick={(e) => { e.preventDefault(); setActiveTab('schemes'); }}>
        <span>GovAI</span>
        <span className="brand-badge">Student Portal</span>
      </a>

      <nav className="nav-tabs">
        <button className={`nav-btn ${activeTab === 'schemes' ? 'active' : ''}`} onClick={() => setActiveTab('schemes')}>
          <Compass size={18} /> Discover
        </button>
        <button className={`nav-btn ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>
          <Sparkles size={18} /> Recommendations
        </button>
        <button className={`nav-btn ${activeTab === 'comparison' ? 'active' : ''}`} onClick={() => setActiveTab('comparison')}>
          <GitCompare size={18} /> Compare
        </button>
        <button className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={18} /> AI Chatbot
        </button>
        <button className={`nav-btn ${activeTab === 'bookmarks' ? 'active' : ''}`} onClick={() => setActiveTab('bookmarks')}>
          <Bookmark size={18} /> Bookmarks
        </button>
        <button className={`nav-btn ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
          <CheckSquare size={18} /> Tracker
        </button>
        <button className={`nav-btn ${activeTab === 'reminders' ? 'active' : ''}`} onClick={() => setActiveTab('reminders')}>
          <Bell size={18} /> Reminders
        </button>
        <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={18} /> Profile
        </button>
      </nav>

      <div className="user-status">
        {currentUser ? (
          <>
            <button className="btn btn-sm btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} onClick={onGenerateReport}>
              <FileText size={16} /> PDF Report
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
              {currentUser.avatarUrl && <img src={currentUser.avatarUrl} alt="Avatar" className="avatar" />}
              <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={onLogout} title="Logout">
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onLoginClick}>
            Mock Login
          </button>
        )}
      </div>
    </header>
  );
};
