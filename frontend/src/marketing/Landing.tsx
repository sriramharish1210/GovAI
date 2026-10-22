import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Menu, X, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { BrandMark } from '../components/shared/Screens';
import './marketing.css';

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#trust', label: 'Trust' },
];

const FEATURES = [
  ['Eligibility, rule by rule', 'Every scheme is checked against your education, income, category and state. You get Eligible, Needs verification or Not eligible — with the rules behind each result.'],
  ['Plain-language explanations', 'Government wording made readable. Summarise a scheme, or look up a term like "income certificate" in the built-in glossary.'],
  ['Side-by-side comparison', 'Put up to four schemes next to each other and compare benefits, deadlines and requirements without switching tabs.'],
  ['An advisor you can question', 'Ask the AI assistant about a scheme or your options and keep the conversation for later.'],
  ['Reports you can keep', 'Download a PDF eligibility report to share with a parent, a teacher or a scholarship counsellor.'],
  ['Stay on track', 'Save schemes, track each application from planning to completion, and set reminders before deadlines.'],
];

const STEPS = [
  ['Tell GovAI about you', 'Add your education, income, category and state once. Your profile is the only input the matching needs.'],
  ['See what fits', 'Your matches are sorted by eligibility. Open any scheme to see the rules that were checked and what is still unconfirmed.'],
  ['Apply and keep track', 'Each scheme links to its official source. Apply there, then track progress and deadlines inside GovAI.'],
];

const TRUST = [
  ['Official sources', 'Every scheme names its department and links to the official page, so you can always check the original.'],
  ['Verification you can see', 'Schemes show a verification status and when their details were last verified.'],
  ['Honest about uncertainty', 'When your profile does not give enough information, GovAI says "Needs verification" instead of guessing.'],
  ['You stay in control', 'GovAI never applies on your behalf. You apply on the official portal.'],
];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.mk .reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

const SAMPLE = [
  { name: 'Sample Merit Scholarship', dept: 'Central · Ministry of Education', status: 'ok', label: 'Eligible', note: '5 of 5 rules met' },
  { name: 'Sample State Fee Support', dept: 'State · Higher Education Dept.', status: 'warn', label: 'Needs verification', note: 'Income proof not yet confirmed' },
  { name: 'Sample Education Loan Subsidy', dept: 'Central · Ministry of Finance', status: 'no', label: 'Not eligible', note: 'Course level does not match' },
] as const;

const StatusPill: React.FC<{ s: 'ok' | 'warn' | 'no'; label: string }> = ({ s, label }) => (
  <span className={`mk-pill mk-pill-${s}`}>
    {s === 'ok' ? <CheckCircle2 size={13} /> : s === 'warn' ? <AlertCircle size={13} /> : <XCircle size={13} />}
    {label}
  </span>
);

const ProductPreview: React.FC = () => (
  <figure className="mk-preview" aria-label="Preview of the GovAI application using sample data">
    <div className="mk-frame">
      <div className="mk-frame-bar" aria-hidden="true"><i /><i /><i /></div>
      <div className="mk-frame-body">
        <div className="mk-frame-side" aria-hidden="true">
          <span className="mk-frame-brand">GovAI</span>
          {['Dashboard', 'Discover', 'My matches', 'Compare', 'Advisor', 'Saved'].map((l, i) => (
            <span key={l} className={i === 2 ? 'on' : ''}>{l}</span>
          ))}
        </div>
        <div className="mk-frame-main">
          <div className="mk-frame-head">
            <strong>Recommended for you</strong>
            <span>Matched against your profile</span>
          </div>
          <div className="mk-frame-stats">
            <div><b>1</b><span>Eligible</span></div>
            <div><b>1</b><span>Needs verification</span></div>
            <div><b>1</b><span>Not eligible</span></div>
          </div>
          <ul className="mk-frame-list">
            {SAMPLE.map((r) => (
              <li key={r.name}>
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.dept}</span>
                  <em>{r.note}</em>
                </div>
                <StatusPill s={r.status} label={r.label} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    <figcaption>Product preview · illustrative sample data, not live results</figcaption>
  </figure>
);

export const Landing: React.FC<{ isAuthed: boolean }> = ({ isAuthed }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useReveal();

  useEffect(() => {
    document.title = 'GovAI — Find the government schemes you qualify for';
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const cta = isAuthed ? 'Open dashboard' : 'Get started';

  return (
    <div className="mk">
      <header className={`mk-nav ${scrolled || open ? 'is-solid' : ''}`}>
        <div className="mk-wrap mk-nav-row">
          <Link to="/" aria-label="GovAI home"><BrandMark /></Link>
          <nav className={`mk-nav-links ${open ? 'open' : ''}`} aria-label="Primary">
            {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label}</a>)}
            <Link className="mk-nav-signin" to="/signin" onClick={() => setOpen(false)}>Sign in</Link>
          </nav>
          <Link className="mk-btn mk-btn-dark mk-nav-cta" to="/app">{cta}</Link>
          <button className="mk-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main>
        <section className="mk-hero">
          <div className="mk-wrap">
            <p className="mk-eyebrow">For students in India</p>
            <h1 className="mk-h1">
              Find the government schemes <em>you actually qualify for.</em>
            </h1>
            <p className="mk-lead">
              GovAI checks scholarships, education loans and other student schemes against your profile — and shows which rules you meet, which still need verifying, and where to apply.
            </p>
            <div className="mk-cta-row">
              <Link className="mk-btn mk-btn-lime" to="/app">{cta} <ArrowRight size={17} /></Link>
              <a className="mk-btn mk-btn-ghost" href="#how">See how it works</a>
            </div>
            <p className="mk-fine">Every scheme links back to its official source.</p>
          </div>
          <div className="mk-wrap mk-hero-preview">
            <div className="mk-hero-panel"><ProductPreview /></div>
          </div>
        </section>

        <section id="features" className="mk-section">
          <div className="mk-wrap mk-split">
            <div className="mk-split-head reveal">
              <p className="mk-eyebrow">Features</p>
              <h2 className="mk-h2">Everything between “am I eligible?” and “I’ve applied.”</h2>
            </div>
            <ol className="mk-features">
              {FEATURES.map(([t, d], i) => (
                <li key={t} className="reveal">
                  <span className="mk-num">{String(i + 1).padStart(2, '0')}</span>
                  <div><h3>{t}</h3><p>{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="how" className="mk-section mk-section-tint">
          <div className="mk-wrap">
            <div className="reveal">
              <p className="mk-eyebrow">How it works</p>
              <h2 className="mk-h2 mk-h2-narrow">From profile to application in three steps.</h2>
            </div>
            <ol className="mk-steps">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                  <span className="mk-step-n">{i + 1}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="trust" className="mk-trust">
          <div className="mk-wrap mk-split">
            <div className="mk-split-head reveal">
              <p className="mk-eyebrow mk-eyebrow-light">Trust &amp; transparency</p>
              <h2 className="mk-h2 mk-h2-light">Built so you can check our work.</h2>
              <p className="mk-trust-note">Results are guidance, not a guarantee. Always confirm the details on the official portal before you apply.</p>
            </div>
            <ul className="mk-trust-list">
              {TRUST.map(([t, d]) => (
                <li key={t} className="reveal"><h3>{t}</h3><p>{d}</p></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mk-final">
          <div className="mk-wrap reveal">
            <h2 className="mk-h2">Build your profile once. See your matches straight away.</h2>
            <div className="mk-cta-row mk-cta-center">
              <Link className="mk-btn mk-btn-dark" to="/app">{cta} <ArrowRight size={17} /></Link>
              {!isAuthed && <Link className="mk-btn mk-btn-outline" to="/signin">Sign in</Link>}
            </div>
          </div>
        </section>
      </main>

      <footer className="mk-footer">
        <div className="mk-wrap mk-footer-grid">
          <div>
            <BrandMark light />
            <p>Helping students find and understand the government support they are entitled to.</p>
          </div>
          <div>
            <h4>Product</h4>
            {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          </div>
          <div>
            <h4>App</h4>
            <Link to="/app/discover">Discover schemes</Link>
            <Link to="/app/matches">My matches</Link>
            <Link to="/app/assistant">AI advisor</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link to="/signin">Sign in</Link>
            <Link to="/app">{isAuthed ? 'Dashboard' : 'Get started'} <ArrowUpRight size={13} /></Link>
          </div>
        </div>
        <div className="mk-wrap mk-footer-base">
          <span>GovAI is an informational tool. Always confirm scheme details on the official portal.</span>
        </div>
      </footer>
    </div>
  );
};
