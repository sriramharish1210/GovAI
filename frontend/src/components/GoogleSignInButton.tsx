import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window { google?: any }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface Props {
  clientId: string;
  onCredential: (idToken: string) => void;
}

/** Renders Google's official button. The returned credential is the ID token the backend's /auth/google expects. */
export const GoogleSignInButton: React.FC<Props> = ({ clientId, onCredential }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (r: { credential?: string }) => r.credential && onCredential(r.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 280,
      });
    };
    if (window.google?.accounts?.id) { init(); return () => { cancelled = true; }; }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = GSI_SRC; script.async = true; script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', init);
    script.addEventListener('error', () => setFailed(true));
    return () => { cancelled = true; script?.removeEventListener('load', init); };
  }, [clientId, onCredential]);

  if (failed) return <p className="form-hint">Google sign-in could not be loaded. Check your connection and refresh.</p>;
  return <div ref={ref} style={{ minHeight: 44 }} />;
};
