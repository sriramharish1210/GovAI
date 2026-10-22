import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { useRecommendations } from '../hooks/RecommendationsContext';
import { BookmarkContext } from '../App';
import type { Application, Reminder, Scheme } from '../../../shared/types';
import {
  Sparkles, Compass, MessageSquare, GitCompare, FileDown, User, ChevronRight,
  Bell, Bookmark, CheckCircle2, AlertCircle, XCircle, CalendarClock,
} from 'lucide-react';
import { SchemeStatusBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';
import { EmptyState, SectionHead, fmtDate } from './ui';

interface DashboardViewProps {
  currentUser: { name: string; email: string; avatarUrl?: string; hasProfile?: boolean } | null;
  onNavigate: (page: string) => void;
  onSelectScheme: (s: Scheme) => void;
  onGenerateReport: () => void;
  reportLoading: boolean;
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const PROFILE_FIELDS = ['phone','state','district','educationLevel','institution','course','yearOfStudy','academicPercentage','familyIncome','category','gender','dob'];
const completion = (p: any) =>
  !p ? 0 : Math.round((PROFILE_FIELDS.filter((f) => p[f] !== null && p[f] !== undefined && p[f] !== '').length / PROFILE_FIELDS.length) * 100);

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNavigate, onSelectScheme, onGenerateReport, reportLoading }) => {
  const { recs, hasProfile, counts, loading: recsLoading, error: recsError, refresh } = useRecommendations();
  const { bookmarkedIds } = useContext(BookmarkContext);
  const [profile, setProfile] = useState<any>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const [p, a, r] = await Promise.all([api.getProfile(), api.getApplications(), api.getReminders()]);
    if (p.success) setProfile(p.data?.profile ?? null);
    if (a.success) setApps(a.data ?? []);
    if (r.success) setReminders(r.data ?? []);
    if (!p.success || !a.success || !r.success) setLoadError('Some of your dashboard data could not be loaded.');
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const firstName = currentUser?.name?.split(' ')[0] ?? 'there';
  const pct = completion(profile);
  const initialLoading = loading || (recsLoading && recs.length === 0);

  if (initialLoading) {
    return (
      <div className="dash">
        <div className="skeleton" style={{ height: 220, borderRadius: 24, marginBottom: 20 }} />
        <div className="dash-grid">
          <div className="skeleton" style={{ height: 380, borderRadius: 18 }} />
          <div className="skeleton" style={{ height: 380, borderRadius: 18 }} />
        </div>
      </div>
    );
  }

  // Top matches: complete result is already ordered Eligible → Needs verification → Not eligible
  const top = recs.filter((r) => r.eligibilityStatus !== 'NOT_ELIGIBLE').slice(0, 4);
  const upcoming = recs
    .filter((r) => r.eligibilityStatus !== 'NOT_ELIGIBLE' && r.scheme.deadline && new Date(r.scheme.deadline).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheme.deadline!).getTime() - new Date(b.scheme.deadline!).getTime())
    .slice(0, 4);
  const nextReminders = reminders.filter((r) => !r.isSent).sort((a, b) => +new Date(a.triggerDate) - +new Date(b.triggerDate)).slice(0, 3);
  const stages = [
    { key: 'PLANNING_TO_APPLY', label: 'Planning' },
    { key: 'APPLIED', label: 'Applied' },
    { key: 'COMPLETED', label: 'Completed' },
  ].map((s) => ({ ...s, n: apps.filter((a) => a.status === s.key).length }));
  const tracked = stages.reduce((n, s) => n + s.n, 0);
  const total = counts.all || 1;

  const errorText = recsError ?? loadError;

  return (
    <div className="dash">
      {errorText && (
        <div className="alert alert-error dash-alert" role="alert">
          <span>{errorText}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => { load(); refresh(); }}>Retry</button>
        </div>
      )}

      <section className="dash-hero">
        <div className="dash-hero-copy">
          <p className="ui-kicker ui-kicker-light">{greeting()}</p>
          <h1>{firstName}, {hasProfile
            ? counts.eligible > 0 ? <>you’re eligible for <em>{counts.eligible}</em> scheme{counts.eligible !== 1 ? 's' : ''}.</> : <>let’s find your next scheme.</>
            : <>let’s set up your profile.</>}
          </h1>
          <p>{hasProfile
            ? `${counts.needs} more need${counts.needs === 1 ? 's' : ''} verification. ${counts.notEligible} did not match your profile.`
            : 'Add your education, income, category and state so GovAI can check every scheme against you.'}</p>
          <div className="dash-hero-cta">
            {hasProfile
              ? <button className="btn dash-btn-lime" onClick={() => onNavigate('recommendations')}><Sparkles size={16} /> See my matches</button>
              : <button className="btn dash-btn-lime" onClick={() => onNavigate('profile')}><User size={16} /> Complete profile</button>}
            <button className="btn dash-btn-ghost" onClick={onGenerateReport} disabled={reportLoading || !hasProfile} title={hasProfile ? 'Download PDF eligibility report' : 'Complete your profile first'}>
              <FileDown size={16} /> {reportLoading ? 'Preparing…' : 'Eligibility report'}
            </button>
          </div>
        </div>

        {hasProfile && (
          <div className="dash-overview" aria-label="Eligibility overview">
            <div className="dash-overview-total"><b>{counts.all}</b><span>schemes evaluated for your profile</span></div>
            <div className="dash-bar" role="img" aria-label={`${counts.eligible} eligible, ${counts.needs} need verification, ${counts.notEligible} not eligible`}>
              <i className="e" style={{ flex: counts.eligible / total }} />
              <i className="n" style={{ flex: counts.needs / total }} />
              <i className="x" style={{ flex: counts.notEligible / total }} />
            </div>
            <ul className="dash-legend">
              <li><CheckCircle2 size={14} /> <b>{counts.eligible}</b> Eligible</li>
              <li><AlertCircle size={14} /> <b>{counts.needs}</b> Needs verification</li>
              <li><XCircle size={14} /> <b>{counts.notEligible}</b> Not eligible</li>
            </ul>
          </div>
        )}
      </section>

      {pct < 100 && (
        <button className="dash-profile-nudge" onClick={() => onNavigate('profile')}>
          <span>Your profile is {pct}% complete — a fuller profile gives more accurate results.</span>
          <span className="dash-progress"><i style={{ width: `${pct}%` }} /></span>
          <ChevronRight size={16} />
        </button>
      )}

      <div className="dash-grid">
        <section>
          <SectionHead title="Top opportunities" action={hasProfile && <button className="ui-link-btn" onClick={() => onNavigate('recommendations')}>All matches <ChevronRight size={14} /></button>} />
          {!hasProfile ? (
            <EmptyState icon={<User size={24} />} title="No matches yet" body="Your matches appear here once your profile is saved." action={<button className="btn btn-primary" onClick={() => onNavigate('profile')}>Complete profile</button>} />
          ) : top.length === 0 ? (
            <EmptyState icon={<Compass size={24} />} title="No eligible or pending schemes right now" body="Browse the full catalog to see what else is available." action={<button className="btn btn-primary" onClick={() => onNavigate('discover')}>Discover schemes</button>} />
          ) : (
            <ul className="dash-list">
              {top.map((r) => (
                <li key={r.scheme.id}>
                  <button className="dash-row" onClick={() => onSelectScheme(r.scheme)}>
                    <span className="dash-row-main">
                      <strong>{r.scheme.name}</strong>
                      <span>{r.scheme.department}</span>
                    </span>
                    <span className="dash-row-side">
                      <SchemeStatusBadge status={r.eligibilityStatus} />
                      <DeadlineBadge deadline={r.scheme.deadline} compact />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="dash-side">
          <section className="dash-panel">
            <SectionHead title="Application progress" action={<button className="ui-link-btn" onClick={() => onNavigate('applications')}>Tracker <ChevronRight size={14} /></button>} />
            {tracked === 0 ? (
              <p className="dash-muted">You aren’t tracking any applications yet. Open a scheme and set its status to start.</p>
            ) : (
              <div className="dash-stages">
                {stages.map((s) => (
                  <div key={s.key}><b>{s.n}</b><span>{s.label}</span></div>
                ))}
              </div>
            )}
            <button className="dash-saved" onClick={() => onNavigate('saved')}>
              <Bookmark size={15} /> <span>{bookmarkedIds.size} saved scheme{bookmarkedIds.size !== 1 ? 's' : ''}</span> <ChevronRight size={15} />
            </button>
          </section>

          <section className="dash-panel">
            <SectionHead title="Coming up" />
            {upcoming.length === 0 && nextReminders.length === 0 ? (
              <p className="dash-muted">No upcoming deadlines among your matches, and no pending reminders.</p>
            ) : (
              <ul className="dash-dates">
                {upcoming.map((r) => (
                  <li key={r.scheme.id}>
                    <CalendarClock size={15} />
                    <button onClick={() => onSelectScheme(r.scheme)}>{r.scheme.name}</button>
                    <time>{fmtDate(r.scheme.deadline)}</time>
                  </li>
                ))}
                {nextReminders.map((r) => (
                  <li key={r.id}>
                    <Bell size={15} />
                    <button onClick={() => r.scheme && onSelectScheme(r.scheme)} disabled={!r.scheme}>Reminder · {r.scheme?.name ?? 'Scheme'}</button>
                    <time>{fmtDate(r.triggerDate)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dash-panel dash-actions">
            <button onClick={() => onNavigate('chat')}><MessageSquare size={16} /> Ask the AI advisor</button>
            <button onClick={() => onNavigate('compare')}><GitCompare size={16} /> Compare schemes</button>
            <button onClick={() => onNavigate('discover')}><Compass size={16} /> Discover schemes</button>
          </section>
        </aside>
      </div>
    </div>
  );
};
