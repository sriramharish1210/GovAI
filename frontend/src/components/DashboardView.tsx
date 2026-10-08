import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { RecommendationResult, Application, Reminder } from '../../../shared/types';
import {
  Sparkles, CheckSquare, Bell, Compass, MessageSquare, GitCompare,
  FileDown, User, ChevronRight, CheckCircle, AlertTriangle, XCircle, Clock,
} from 'lucide-react';
import { SchemeStatusBadge } from './shared/SchemeStatusBadge';
import { DeadlineBadge } from './shared/DeadlineBadge';

interface DashboardViewProps {
  currentUser: { name: string; email: string; avatarUrl?: string; hasProfile?: boolean } | null;
  onNavigate: (page: string) => void;
  onSelectScheme: (s: any) => void;
  onGenerateReport: () => void;
  reportLoading: boolean;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function calcProfileCompletion(profile: any): number {
  if (!profile) return 0;
  const fields = ['phone','state','district','educationLevel','institution','course','yearOfStudy','academicPercentage','familyIncome','category','gender','dob'];
  const filled = fields.filter((f) => profile[f] !== null && profile[f] !== undefined && profile[f] !== '').length;
  return Math.round((filled / fields.length) * 100);
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onNavigate,
  onSelectScheme,
  onGenerateReport,
  reportLoading,
}) => {
  const [recs, setRecs] = useState<RecommendationResult[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [profileRes, recsRes, appsRes, remindersRes] = await Promise.allSettled([
        api.getProfile(),
        api.getRecommendations(false),
        api.getApplications(),
        api.getReminders(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        setProfileData(profileRes.value.data?.profile ?? null);
      }

      if (recsRes.status === 'fulfilled' && recsRes.value.success && recsRes.value.data) {
        setHasProfile(recsRes.value.data.hasProfile);
        setRecs(recsRes.value.data.recommendations?.slice(0, 4) ?? []);
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.success) {
        setApps(appsRes.value.data ?? []);
      }

      if (remindersRes.status === 'fulfilled' && remindersRes.value.success) {
        setReminders(remindersRes.value.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const completion = calcProfileCompletion(profileData);
  const eligible   = recs.filter((r) => r.eligibilityStatus === 'ELIGIBLE').length;
  const needsVerif = recs.filter((r) => r.eligibilityStatus === 'NEEDS_VERIFICATION').length;

  const appCounts = {
    planning:  apps.filter((a) => a.status === 'PLANNING_TO_APPLY').length,
    applied:   apps.filter((a) => a.status === 'APPLIED').length,
    completed: apps.filter((a) => a.status === 'COMPLETED').length,
  };

  const upcomingReminders = [...reminders]
    .filter((r) => !r.isSent && r.scheme?.deadline)
    .sort((a, b) => new Date(a.scheme!.deadline!).getTime() - new Date(b.scheme!.deadline!).getTime())
    .slice(0, 3);

  const quickActions = [
    { icon: <Compass size={20} />, label: 'Discover Schemes', page: 'discover', color: '#1a73e8', bg: '#e8f0fe' },
    { icon: <Sparkles size={20} />, label: 'My Matches', page: 'recommendations', color: '#8a2be2', bg: '#f3e8ff' },
    { icon: <MessageSquare size={20} />, label: 'Ask AI Advisor', page: 'chat', color: '#1a73e8', bg: '#e8f0fe' },
    { icon: <GitCompare size={20} />, label: 'Compare', page: 'compare', color: '#b06000', bg: '#fef3e2' },
    { icon: <User size={20} />, label: 'My Profile', page: 'profile', color: '#137333', bg: '#e6f4ea' },
    { icon: <FileDown size={20} />, label: 'Download Report', page: 'report', color: '#c5221f', bg: '#fce8e6' },
  ];

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-title" style={{ width: 260, marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: 320, marginBottom: 28 }} />
        <div className="stat-grid">
          {[1,2,3,4].map((i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: 110 }} />
          ))}
        </div>
        <div className="skeleton skeleton-card" style={{ marginTop: 20 }} />
      </div>
    );
  }

  return (
    <div>
      {/* ── Greeting ── */}
      <div className="page-header">
        <h1 className="page-title">
          {getGreeting()}{currentUser ? `, ${currentUser.name.split(' ')[0]}` : ''}
        </h1>
        <p className="page-subtitle">
          {hasProfile
            ? 'Here\'s what matters for you today.'
            : 'Complete your profile to unlock personalized recommendations.'}
        </p>
      </div>

      {/* ── Profile completion nudge ── */}
      {!hasProfile && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--blue)', background: 'var(--blue-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)', marginBottom: 4 }}>
                Your personalized recommendations are waiting
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
                Fill in your education, income, and category to see eligible government schemes.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => onNavigate('profile')}>
              Complete My Profile <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Profile progress bar ── */}
      {hasProfile && completion < 100 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)' }}>Profile Completion</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--blue)' }}>{completion}%</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${completion}%` }} />
          </div>
          <button
            className="btn btn-sm btn-outline"
            style={{ marginTop: 10 }}
            onClick={() => onNavigate('profile')}
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      {hasProfile && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#e6f4ea', color: '#137333' }}>
              <CheckCircle size={18} />
            </div>
            <div className="stat-value" style={{ color: '#137333' }}>{eligible}</div>
            <div className="stat-label">Eligible schemes</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#e8f0fe', color: 'var(--blue)' }}>
              <AlertTriangle size={18} />
            </div>
            <div className="stat-value" style={{ color: 'var(--blue)' }}>{needsVerif}</div>
            <div className="stat-label">Need verification</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3e2', color: 'var(--warning)' }}>
              <CheckSquare size={18} />
            </div>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{appCounts.applied}</div>
            <div className="stat-label">Applications submitted</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
              <Bell size={18} />
            </div>
            <div className="stat-value">{reminders.length}</div>
            <div className="stat-label">Active reminders</div>
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="section-head">
        <span className="section-title">Quick Actions</span>
      </div>
      <div className="quick-actions" style={{ marginBottom: 28 }}>
        {quickActions.map(({ icon, label, page, color, bg }) => (
          <button
            key={page}
            className="quick-action-card"
            onClick={() => page === 'report' ? onGenerateReport() : onNavigate(page)}
            disabled={page === 'report' && reportLoading}
          >
            <div className="quick-action-icon" style={{ background: bg, color }}>
              {page === 'report' && reportLoading ? <div className="spinner spinner-blue" style={{ borderTopColor: color, borderColor: `${color}40` }} /> : icon}
            </div>
            <span className="quick-action-label">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Top Matches ── */}
      {hasProfile && recs.length > 0 && (
        <>
          <div className="section-head">
            <span className="section-title">Top Matches for You</span>
            <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('recommendations')}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {recs.map((rec) => {
              const { scheme, matchScore, eligibilityStatus } = rec;
              return (
                <div
                  key={scheme.id}
                  className="card card-sm"
                  style={{ cursor: 'pointer', borderLeft: `3px solid ${
                    eligibilityStatus === 'ELIGIBLE' ? 'var(--success)' :
                    eligibilityStatus === 'NEEDS_VERIFICATION' ? 'var(--blue)' : 'var(--danger)'
                  }` }}
                  onClick={() => onSelectScheme(scheme)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <SchemeStatusBadge status={eligibilityStatus} />
                        {scheme.verificationStatus === 'STALE' && (
                          <span className="badge badge-stale">Needs verification</span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: 2 }}>
                        {scheme.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{scheme.department}</div>
                    </div>
                    <div className="match-score" style={{ flexShrink: 0 }}>
                      <span className="match-score-value" style={{ fontSize: '1.1rem', color: matchScore >= 80 ? 'var(--success)' : matchScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                        {matchScore}%
                      </span>
                      <span className="match-score-label">match</span>
                    </div>
                  </div>
                  {scheme.deadline && (
                    <div style={{ marginTop: 6 }}>
                      <DeadlineBadge deadline={scheme.deadline} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Upcoming Reminders ── */}
      {upcomingReminders.length > 0 && (
        <>
          <div className="section-head">
            <span className="section-title">Upcoming Deadlines</span>
            <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('reminders')}>
              Manage <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {upcomingReminders.map((r) => (
              <div key={r.id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-1)' }}>{r.scheme?.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{r.daysBefore}-day reminder</div>
                </div>
                <DeadlineBadge deadline={r.scheme!.deadline!} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Application pipeline summary ── */}
      {apps.length > 0 && (
        <>
          <div className="section-head">
            <span className="section-title">Application Pipeline</span>
            <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('applications')}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Planning', count: appCounts.planning, icon: <Clock size={18} />, color: 'var(--warning)', bg: 'var(--warning-bg)' },
              { label: 'Applied', count: appCounts.applied, icon: <CheckSquare size={18} />, color: 'var(--blue)', bg: 'var(--blue-light)' },
              { label: 'Completed', count: appCounts.completed, icon: <CheckCircle size={18} />, color: 'var(--success)', bg: 'var(--success-bg)' },
            ].map(({ label, count, icon, color, bg }) => (
              <div key={label} className="stat-card" style={{ cursor: 'pointer', padding: 16 }} onClick={() => onNavigate('applications')}>
                <div className="stat-icon" style={{ background: bg, color, width: 32, height: 32, marginBottom: 8 }}>{icon}</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color }}>{count}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Profile insight strip ── */}
      {profileData && (
        <div style={{ background: 'var(--navy)', borderRadius: 'var(--r-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: 4 }}>ACTIVE PROFILE</div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', fontWeight: 600 }}>
              {[profileData.category, profileData.educationLevel, profileData.state].filter(Boolean).join(' • ')}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              Your profile is being used to personalise recommendations
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('profile')} style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }}>
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
};
