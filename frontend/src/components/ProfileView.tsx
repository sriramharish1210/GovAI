import { PageHeader, ErrorState } from './ui';
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { StudentProfile, NotificationPreference } from '../../../shared/types';
import { Save, Bell, CheckCircle, User, MapPin, GraduationCap, IndianRupee, Shield, Code, Sparkles } from 'lucide-react';
import { useToast } from '../App';

interface ProfileViewProps {
  onProfileUpdated: () => void;
}

const STATES = [
  'Maharashtra','Karnataka','Tamil Nadu','Delhi','Uttar Pradesh','West Bengal',
  'Gujarat','Andhra Pradesh','Rajasthan','Kerala','Telangana','Madhya Pradesh',
  'Bihar','Punjab','Haryana','All India'
];

const CATEGORIES = [
  { value: 'General', label: 'General', desc: 'Open / Unreserved' },
  { value: 'OBC', label: 'OBC', desc: 'Other Backward Classes' },
  { value: 'SC', label: 'SC', desc: 'Scheduled Caste' },
  { value: 'ST', label: 'ST', desc: 'Scheduled Tribe' },
  { value: 'EWS', label: 'EWS', desc: 'Economically Weaker Section' },
];

function calcCompletion(name: string, profile: Partial<StudentProfile>): number {
  const fields = ['state','district','educationLevel','institution','course','yearOfStudy','academicPercentage','familyIncome','category','gender','dob'];
  const nameOk = name.trim().length > 0;
  const filled = fields.filter((f) => {
    const v = (profile as any)[f];
    return v !== null && v !== undefined && v !== '' && (typeof v !== 'number' || v > 0);
  }).length;
  return Math.round(((filled + (nameOk ? 1 : 0)) / (fields.length + 1)) * 100);
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <label className="toggle">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    <span className="toggle-track" />
  </label>
);

export const ProfileView: React.FC<ProfileViewProps> = ({ onProfileUpdated }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const [name, setName] = useState('');
  const [internalEmail, setInternalEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profile, setProfile] = useState<Partial<StudentProfile>>({
    state: '',
    district: '',
    educationLevel: '',
    institution: '',
    course: '',
    yearOfStudy: null as any,
    academicPercentage: null as any,
    familyIncome: null as any,
    category: '',
    gender: 'Prefer not to say',
    dob: '',
    phone: '',
    disabilityStatus: false,
    disabilityPercentage: null as any,
    minorityStatus: false,
  });
  const [prefs, setPrefs] = useState<Partial<NotificationPreference>>({
    emailNotificationsEnabled: true,
    reminder30Days: true,
    reminder7Days: true,
    reminder1Day: true,
  });

  const [loadError, setLoadError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const snapshot = React.useRef<string | null>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.getProfile();
      if (res.success && res.data) {
        setName(res.data.name ?? '');
        setInternalEmail(res.data.email ?? '');
        setAvatarUrl(res.data.avatarUrl ?? '');
        if (res.data.profile) {
          const p = res.data.profile;
          setProfile({
            state: p.state ?? '',
            district: p.district ?? '',
            educationLevel: p.educationLevel ?? '',
            institution: p.institution ?? '',
            course: p.course ?? '',
            yearOfStudy: p.yearOfStudy ?? (null as any),
            academicPercentage: p.academicPercentage ?? (null as any),
            familyIncome: p.familyIncome ?? (null as any),
            category: p.category ?? '',
            gender: p.gender ?? 'Prefer not to say',
            phone: p.phone ?? '',
            dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
            disabilityStatus: !!p.disabilityStatus,
            disabilityPercentage: p.disabilityPercentage ?? (null as any),
            minorityStatus: !!p.minorityStatus,
          });
        }
        setAccountEmail(res.data.email ?? '');
        if (res.data.notificationPreference) setPrefs(res.data.notificationPreference);
      } else {
        setLoadError(res.error?.message ?? 'Could not load your profile.');
      }
    } catch {
      setLoadError('Could not load your profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Format clean payload preserving partial / null fields
    const payload: any = {
      name: name.trim() || undefined,
      state: profile.state || null,
      district: profile.district || null,
      educationLevel: profile.educationLevel || null,
      institution: profile.institution || null,
      course: profile.course || null,
      yearOfStudy: profile.yearOfStudy ? Number(profile.yearOfStudy) : null,
      academicPercentage: profile.academicPercentage !== null && profile.academicPercentage !== undefined && profile.academicPercentage !== ('' as any)
        ? Number(profile.academicPercentage)
        : null,
      familyIncome: profile.familyIncome !== null && profile.familyIncome !== undefined && profile.familyIncome !== ('' as any)
        ? Number(profile.familyIncome)
        : null,
      category: profile.category ? profile.category : null,
      gender: profile.gender || null,
      phone: (profile as any).phone || null,
      dob: profile.dob ? profile.dob : null,
      disabilityStatus: !!profile.disabilityStatus,
      disabilityPercentage: profile.disabilityStatus && profile.disabilityPercentage ? Number(profile.disabilityPercentage) : null,
      minorityStatus: !!profile.minorityStatus,
    };

    try {
      const [res, prefRes] = await Promise.all([
        api.upsertProfile(payload),
        api.updatePreferences(prefs),
      ]);
      if (res.success && prefRes.success) {
        snapshot.current = JSON.stringify({ name, profile, prefs });
        setDirty(false);
        setSavedAt(new Date());
        showToast('Profile and reminder preferences saved', 'success');
        onProfileUpdated();
      } else if (!res.success) {
        showToast(res.error?.message ?? 'Failed to save profile', 'error');
      } else {
        showToast(prefRes.error?.message ?? 'Profile saved, but reminder preferences could not be saved', 'error');
      }
    } catch (e: any) {
      showToast(e.message ?? 'Error saving profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Track unsaved changes against the last loaded/saved state
  useEffect(() => {
    if (loading || loadError) return;
    const now = JSON.stringify({ name, profile, prefs });
    if (snapshot.current === null) snapshot.current = now;
    setDirty(now !== snapshot.current);
  }, [loading, loadError, name, profile, prefs]);

  const upd = (key: keyof StudentProfile, val: any) => setProfile((p) => ({ ...p, [key]: val }));
  const completion = calcCompletion(name, profile);

  if (loading) {
    return (
      <div style={{ maxWidth: 800 }}>
        <div className="skeleton" style={{ height: 100, borderRadius: 'var(--r-lg)', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--r-lg)' }} />
      </div>
    );
  }

  // Never show an empty editable form after a failed load: saving it would overwrite real data with blanks.
  if (loadError) {
    return (
      <div>
        <PageHeader kicker="Profile" title="Your profile" />
        <ErrorState title="Couldn’t load your profile" message={loadError} onRetry={loadProfile} />
      </div>
    );
  }

  return (
    <div className="prof">
      <PageHeader kicker="Profile" title="Your profile" subtitle="Your details are used to check every scheme for eligibility. The more complete they are, the more accurate your results." />

      {/* ── Primary Identity Card ── */}
      <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--white) 0%, var(--surface) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border)' }} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--blue-light)', color: 'var(--blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 700, flexShrink: 0
              }}>
                {(name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
                  {name || 'Student Profile'}
                </h2>
                <span className="badge badge-blue" style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px' }}>
                  Student
                </span>
                {profile.category && (
                  <span className="badge badge-blue" style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px' }}>
                    {profile.category}
                  </span>
                )}
                {profile.state && (
                  <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
                    {profile.state}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600 }}>Profile Strength</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: completion >= 80 ? 'var(--success)' : 'var(--blue)' }}>
              {completion}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-bar-wrap" style={{ marginTop: 14 }}>
          <div className="progress-bar-fill" style={{ width: `${completion}%`, background: completion >= 80 ? 'var(--success)' : undefined }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-3)' }}>
          <span>{completion === 100 ? 'All profile fields completed' : 'Partial profiles are fully supported'}</span>
          <span>Save anytime to preserve matches</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="prof-form">

        {/* ── Personal Identity (Name is Primary) ── */}
        <div className="card prof-wide" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, background: 'var(--blue-light)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={15} color="var(--blue)" />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Primary Student Identity</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>Your personal identity information used across application records</p>
            </div>
          </div>
          <div className="profile-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Student Full Name</label>
              <input
                id="name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Contact Phone Number</label>
              <input
                id="phone"
                type="tel"
                className="form-input"
                value={(profile as any).phone ?? ''}
                onChange={(e) => upd('phone' as any, e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gender">Gender</label>
              <select id="gender" className="form-select" value={profile.gender ?? 'Prefer not to say'} onChange={(e) => upd('gender', e.target.value)}>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Transgender">Transgender</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dob">Date of Birth</label>
              <input
                id="dob"
                type="date"
                className="form-input"
                value={profile.dob as string ?? ''}
                onChange={(e) => upd('dob', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Social Category & Affirmative Action (Scheme Eligibility Criteria) ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, background: '#fef3e2', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={15} color="var(--warning)" />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Social Category & Affirmative Action (Scheme Eligibility)</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>Category is evaluated strictly as eligibility criteria for quota and reservation benefits, separate from user identity</p>
            </div>
          </div>
          <div className="profile-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Social Category (Reservation / Quota Criteria)</label>
                {profile.category && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.72rem', padding: '2px 8px', height: 'auto', color: 'var(--text-3)' }}
                    onClick={() => upd('category', '')}
                    title="Clear selected category for partial profile"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <div
                role="radiogroup"
                aria-label="Social Category"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 10,
                  marginTop: 4,
                }}
              >
                {CATEGORIES.map((c) => {
                  const isSelected = profile.category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => upd('category', isSelected ? '' : c.value)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '10px 12px',
                        borderRadius: 'var(--r-md)',
                        border: isSelected ? '2px solid var(--blue)' : '1px solid var(--border)',
                        background: isSelected ? '#E4EFDF' : 'var(--surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 2 }}>
                        <span style={{ fontWeight: isSelected ? 800 : 600, fontSize: '0.88rem', color: isSelected ? 'var(--blue)' : 'var(--text-1)' }}>
                          {c.label}
                        </span>
                        {isSelected && (
                          <CheckCircle size={14} color="var(--blue)" style={{ flexShrink: 0 }} />
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: isSelected ? 'var(--blue)' : 'var(--text-3)' }}>
                        {c.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="form-hint" style={{ marginTop: 6, display: 'block' }}>
                Used for category-specific scholarships (SC, ST, OBC, EWS). Evaluated strictly as eligibility criteria. Click a category to select or deselect.
              </span>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="income">Annual Family Income (₹ INR)</label>
              <input
                id="income"
                type="number"
                className="form-input"
                value={profile.familyIncome !== null && profile.familyIncome !== undefined ? profile.familyIncome : ''}
                onChange={(e) => upd('familyIncome', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="e.g. 250000"
              />
              <span className="form-hint">Leave blank if pending income certificate</span>
            </div>
          </div>
        </div>

        {/* ── Domicile Location ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, background: '#e6f4ea', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={15} color="var(--success)" />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>State & Domicile</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>Enables state-specific welfare schemes</p>
            </div>
          </div>
          <div className="profile-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="state">State of Domicile</label>
              <select id="state" className="form-select" value={profile.state ?? ''} onChange={(e) => upd('state', e.target.value)}>
                <option value="">Select State…</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="district">District</label>
              <input
                id="district"
                className="form-input"
                value={profile.district ?? ''}
                onChange={(e) => upd('district', e.target.value)}
                placeholder="e.g. Pune, Jaipur, etc."
              />
            </div>
          </div>
        </div>

        {/* ── Education ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, background: '#EAF3E2', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={15} color="#7c3aed" />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Educational Background</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>Matched against academic stage & merit cutoffs</p>
            </div>
          </div>
          <div className="profile-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="eduLevel">Education Level</label>
              <select id="eduLevel" className="form-select" value={profile.educationLevel ?? ''} onChange={(e) => upd('educationLevel', e.target.value)}>
                <option value="">Select Level…</option>
                <option value="10th">10th Grade / Secondary</option>
                <option value="12th">12th Grade / Senior Secondary</option>
                <option value="UG">Undergraduate (UG / Bachelor's)</option>
                <option value="PG">Postgraduate (PG / Master's)</option>
                <option value="Diploma">Diploma / Polytechnic</option>
                <option value="PhD">PhD / Doctorate / Research</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="institution">College / School Name</label>
              <input
                id="institution"
                className="form-input"
                value={profile.institution ?? ''}
                onChange={(e) => upd('institution', e.target.value)}
                placeholder="e.g. Government Engineering College"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="course">Course / Stream</label>
              <input
                id="course"
                className="form-input"
                value={profile.course ?? ''}
                onChange={(e) => upd('course', e.target.value)}
                placeholder="e.g. B.Tech Computer Science, B.Sc, etc."
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="year">Year of Study</label>
              <input
                id="year"
                type="number"
                min={1}
                max={6}
                className="form-input"
                value={profile.yearOfStudy ?? ''}
                onChange={(e) => upd('yearOfStudy', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="1 to 5"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="marks">Academic Percentage (%)</label>
              <input
                id="marks"
                type="number"
                step="0.1"
                min={0}
                max={100}
                className="form-input"
                value={profile.academicPercentage !== null && profile.academicPercentage !== undefined ? profile.academicPercentage : ''}
                onChange={(e) => upd('academicPercentage', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="e.g. 84.5"
              />
            </div>
          </div>
        </div>

        {/* ── Special Attributes ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} color="var(--text-3)" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Special Welfare Attributes</span>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">Person with Disability (PwD)</div>
              <div className="toggle-desc">Enables matching with disability assistance & stipend schemes</div>
            </div>
            <Toggle checked={!!profile.disabilityStatus} onChange={(v) => upd('disabilityStatus', v)} />
          </div>

          {profile.disabilityStatus && (
            <div className="form-group" style={{ marginTop: 12, paddingLeft: 0 }}>
              <label className="form-label" htmlFor="disabilityPct">Disability Percentage (%)</label>
              <input
                id="disabilityPct"
                type="number"
                min={0}
                max={100}
                className="form-input"
                style={{ maxWidth: 200 }}
                value={profile.disabilityPercentage ?? ''}
                onChange={(e) => upd('disabilityPercentage', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="e.g. 40"
              />
            </div>
          )}

          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">Minority Community Member</div>
              <div className="toggle-desc">Unlocks minority-specific educational aid & schemes</div>
            </div>
            <Toggle checked={!!profile.minorityStatus} onChange={(v) => upd('minorityStatus', v)} />
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className="card prof-wide" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, background: '#fce8e6', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={15} color="var(--danger)" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Reminder preferences</span>
          </div>

          <div className="notif-methods" role="group" aria-label="Reminder delivery method">
            <div className="notif-method on">
              <span className="notif-method-head"><Bell size={14} /> Email <em>Selected</em></span>
              <label className="form-label" htmlFor="notif-email">Reminders are sent to</label>
              <input id="notif-email" className="form-input" type="email" value={accountEmail} readOnly aria-describedby="notif-email-hint" />
              <span id="notif-email-hint" className="form-hint">This is your account email. A separate notification address can’t be saved yet.</span>
            </div>
            <div className="notif-method off" aria-disabled="true">
              <span className="notif-method-head">SMS <em>Not available yet</em></span>
              <span className="form-hint">Text-message reminders aren’t supported by the current service, so they can’t be turned on.</span>
            </div>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">Email Deadline Notifications</div>
              <div className="toggle-desc">Receive email alerts before scheme application deadlines close</div>
            </div>
            <Toggle checked={!!prefs.emailNotificationsEnabled} onChange={(v) => setPrefs((p) => ({ ...p, emailNotificationsEnabled: v }))} />
          </div>

          <div style={{ marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid var(--border)', opacity: prefs.emailNotificationsEnabled ? 1 : 0.4, pointerEvents: prefs.emailNotificationsEnabled ? 'auto' : 'none' }}>
            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-title">30-day reminder</div>
                <div className="toggle-desc">Alert 30 days before deadline</div>
              </div>
              <Toggle checked={!!prefs.reminder30Days} onChange={(v) => setPrefs((p) => ({ ...p, reminder30Days: v }))} disabled={!prefs.emailNotificationsEnabled} />
            </div>
            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-title">7-day reminder</div>
                <div className="toggle-desc">Alert 1 week before deadline</div>
              </div>
              <Toggle checked={!!prefs.reminder7Days} onChange={(v) => setPrefs((p) => ({ ...p, reminder7Days: v }))} disabled={!prefs.emailNotificationsEnabled} />
            </div>
            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-title">1-day reminder</div>
                <div className="toggle-desc">Final alert the day before deadline</div>
              </div>
              <Toggle checked={!!prefs.reminder1Day} onChange={(v) => setPrefs((p) => ({ ...p, reminder1Day: v }))} disabled={!prefs.emailNotificationsEnabled} />
            </div>
          </div>
        </div>

        {/* Save button & summary */}
        <div className="prof-save">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="var(--blue)" />
            <span>
              {dirty ? <b style={{ color: 'var(--warning)' }}>Unsaved changes</b>
                : savedAt ? <b style={{ color: 'var(--success)' }}>All changes saved at {savedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b>
                : 'No unsaved changes'}
              {' · '}Saving refreshes your personalized recommendations
            </span>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 160 }}>
            {saving ? (
              <><div className="spinner" />Saving…</>
            ) : (
              <><Save size={16} /> Save Profile</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
