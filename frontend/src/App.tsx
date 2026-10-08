import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { api, setAuthToken, getAuthToken } from './api';
import type { Scheme, User } from '../../shared/types';

// Views
import { DashboardView } from './components/DashboardView';
import { SchemeSearchView } from './components/SchemeSearchView';
import { RecommendationsView } from './components/RecommendationsView';
import { ComparisonView } from './components/ComparisonView';
import { ChatView } from './components/ChatView';
import { BookmarksView } from './components/BookmarksView';
import { TrackerView } from './components/TrackerView';
import { RemindersView } from './components/RemindersView';
import { ProfileView } from './components/ProfileView';

// Shared components
import { Sidebar } from './components/Sidebar';
import { MobileTopbar } from './components/MobileTopbar';
import { MobileNav } from './components/MobileNav';
import { MockAuthModal } from './components/MockAuthModal';
import { SchemeDetailModal } from './components/SchemeDetailModal';
import { TermExplainerModal } from './components/TermExplainerModal';
import { ToastContainer } from './components/ToastContainer';

/* ─── Toast Context ─────────────────────────────────────── */
export type ToastType = 'success' | 'error' | 'info';
export interface Toast { id: number; message: string; type: ToastType; }

interface ToastContextVal {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextVal>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

/* ─── Compare Context ───────────────────────────────────── */
interface CompareContextVal {
  selectedForCompare: string[];
  toggleCompare: (id: string) => void;
}
export const CompareContext = createContext<CompareContextVal>({ selectedForCompare: [], toggleCompare: () => {} });

/* ─── Bookmark Context ──────────────────────────────────── */
interface BookmarkContextVal {
  bookmarkedIds: Set<string>;
  toggleBookmark: (id: string) => void;
}
export const BookmarkContext = createContext<BookmarkContextVal>({ bookmarkedIds: new Set(), toggleBookmark: () => {} });

/* ─── Page labels ───────────────────────────────────────── */
const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  discover: 'Discover Schemes',
  recommendations: 'Recommended for You',
  compare: 'Compare Schemes',
  chat: 'AI Advisor',
  saved: 'Saved Schemes',
  applications: 'Applications',
  reminders: 'Reminders',
  profile: 'My Profile',
};

/* ═══════════════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════════════ */
export const App: React.FC = () => {
  const [page, setPage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; avatarUrl?: string; hasProfile?: boolean } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isJargonModalOpen, setIsJargonModalOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // Compare
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const toggleCompare = useCallback((id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 4) { showToast('Maximum 4 schemes for comparison', 'info'); return prev; }
      return [...prev, id];
    });
  }, [showToast]);

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const toggleBookmark = useCallback(async (id: string) => {
    const next = new Set(bookmarkedIds);
    if (next.has(id)) {
      next.delete(id);
      await api.removeBookmark(id);
      showToast('Scheme removed from saved');
    } else {
      next.add(id);
      await api.addBookmark(id);
      showToast('Scheme saved');
    }
    setBookmarkedIds(next);
  }, [bookmarkedIds, showToast]);

  /* ── init ── */
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      loadProfile();
      loadBookmarkIds();
    } else {
      // auto-login for development
      handleMockLogin('student_demo_1');
    }
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.getProfile();
      if (res.success && res.data) {
        setCurrentUser({
          name: res.data.name,
          email: res.data.email,
          avatarUrl: res.data.avatarUrl,
          hasProfile: !!res.data.profile,
        });
      }
    } catch {}
  };

  const loadBookmarkIds = async () => {
    try {
      const res = await api.getBookmarks();
      if (res.success && res.data) {
        setBookmarkedIds(new Set(res.data.map((b: any) => b.id)));
      }
    } catch {}
  };

  const handleMockLogin = async (username: string) => {
    try {
      const res = await api.mockAuth(username);
      if (res.success && res.data) {
        setAuthToken(res.data.token);
        setCurrentUser({
          name: res.data.user.name,
          email: res.data.user.email,
          avatarUrl: res.data.user.avatarUrl ?? undefined,
          hasProfile: res.data.user.hasProfile,
        });
        setIsAuthModalOpen(false);
        loadBookmarkIds();
        showToast(`Signed in as ${res.data.user.name}`, 'success');
      }
    } catch {
      showToast('Login failed. Please try again.', 'error');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setAuthToken(null);
    setCurrentUser(null);
    setBookmarkedIds(new Set());
    setSelectedForCompare([]);
    setPage('dashboard');
    showToast('Signed out successfully', 'info');
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    showToast('Preparing your eligibility report…', 'info');
    try {
      await api.downloadReport();
      showToast('Report downloaded successfully', 'success');
    } catch {
      showToast('Could not generate report. Please complete your profile first.', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  const handleUpdateAppStatus = async (schemeId: string, status: string) => {
    try {
      await api.upsertApplication({ schemeId, status });
      showToast('Application status updated');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleAddReminder = async (schemeId: string, daysBefore: number) => {
    try {
      await api.createReminder(schemeId, daysBefore);
      showToast(`Reminder set: ${daysBefore} days before deadline`);
    } catch {
      showToast('Failed to set reminder', 'error');
    }
  };

  /* ── navigate ── */
  const navigate = (p: string) => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  /* ── render page ── */
  const renderPage = () => {
    const props = {
      onSelectScheme: setSelectedScheme,
      onNavigate: navigate,
    };

    switch (page) {
      case 'dashboard':
        return <DashboardView {...props} currentUser={currentUser} onGenerateReport={handleGenerateReport} reportLoading={reportLoading} />;
      case 'discover':
        return <SchemeSearchView {...props} />;
      case 'recommendations':
        return <RecommendationsView {...props} />;
      case 'compare':
        return (
          <ComparisonView
            selectedSchemeIds={selectedForCompare}
            onRemoveFromCompare={(id) => setSelectedForCompare((p) => p.filter((i) => i !== id))}
            onClearCompare={() => setSelectedForCompare([])}
            onSelectScheme={setSelectedScheme}
          />
        );
      case 'chat':
        return <ChatView />;
      case 'saved':
        return <BookmarksView onSelectScheme={setSelectedScheme} />;
      case 'applications':
        return <TrackerView onSelectScheme={setSelectedScheme} />;
      case 'reminders':
        return <RemindersView onSelectScheme={setSelectedScheme} />;
      case 'profile':
        return <ProfileView onProfileUpdated={loadProfile} />;
      default:
        return <DashboardView {...props} currentUser={currentUser} onGenerateReport={handleGenerateReport} reportLoading={reportLoading} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <CompareContext.Provider value={{ selectedForCompare, toggleCompare }}>
        <BookmarkContext.Provider value={{ bookmarkedIds, toggleBookmark }}>
          <div className="app-shell">
            {/* ── Desktop Sidebar ── */}
            <Sidebar
              activePage={page}
              onNavigate={navigate}
              currentUser={currentUser}
              onLoginClick={() => setIsAuthModalOpen(true)}
              onLogout={handleLogout}
              onGenerateReport={handleGenerateReport}
              reportLoading={reportLoading}
              compareCount={selectedForCompare.length}
            />

            {/* ── Main Area ── */}
            <div className="main-content">
              {/* Mobile topbar */}
              <MobileTopbar
                title={PAGE_LABELS[page] ?? 'GovAI'}
                currentUser={currentUser}
                onLoginClick={() => setIsAuthModalOpen(true)}
                onJargonClick={() => setIsJargonModalOpen(true)}
              />

              {/* Top bar — desktop */}
              <div className="topbar">
                <span className="topbar-title">{PAGE_LABELS[page] ?? 'GovAI'}</span>
                <div className="topbar-right">
                  {!currentUser && (
                    <button className="btn btn-primary btn-sm" onClick={() => setIsAuthModalOpen(true)}>
                      Sign In
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsJargonModalOpen(true)}
                    title="Government Jargon Dictionary"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Glossary
                  </button>
                </div>
              </div>

              {/* Page content */}
              <div className="page-wrapper">
                {renderPage()}
              </div>
            </div>

            {/* ── Mobile bottom nav ── */}
            <MobileNav
              activePage={page}
              onNavigate={navigate}
              compareCount={selectedForCompare.length}
            />

            {/* ── Modals ── */}
            <MockAuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              onSelectProfile={handleMockLogin}
            />

            <SchemeDetailModal
              scheme={selectedScheme}
              onClose={() => setSelectedScheme(null)}
              isBookmarked={selectedScheme ? bookmarkedIds.has(selectedScheme.id) : false}
              onToggleBookmark={toggleBookmark}
              onUpdateAppStatus={handleUpdateAppStatus}
              onAddReminder={handleAddReminder}
              onOpenJargon={() => setIsJargonModalOpen(true)}
            />

            <TermExplainerModal
              isOpen={isJargonModalOpen}
              onClose={() => setIsJargonModalOpen(false)}
            />

            <ToastContainer toasts={toasts} />
          </div>
        </BookmarkContext.Provider>
      </CompareContext.Provider>
    </ToastContext.Provider>
  );
};
