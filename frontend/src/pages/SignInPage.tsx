import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../components/shared/Screens';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const DEV_LOGIN = import.meta.env.DEV;

interface Props {
  isAuthed: boolean;
  onMockLogin: (username: string) => Promise<boolean>;
  onGoogleCredential: (idToken: string) => Promise<boolean>;
}

export const SignInPage: React.FC<Props> = ({ isAuthed, onMockLogin, onGoogleCredential }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';
  const [username, setUsername] = useState('student_demo_1');
  const [busy, setBusy] = useState(false);

  if (isAuthed) return <Navigate to={from} replace />;

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    if (ok) navigate(from, { replace: true });
  };

  return (
    <div className="signin">
      <div className="signin-panel">
        <Link to="/" aria-label="GovAI home"><BrandMark /></Link>
        <h1 className="display-md">Welcome back.</h1>
        <p className="signin-lead">Sign in to see the schemes matched to your profile, your saved schemes and your applications.</p>

        {GOOGLE_CLIENT_ID && (
          <GoogleSignInButton clientId={GOOGLE_CLIENT_ID} onCredential={(t) => run(() => onGoogleCredential(t))} />
        )}

        {DEV_LOGIN && (
          <form className="signin-dev" onSubmit={(e) => { e.preventDefault(); run(() => onMockLogin(username.trim() || 'student_demo_1')); }}>
            <label className="form-label" htmlFor="dev-user">Development sign-in</label>
            <input id="dev-user" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} disabled={busy} />
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : <>Continue <ArrowRight size={16} /></>}
            </button>
            <span className="form-hint">Only visible in local development builds.</span>
          </form>
        )}

        {!GOOGLE_CLIENT_ID && !DEV_LOGIN && (
          <div className="alert alert-error" role="alert">
            Sign-in isn't configured for this deployment. Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
          </div>
        )}

        <p className="signin-note"><ShieldCheck size={14} /> We only use your account to save your profile and applications.</p>
      </div>
      <aside className="signin-aside" aria-hidden="true">
        <p className="display-md">Know where you stand before you apply.</p>
        <p>Every scheme shows which eligibility rules were checked, and links back to its official source.</p>
      </aside>
    </div>
  );
};
