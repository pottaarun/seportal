import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useState, useEffect } from "react";
import { AdminProvider, useAdmin } from "./contexts/AdminContext";
import { GlobalSearch } from "./components/GlobalSearch";
import "./globals.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const theme = localStorage.getItem('theme') || 'dark';
              document.documentElement.setAttribute('data-theme', theme);
            })();
          `
        }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function RootContent() {
  const { isAdmin, logout, admins, currentUserName, login } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    const autoLogin = async () => {
      if (typeof window !== 'undefined') {
        // First, try to get user from Cloudflare Access
        try {
          const response = await fetch('/api/auth/user');
          if (response.ok) {
            const userData = await response.json() as { authenticated?: boolean; email?: string; name?: string };
            if (userData.authenticated && userData.email) {
              // Auto-login with Cloudflare Access credentials
              login(userData.email, userData.name || '');
              setCurrentUserEmail(userData.email);

              // Save to localStorage for persistence
              localStorage.setItem('seportal_user', userData.email);
              localStorage.setItem('seportal_user_name', userData.name || '');

              setCurrentPath(window.location.pathname);
              return;
            }
          }
        } catch (error) {
          console.log('Cloudflare Access not configured, falling back to localStorage');
        }

        // Fallback to localStorage if Access is not configured
        const savedUser = localStorage.getItem('seportal_user');
        const savedUserName = localStorage.getItem('seportal_user_name');

        if (savedUser && savedUserName) {
          // Auto-login with saved credentials from localStorage (persists across page refreshes)
          login(savedUser, savedUserName);
          setCurrentUserEmail(savedUser);
        }
        setCurrentPath(window.location.pathname);
      }
    };
    autoLogin();
  }, [login]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleLocationChange = () => {
        setCurrentPath(window.location.pathname);
      };
      window.addEventListener('popstate', handleLocationChange);
      window.addEventListener('pushstate', handleLocationChange);
      return () => {
        window.removeEventListener('popstate', handleLocationChange);
        window.removeEventListener('pushstate', handleLocationChange);
      };
    }
  }, []);

  return (
    <div className="app-container">
      <nav className="main-nav">
        {/* Top bar: Logo + Search + User */}
        <div className="nav-top">
          <div className="nav-logo">
            <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', gap: '10px' }}>
              <img
                src="/cloudflare-logo.png"
                alt="Cloudflare"
                loading="eager"
                decoding="async"
                style={{ height: '24px', width: 'auto', flexShrink: 0, objectFit: 'contain' }}
              />
              <h1>SolutionHub</h1>
            </a>
            {isAdmin && <span className="admin-badge">Admin</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GlobalSearch />
            {currentUserName && (
              <a
                href="/my-profile"
                style={{
                  fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500,
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px', borderRadius: '6px',
                  background: currentPath === '/my-profile' ? 'var(--bg-tertiary)' : 'transparent',
                  border: '1px solid var(--border-color)', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%', fontSize: '11px', fontWeight: 700,
                  background: 'linear-gradient(135deg, var(--cf-orange), #E06717)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {currentUserName.charAt(0).toUpperCase()}
                </span>
                {currentUserName}
              </a>
            )}
            {!currentUserEmail ? (
              <button onClick={() => setShowLoginModal(true)} style={{ padding: '5px 12px', fontSize: '12px', height: 'auto' }}>
                Login
              </button>
            ) : (
              <button
                onClick={() => { logout(); setCurrentUserEmail(null); window.location.reload(); }}
                className="btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12px', height: 'auto' }}
              >
                Logout
              </button>
            )}
            <button
              className="dark-mode-toggle"
              onClick={() => {
                const html = document.documentElement;
                const currentTheme = html.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                html.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
              }}
              aria-label="Toggle dark mode"
            >
              <span className="theme-icon-light">☀️</span>
              <span className="theme-icon-dark">🌙</span>
            </button>
          </div>
        </div>

        {/* Nav links bar */}
        <div className="nav-links-bar">
          <ul>
            {[
              { path: '/', label: 'Dashboard' },
              { path: '/assets', label: 'Assets' },
              { path: '/scripts', label: 'Scripts' },
              { path: '/events', label: 'Events' },
              { path: '/announcements', label: 'Announcements' },
              { path: '/shoutouts', label: 'Shoutouts' },
              { path: '/polls', label: 'Polls' },
              { path: '/competitions', label: 'Competitions' },
              { path: '/feature-requests', label: 'Features' },
              { path: '/skills-matrix', label: 'Skills' },
              { path: '/rfx', label: 'RFx' },
              { path: '/org-chart', label: 'Org Chart' },
              { path: '/teams', label: 'Teams' },
              ...(isAdmin ? [{ path: '/admin', label: 'Admin' }] : []),
            ].map(item => (
              <li key={item.path}>
                <a href={item.path} className={currentPath === item.path ? 'active' : ''}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
      <LoginModal show={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}

function LoginModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { login, admins } = useAdmin();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');

  if (!show) return null;

  const handleQuickLogin = (emailToUse: string) => {
    // Check database for existing user
    console.log('[DEBUG] Quick login clicked for:', emailToUse);

    // Add visible feedback for debugging
    const startTime = Date.now();

    // Use dynamic import directly without React Router preloader
    import('./lib/api').then(({ api }) => {
      console.log('[DEBUG] API module loaded');
      console.log('[DEBUG] Time elapsed:', Date.now() - startTime, 'ms');
      return api.users.getByEmail(emailToUse);
    }).then((user) => {
      console.log('[DEBUG] User from database:', user);
      console.log('[DEBUG] Time elapsed:', Date.now() - startTime, 'ms');

      if (user && user.name) {
        // User exists in database, login directly
        console.log('[DEBUG] User exists with name, auto-logging in:', user.name);
        login(emailToUse, user.name);
        localStorage.setItem('seportal_user', emailToUse);
        localStorage.setItem('seportal_user_name', user.name);
        onClose();
        window.location.reload();
      } else {
        // New user, prompt for name
        console.log('[DEBUG] User not found or no name, prompting');
        setSelectedEmail(emailToUse);
        setShowNamePrompt(true);
      }
    }).catch((error) => {
      console.error('[DEBUG] Error checking user:', error);
      // Fallback to prompt for name
      setSelectedEmail(emailToUse);
      setShowNamePrompt(true);
    });
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName) {
      try {
        // Save user to database
        const { api } = await import('./lib/api');
        await api.users.createOrUpdate(selectedEmail, firstName);

        // Login and save to localStorage
        login(selectedEmail, firstName);
        localStorage.setItem('seportal_user', selectedEmail);
        localStorage.setItem('seportal_user_name', firstName);
        onClose();
        setShowNamePrompt(false);
        setFirstName('');
        setSelectedEmail('');
        // Force page reload to update UI
        window.location.reload();
      } catch (error) {
        console.error('Error saving user:', error);
        alert('Failed to save user information');
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && firstName) {
      try {
        // Save user to database
        const { api } = await import('./lib/api');
        await api.users.createOrUpdate(email, firstName);

        // Login and save to localStorage
        login(email, firstName);
        localStorage.setItem('seportal_user', email);
        localStorage.setItem('seportal_user_name', firstName);
        onClose();
        setFirstName('');
        setEmail('');
        // Force page reload to update UI
        window.location.reload();
      } catch (error) {
        console.error('Error saving user:', error);
        alert('Failed to save user information');
      }
    }
  };

  if (showNamePrompt) {
    return (
      <div className="modal-overlay" onClick={() => { setShowNamePrompt(false); setSelectedEmail(''); setFirstName(''); }}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Welcome!</h3>
            <button className="modal-close" onClick={() => { setShowNamePrompt(false); setSelectedEmail(''); setFirstName(''); }}>×</button>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            What should we call you?
          </p>

          <form onSubmit={handleNameSubmit}>
            <div className="form-group">
              <input
                id="firstName"
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
                autoFocus
                required
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowNamePrompt(false); setSelectedEmail(''); setFirstName(''); }}>
                Back
              </button>
              <button type="submit" disabled={!firstName}>
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Login</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Quick Login - Select an admin:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {admins.map((adminEmail) => (
              <button
                key={adminEmail}
                type="button"
                onClick={() => handleQuickLogin(adminEmail)}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--cf-blue)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = 'var(--cf-blue)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                {adminEmail}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '24px',
          marginBottom: '16px'
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
            Or enter manually:
          </p>
        </div>

        <form onSubmit={handleManualSubmit}>
          <div className="form-group">
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@cloudflare.com"
            />
          </div>
          <div className="form-group">
            <input
              id="firstName-manual"
              type="text"
              className="form-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Your first name"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={!email || !firstName}>
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <AdminProvider>
      <RootContent />
    </AdminProvider>
  );
}
