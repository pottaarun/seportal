import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
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
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const theme = localStorage.getItem('theme') || 'light';
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
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('seportal_user');
      const savedUserName = localStorage.getItem('seportal_user_name');
      if (savedUser && savedUserName) {
        // Automatically login with saved credentials
        login(savedUser, savedUserName);
        setCurrentUserEmail(savedUser);
      }
      setCurrentPath(window.location.pathname);
    }
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
        <div className="nav-content">
          <div className="nav-logo">
            <h1>SE Portal</h1>
            <span className="cf-badge">Cloudflare</span>
            {isAdmin && <span className="admin-badge">Admin</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <GlobalSearch />
            <ul>
              <li>
                <a href="/" className={currentPath === '/' ? 'active' : ''}>
                  <span className="nav-icon">📊</span>
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/assets" className={currentPath === '/assets' ? 'active' : ''}>
                  <span className="nav-icon">📦</span>
                  Assets
                </a>
              </li>
              <li>
                <a href="/scripts" className={currentPath === '/scripts' ? 'active' : ''}>
                  <span className="nav-icon">💻</span>
                  Scripts
                </a>
              </li>
              <li>
                <a href="/events" className={currentPath === '/events' ? 'active' : ''}>
                  <span className="nav-icon">📅</span>
                  Events
                </a>
              </li>
              <li>
                <a href="/shoutouts" className={currentPath === '/shoutouts' ? 'active' : ''}>
                  <span className="nav-icon">🎉</span>
                  Shoutouts
                </a>
              </li>
              {isAdmin && (
                <li>
                  <a href="/admin" className={currentPath === '/admin' ? 'active' : ''}>
                    <span className="nav-icon">⚙️</span>
                    Admin
                  </a>
                </li>
              )}
            </ul>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {currentUserName && (
                <span style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>
                  Hi, {currentUserName}!
                </span>
              )}
              {!currentUserEmail ? (
                <button
                  onClick={() => setShowLoginModal(true)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Login
                </button>
              ) : (
                <button
                  onClick={() => {
                    logout();
                    setCurrentUserEmail(null);
                    window.location.reload();
                  }}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
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
                <div className="toggle-slider" />
              </button>
            </div>
          </div>
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

  const handleQuickLogin = async (emailToUse: string) => {
    // Check database for existing user
    try {
      const { api } = await import('./lib/api');
      const user = await api.users.getByEmail(emailToUse);

      if (user && user.name) {
        // User exists in database, login directly
        login(emailToUse, user.name);
        localStorage.setItem('seportal_user', emailToUse);
        localStorage.setItem('seportal_user_name', user.name);
        onClose();
        window.location.reload();
      } else {
        // New user, prompt for name
        setSelectedEmail(emailToUse);
        setShowNamePrompt(true);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // Fallback to prompt for name
      setSelectedEmail(emailToUse);
      setShowNamePrompt(true);
    }
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
