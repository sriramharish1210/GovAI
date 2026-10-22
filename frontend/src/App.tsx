import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, setAuthToken, getAuthToken, unwrap, errorMessage } from './api';
import { RecommendationsProvider, useRecommendations } from './hooks/RecommendationsContext';
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
import { Landing } from './marketing/Landing';
import { SignInPage } from './pages/SignInPage';
import { FullPageLoader, FullPageError, NotFoundPage } from './components/shared/Screens';
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

export const CompareSetterContext = createContext<React.Dispatch<React.SetStateAction<string[]>>>(() => {});

/* ─── Bookmark Context ──────────────────────────────────── */
interface BookmarkContextVal {
  bookmarkedIds: Set<string>;
  toggleBookmark: (id: string) => void;
}
export const BookmarkContext = createContext<BookmarkContextVal>({ bookmarkedIds: new Set(), toggleBookmark: () => {} });

/* ─── Page labels ───────────────────────────────────────── */
export const PAGE_PATHS: Record<string, string> = {
  dashboard: '/app',
  discover: '/app/discover',
  recommendations: '/app/matches',
  compare: '/app/compare',
  chat: '/app/assistant',
  saved: '/app/saved',
  applications: '/app/applications',
  reminders: '/app/reminders',
  profile: '/app/profile',
};

const pageFromPath = (pathname: string): string => {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return Object.keys(PAGE_PATHS).find((k) => PAGE_PATHS[k] === clean) ?? 'dashboard';
};

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


type AuthStatus = 'loading' | 'authed' | 'anon' | 'error';
type CurrentUser = { name: string; email: string; avatarUrl?: string; hasProfile?: boolean };

/* ═══════════════════════════════════════════════════════════════
   AUTHENTICATED APP SHELL
══════════════════════════════════════════════════════════════ */
interface ShellProps {
  currentUser: CurrentUser | null;
  loadProfile: () => Promise<void>;
  onLogout: () => void;
}

const AppShell: React.FC<ShellProps> = ({ currentUser, loadProfile, onLogout }) => {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { selectedForCompare } = useContext(CompareContext);
  const { bookmarkedIds, toggleBookmark } = useContext(BookmarkContext);
  const { refresh: refreshRecs } = useRecommendations();
  const setSelectedForCompare = useContext(CompareSetterContext);

  const [isJargonModalOpen, setIsJargonModalOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const page = pageFromPath(location.pathname);
  const schemeId = searchParams.get('scheme');

  // Scheme detail is deep-linkable via ?scheme=<id>
  useEffect(() => {
    if (!schemeId) { setSelectedScheme(null); return; }
    if (selectedScheme?.id === schemeId) return;
    let cancelled = false;
    api.getSchemeById(schemeId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setSelectedScheme(res.data);
      else {
        showToast(res.error?.message ?? 'That scheme could not be found', 'error');
        setSearchParams((p) => { p.delete('scheme'); return p; }, { replace: true });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeId]);

  const openScheme = useCallback((s: Scheme) => {
    setSelectedScheme(s);
    setSearchParams((p) => { p.set('scheme', s.id); return p; });
  }, [setSearchParams]);

  const closeScheme = useCallback(() => {
    setSelectedScheme(null);
    setSearchParams((p) => { p.delete('scheme'); return p; }, { replace: true });
  }, [setSearchParams]);

  const navigate = (p: string) => {
    routerNavigate(PAGE_PATHS[p] ?? PAGE_PATHS.dashboard);
    window.scrollTo(0, 0);
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    showToast('Preparing your eligibility report…', 'info');
    try {
      await api.downloadReport();
      showToast('Report downloaded successfully', 'success');
    } catch (e) {
      showToast(errorMessage(e, 'Could not generate the report. Please complete your profile first.'), 'error');
    } finally {
      setReportLoading(false);
    }
  };

  const handleUpdateAppStatus = async (schemeId: string, status: string) => {
    try {
      unwrap(await api.upsertApplication({ schemeId, status }));
      showToast('Application status updated');
    } catch (e) {
      showToast(errorMessage(e, 'Failed to update status'), 'error');
    }
  };

  const handleAddReminder = async (schemeId: string, daysBefore: number) => {
    try {
      unwrap(await api.createReminder(schemeId, daysBefore));
      showToast(`Reminder set: ${daysBefore} days before deadline`);
    } catch (e) {
      showToast(errorMessage(e, 'Failed to set reminder'), 'error');
    }
  };

  const handleProfileUpdated = () => { loadProfile(); refreshRecs(); };

  const props = { onSelectScheme: openScheme, onNavigate: navigate };
  const dashboard = (
    <DashboardView {...props} currentUser={currentUser} onGenerateReport={handleGenerateReport} reportLoading={reportLoading} />
  );

  return (
    <div className="app-shell">
      <Sidebar
        activePage={page}
        onNavigate={navigate}
        currentUser={currentUser}
        onLoginClick={() => routerNavigate('/signin')}
        onLogout={onLogout}
        onGenerateReport={handleGenerateReport}
        reportLoading={reportLoading}
        compareCount={selectedForCompare.length}
      />

      <div className="main-content">
        <MobileTopbar
          title={PAGE_LABELS[page] ?? 'GovAI'}
          currentUser={currentUser}
          onLoginClick={() => routerNavigate('/signin')}
          onJargonClick={() => setIsJargonModalOpen(true)}
        />

        <div className="topbar">
          <span className="topbar-title">{PAGE_LABELS[page] ?? 'GovAI'}</span>
          <div className="topbar-right">
            <button className="btn btn-ghost btn-sm" onClick={() => setIsJargonModalOpen(true)} title="Government jargon dictionary">
              <ShieldIcon /> Glossary
            </button>
          </div>
        </div>

        <div className="page-wrapper" key={page}>
          <Routes>
            <Route index element={dashboard} />
            <Route path="discover" element={<SchemeSearchView {...props} />} />
            <Route path="matches" element={<RecommendationsView {...props} />} />
            <Route
              path="compare"
              element={
                <ComparisonView
                  selectedSchemeIds={selectedForCompare}
                  onRemoveFromCompare={(id) => setSelectedForCompare((p) => p.filter((i) => i !== id))}
                  onClearCompare={() => setSelectedForCompare([])}
                  onSelectScheme={openScheme}
                />
              }
            />
            <Route path="assistant" element={<ChatView />} />
            <Route path="saved" element={<BookmarksView onSelectScheme={openScheme} />} />
            <Route path="applications" element={<TrackerView onSelectScheme={openScheme} />} />
            <Route path="reminders" element={<RemindersView onSelectScheme={openScheme} />} />
            <Route path="profile" element={<ProfileView onProfileUpdated={handleProfileUpdated} />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </div>
      </div>

      <MobileNav activePage={page} onNavigate={navigate} compareCount={selectedForCompare.length} />

      <SchemeDetailModal
        scheme={selectedScheme}
        onClose={closeScheme}
        isBookmarked={selectedScheme ? bookmarkedIds.has(selectedScheme.id) : false}
        onToggleBookmark={toggleBookmark}
        onUpdateAppStatus={handleUpdateAppStatus}
        onAddReminder={handleAddReminder}
        onOpenJargon={() => setIsJargonModalOpen(true)}
      />
      <TermExplainerModal isOpen={isJargonModalOpen} onClose={() => setIsJargonModalOpen(false)} />
    </div>
  );
};

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);

/* ═══════════════════════════════════════════════════════════════
   ROOT: providers, auth state, routes
══════════════════════════════════════════════════════════════ */
export const App: React.FC = () => {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [status, setStatus] = useState<AuthStatus>(getAuthToken() ? 'loading' : 'anon');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const devAutoLoginTried = useRef(false);

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

  // Bookmarks: optimistic, reverted on failure; ref avoids stale closures
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const bookmarkedRef = useRef(bookmarkedIds);
  bookmarkedRef.current = bookmarkedIds;
  const toggleBookmark = useCallback(async (id: string) => {
    const wasSaved = bookmarkedRef.current.has(id);
    const apply = (saved: boolean) => setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(id); else next.delete(id);
      return next;
    });
    apply(!wasSaved);
    try {
      unwrap<unknown>(wasSaved ? await api.removeBookmark(id) : await api.addBookmark(id));
      showToast(wasSaved ? 'Scheme removed from saved' : 'Scheme saved');
    } catch (e) {
      apply(wasSaved);
      showToast(errorMessage(e, 'Could not update saved schemes'), 'error');
    }
  }, [showToast]);

  const loadBookmarkIds = useCallback(async () => {
    const res = await api.getBookmarks();
    if (res.success && res.data) setBookmarkedIds(new Set(res.data.map((b: any) => b.id)));
  }, []);

  const loadProfile = useCallback(async () => {
    const res = await api.getProfile();
    if (res.success && res.data) {
      setCurrentUser({
        name: res.data.name,
        email: res.data.email,
        avatarUrl: res.data.avatarUrl,
        hasProfile: !!res.data.profile,
      });
      setStatus('authed');
      loadBookmarkIds();
    } else if (res.error?.code === 'UNAUTHORIZED' || !getAuthToken()) {
      setStatus('anon');
    } else {
      setStatus('error');
    }
  }, [loadBookmarkIds]);

  const completeLogin = (data: { token: string; user: any }) => {
    setAuthToken(data.token);
    setCurrentUser({
      name: data.user.name,
      email: data.user.email,
      avatarUrl: data.user.avatarUrl ?? undefined,
      hasProfile: data.user.hasProfile,
    });
    setStatus('authed');
    loadBookmarkIds();
    showToast(`Signed in as ${data.user.name}`, 'success');
  };

  /** Development-only: the sign-in page and auto-login are the only callers, and neither exists in production builds. */
  const handleMockLogin = useCallback(async (username: string): Promise<boolean> => {
    if (!import.meta.env.DEV) return false;
    const res = await api.mockAuth(username);
    if (res.success && res.data) { completeLogin(res.data); return true; }
    showToast(res.error?.message ?? 'Sign-in failed. Is the backend running?', 'error');
    setStatus('anon');
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  const handleGoogleCredential = useCallback(async (idToken: string): Promise<boolean> => {
    const res = await api.googleAuth(idToken);
    if (res.success && res.data) { completeLogin(res.data); return true; }
    showToast(res.error?.message ?? 'Google sign-in failed. Please try again.', 'error');
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  const handleLogout = async () => {
    devAutoLoginTried.current = true; // don't silently sign back in during development
    await api.logout();
    setAuthToken(null);
    setCurrentUser(null);
    setBookmarkedIds(new Set());
    setSelectedForCompare([]);
    setStatus('anon');
    routerNavigate('/');
    showToast('Signed out successfully', 'info');
  };

  // Restore session
  useEffect(() => { if (getAuthToken()) loadProfile(); }, [loadProfile]);

  // Expired/invalid token detected by the API client
  useEffect(() => {
    const onUnauthorized = () => {
      setCurrentUser(null);
      setStatus('anon');
      showToast('Your session has expired. Please sign in again.', 'info');
    };
    window.addEventListener('govai:unauthorized', onUnauthorized);
    return () => window.removeEventListener('govai:unauthorized', onUnauthorized);
  }, [showToast]);

  // Development convenience only: visiting /app without a session signs in the demo student.
  useEffect(() => {
    if (import.meta.env.DEV && status === 'anon' && location.pathname.startsWith('/app') && !devAutoLoginTried.current) {
      devAutoLoginTried.current = true;
      setStatus('loading');
      handleMockLogin('student_demo_1');
    }
  }, [status, location.pathname, handleMockLogin]);

  const isAuthed = status === 'authed';

  const appElement =
    status === 'loading' ? <FullPageLoader />
    : status === 'error' ? <FullPageError title="Can't reach GovAI" message="We couldn't load your account. Check that the server is running and try again." onRetry={() => { setStatus('loading'); loadProfile(); }} />
    : status === 'anon' ? <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
    : (
      <RecommendationsProvider enabled={isAuthed}>
        <AppShell currentUser={currentUser} loadProfile={loadProfile} onLogout={handleLogout} />
      </RecommendationsProvider>
    );

  return (
    <ToastContext.Provider value={{ showToast }}>
      <CompareContext.Provider value={{ selectedForCompare, toggleCompare }}>
        <CompareSetterContext.Provider value={setSelectedForCompare}>
          <BookmarkContext.Provider value={{ bookmarkedIds, toggleBookmark }}>
            <Routes>
              <Route path="/" element={<Landing isAuthed={isAuthed} />} />
              <Route
                path="/signin"
                element={<SignInPage isAuthed={isAuthed} onMockLogin={handleMockLogin} onGoogleCredential={handleGoogleCredential} />}
              />
              <Route path="/app/*" element={appElement} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <ToastContainer toasts={toasts} />
          </BookmarkContext.Provider>
        </CompareSetterContext.Provider>
      </CompareContext.Provider>
    </ToastContext.Provider>
  );
};
