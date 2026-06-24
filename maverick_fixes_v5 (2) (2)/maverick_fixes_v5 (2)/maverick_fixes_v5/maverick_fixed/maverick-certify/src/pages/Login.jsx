import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo.jsx';
import { useTheme } from '../hooks/useTheme.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function Login() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || 'Invalid email or password. Please try again.');
        return;
      }

      const { _id, fullName, email: userEmail, role, avatarColor } = json.data;

      localStorage.setItem('mc_user', JSON.stringify({
        _id,
        name: fullName,
        email: userEmail,
        role,
        avatarColor,
      }));

      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError('Unable to connect to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Theme-aware colors (everything this page needs, no external CSS) ───
  const c = isDark
    ? {
        pageBg: 'linear-gradient(160deg, #1A0A2E 0%, #150f28 45%, #0D0D1A 100%)',
        glowOpacity: 0.55,
        cardBg: 'linear-gradient(155deg, rgba(40,24,64,0.55), rgba(20,12,36,0.45))',
        cardBorder: 'rgba(255,255,255,0.14)',
        cardShadow: '0 20px 60px -15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.18)',
        title: '#f5f3fb',
        subtitle: '#cbc0e0',
        label: '#9a8cba',
        inputBg: 'rgba(20,12,36,0.45)',
        inputBorder: 'rgba(255,255,255,0.14)',
        inputText: '#f5f3fb',
        placeholder: 'rgba(245,243,251,0.4)',
        eyeColor: '#9a8cba',
      }
    : {
        pageBg: 'radial-gradient(120% 140% at 0% 0%, #f9f5ff 0%, #f6f4fb 45%, #f3eefa 100%)',
        glowOpacity: 0.4,
        cardBg: 'linear-gradient(155deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35))',
        cardBorder: 'rgba(255,255,255,0.5)',
        cardShadow: '0 20px 60px -15px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
        title: '#1e1530',
        subtitle: '#4b3f63',
        label: '#6b5d85',
        inputBg: 'rgba(255,255,255,0.45)',
        inputBorder: 'rgba(255,255,255,0.6)',
        inputText: '#1e1530',
        placeholder: 'rgba(75,63,99,0.5)',
        eyeColor: '#6b5d85',
      };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden',
        background: c.pageBg,
      }}
    >
      {/* Ambient background glow */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <span style={{
          position: 'absolute', width: '34rem', height: '34rem', borderRadius: '9999px',
          filter: 'blur(90px)', opacity: c.glowOpacity, background: '#A855F7',
          top: '50%', left: '50%', transform: 'translate(-80%, -50%)',
        }} />
        <span style={{
          position: 'absolute', width: '34rem', height: '34rem', borderRadius: '9999px',
          filter: 'blur(90px)', opacity: c.glowOpacity, background: '#EC4899',
          top: '50%', left: '50%', transform: 'translate(-20%, -50%)',
        }} />
        <span style={{
          position: 'absolute', width: '18rem', height: '18rem', borderRadius: '9999px',
          filter: 'blur(90px)', opacity: c.glowOpacity - 0.05, background: '#6366F1',
          top: 0, right: '33%',
        }} />
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 2,
          width: '2.75rem', height: '2.75rem', borderRadius: '9999px', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #A855F7, #EC4899)', color: 'white',
          boxShadow: '0 6px 20px -6px rgba(168, 85, 247, 0.55)',
        }}
      >
        {isDark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {/* Glass card — logo, title, and form all live inside this one box */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '26rem',
          background: c.cardBg,
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          border: `1px solid ${c.cardBorder}`,
          borderRadius: '24px',
          boxShadow: c.cardShadow,
          padding: '2.5rem 2rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Logo size={96} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: c.title, margin: 0 }}>
            Maverick Certify
          </h1>
          <p style={{ fontSize: '0.875rem', color: c.subtitle, marginTop: '0.25rem' }}>
            Certification Management Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              fontSize: '0.7rem', fontWeight: 600, color: c.label, textTransform: 'uppercase',
              letterSpacing: '0.06em', display: 'block', marginBottom: '0.4rem',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
              className="mc-login-input"
              style={{
                width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.9rem',
                borderRadius: '12px', border: `1px solid ${c.inputBorder}`,
                background: c.inputBg, color: c.inputText, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              fontSize: '0.7rem', fontWeight: 600, color: c.label, textTransform: 'uppercase',
              letterSpacing: '0.06em', display: 'block', marginBottom: '0.4rem',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                className="mc-login-input"
                style={{
                  width: '100%', padding: '0.65rem 2.4rem 0.65rem 0.85rem', fontSize: '0.9rem',
                  borderRadius: '12px', border: `1px solid ${c.inputBorder}`,
                  background: c.inputBg, color: c.inputText, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: c.eyeColor,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p style={{
              fontSize: '0.75rem', color: '#fb7185', background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.25)', borderRadius: '10px',
              padding: '0.5rem 0.75rem', marginBottom: '1rem',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.7rem', fontSize: '0.9rem', fontWeight: 600,
              color: 'white', border: 'none', borderRadius: '12px', cursor: loading ? 'default' : 'pointer',
              background: 'linear-gradient(135deg, #A855F7, #EC4899)',
              boxShadow: '0 6px 20px -6px rgba(168, 85, 247, 0.45)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <svg style={{ width: '1rem', height: '1rem', animation: 'mc-spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                </svg>
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes mc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .mc-login-input::placeholder { color: ${c.placeholder}; }
      `}</style>
    </div>
  );
}