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
import { LocationAutocomplete } from "./components/LocationAutocomplete";
import { api } from "./lib/api";
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

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/assets', label: 'Assets', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  { path: '/scripts', label: 'Scripts', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { path: '/events', label: 'Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/announcements', label: 'Announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  { path: '/shoutouts', label: 'Shoutouts', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { path: '/polls', label: 'Polls', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/competitions', label: 'Competitions', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  { path: '/feature-requests', label: 'Features', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { path: '/skills-matrix', label: 'Skills', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/rfx', label: 'RFx', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { path: '/org-chart', label: 'Org Chart', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { path: '/teams', label: 'Teams', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
];

function NavIcon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function RootContent() {
  const { isAdmin, logout, admins, currentUserName, login } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    const autoLogin = async () => {
      if (typeof window !== 'undefined') {
        try {
          const response = await fetch('/api/auth/user');
          if (response.ok) {
            const userData = await response.json() as { authenticated?: boolean; email?: string; name?: string };
            if (userData.authenticated && userData.email) {
              login(userData.email, userData.name || '');
              setCurrentUserEmail(userData.email);
              localStorage.setItem('seportal_user', userData.email);
              localStorage.setItem('seportal_user_name', userData.name || '');
              setCurrentPath(window.location.pathname);
              return;
            }
          }
        } catch (error) {
          console.log('Cloudflare Access not configured, falling back to localStorage');
        }

        const savedUser = localStorage.getItem('seportal_user');
        const savedUserName = localStorage.getItem('seportal_user_name');
        if (savedUser && savedUserName) {
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
      const handleLocationChange = () => setCurrentPath(window.location.pathname);
      window.addEventListener('popstate', handleLocationChange);
      window.addEventListener('pushstate', handleLocationChange);
      return () => {
        window.removeEventListener('popstate', handleLocationChange);
        window.removeEventListener('pushstate', handleLocationChange);
      };
    }
  }, []);

  // Track page views for tab analytics
  useEffect(() => {
    if (!currentPath) return;
    const match = NAV_ITEMS.find(item => item.path === currentPath);
    const label = match?.label
      || (currentPath === '/admin' ? 'Admin' : undefined)
      || (currentPath === '/my-profile' ? 'My Profile' : undefined);
    const userEmail = localStorage.getItem('seportal_user') || undefined;
    const userName = localStorage.getItem('seportal_user_name') || undefined;
    api.pageViews.track({
      user_email: userEmail,
      user_name: userName,
      page_path: currentPath,
      page_label: label,
    });
  }, [currentPath]);

  // Check if user has an employee profile on login
  // Only prompt once per session, and respect a 7-day snooze if the user skipped
  useEffect(() => {
    if (!currentUserEmail || profileChecked) return;
    const snoozeKey = `seportal_profile_skipped_${currentUserEmail}`;
    const snoozedUntil = localStorage.getItem(snoozeKey);
    if (snoozedUntil && Date.now() < Number(snoozedUntil)) {
      setProfileChecked(true);
      return;
    }
    const checkProfile = async () => {
      try {
        const profile = await api.employees.getByEmail(currentUserEmail);
        if (!profile) {
          setShowProfilePrompt(true);
        }
      } catch (err: any) {
        // Log the error but don't block the user
        api.errorLogs.report({
          user_email: currentUserEmail || undefined,
          user_name: currentUserName || undefined,
          error_type: 'profile_check',
          error_message: err?.message || 'Failed to check employee profile',
          error_context: 'RootContent.checkProfile',
          stack_trace: err?.stack,
        });
      }
      setProfileChecked(true);
    };
    checkProfile();
  }, [currentUserEmail, profileChecked]);

  const navItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }] : []),
  ];

  return (
    <div className="app-container">
      <nav className="main-nav">
        {/* Top bar */}
        <div className="nav-top">
          <div className="nav-logo">
            <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', gap: '10px' }}>
              <img
                src="/cloudflare-logo.png"
                alt="Cloudflare"
                loading="eager"
                decoding="async"
                style={{ height: '22px', width: 'auto', flexShrink: 0, objectFit: 'contain' }}
              />
              <h1>SolutionHub</h1>
            </a>
            {isAdmin && <span className="admin-badge">Admin</span>}
            <span className="version-badge">v2.0</span>
            <span className="feedback-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Bug or feedback? Report to <strong>Arun Potta</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GlobalSearch />

            {currentUserName && (
              <a
                href="/my-profile"
                style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: currentPath === '/my-profile' ? 'var(--bg-tertiary)' : 'transparent',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, var(--cf-orange), var(--cf-orange-dark))',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {currentUserName.charAt(0).toUpperCase()}
                </span>
                {currentUserName}
              </a>
            )}

            {!currentUserEmail ? (
              <button onClick={() => setShowLoginModal(true)} className="btn-sm">
                Login
              </button>
            ) : (
              <button
                onClick={() => { logout(); setCurrentUserEmail(null); window.location.reload(); }}
                className="btn-secondary btn-sm"
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
              <span className="theme-icon-light">&#9728;</span>
              <span className="theme-icon-dark">&#9790;</span>
            </button>
          </div>
        </div>

        {/* Nav links */}
        <div className="nav-links-bar">
          <ul>
            {navItems.map(item => (
              <li key={item.path}>
                <a href={item.path} className={currentPath === item.path ? 'active' : ''}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <NavIcon d={item.icon} size={14} />
                    {item.label}
                  </span>
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
      {showProfilePrompt && currentUserEmail && (
        <ProfileCompletionModal
          email={currentUserEmail}
          name={currentUserName || ''}
          onClose={() => {
            // Snooze for 7 days so the user isn't nagged on every load
            const snoozeKey = `seportal_profile_skipped_${currentUserEmail}`;
            localStorage.setItem(snoozeKey, String(Date.now() + 7 * 86400000));
            setShowProfilePrompt(false);
          }}
        />
      )}
    </div>
  );
}

function ProfileCompletionModal({ email, name, onClose }: { email: string; name: string; onClose: () => void }) {
  const [form, setForm] = useState({
    name: name || '',
    title: '',
    department: '',
    location: '',
    region: '',
    bio: '',
  });
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1 = profile, 2 = team

  useEffect(() => {
    api.groups.getAll().then((data) => {
      setGroups(Array.isArray(data) ? data : []);
    }).catch((err) => {
      api.errorLogs.report({
        user_email: email,
        error_type: 'profile_onboarding',
        error_message: err?.message || 'Failed to load groups',
        error_context: 'ProfileCompletionModal.loadGroups',
        stack_trace: err?.stack,
      });
    });
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const employeeId = Date.now().toString();
      await api.employees.create({
        id: employeeId,
        name: form.name || name,
        email,
        title: form.title,
        department: form.department,
        location: form.location,
        region: form.region,
        bio: form.bio,
        managerId: null,
        photoUrl: '',
        startDate: '',
      });

      // Join selected groups
      for (const groupId of selectedGroups) {
        try {
          await api.groups.addMember(groupId, email);
        } catch (err: any) {
          api.errorLogs.report({
            user_email: email,
            error_type: 'profile_onboarding',
            error_message: err?.message || `Failed to join group ${groupId}`,
            error_context: 'ProfileCompletionModal.joinGroup',
            stack_trace: err?.stack,
          });
        }
      }

      // Create new team if specified
      if (newTeamName.trim()) {
        try {
          await api.groups.create({
            id: `team-${Date.now()}`,
            name: newTeamName.trim(),
            description: '',
            members: [email],
            admins: [],
          });
        } catch (err: any) {
          api.errorLogs.report({
            user_email: email,
            error_type: 'profile_onboarding',
            error_message: err?.message || 'Failed to create new team',
            error_context: 'ProfileCompletionModal.createTeam',
            stack_trace: err?.stack,
          });
        }
      }

      // Update the user's display name if they changed it
      if (form.name && form.name !== name) {
        await api.users.createOrUpdate(email, form.name);
        localStorage.setItem('seportal_user_name', form.name);
      }

      onClose();
      window.location.reload();
    } catch (err: any) {
      const msg = err?.message || 'Failed to save profile';
      setError(msg + ' -- You can skip for now and try again later.');
      api.errorLogs.report({
        user_email: email,
        error_type: 'profile_onboarding',
        error_message: msg,
        error_context: 'ProfileCompletionModal.handleSave',
        stack_trace: err?.stack,
      });
    }
    setSaving(false);
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>{step === 1 ? 'Complete Your Profile' : 'Join a Team'}</h3>
          <button className="modal-close" onClick={onClose}>&#215;</button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {step === 1
            ? 'Help your teammates find you. Fill in your details below, or skip for now.'
            : 'Join existing teams or create a new one. You can change this later.'}
        </p>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '13px', color: '#EF4444', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Senior Solutions Engineer"
                required
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                className="form-input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g., Sales Engineering"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <LocationAutocomplete
                value={form.location}
                onChange={(value) => setForm({ ...form, location: value })}
                placeholder="e.g., San Francisco, CA, USA"
              />
            </div>

            <div className="form-group">
              <label>Region</label>
              <select
                className="form-input"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                <option value="">-- Select Region --</option>
                <option value="AMER">AMER (Americas)</option>
                <option value="EMEA">EMEA (Europe, Middle East, Africa)</option>
                <option value="APAC">APAC (Asia Pacific)</option>
                <option value="LATAM">LATAM (Latin America)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                className="form-input"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="A short intro about yourself (optional)"
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Skip for now
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!form.title.trim()) {
                    setError('Title is required');
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
              >
                Next: Join a Team
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {groups.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Select teams to join
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px 0' }}>
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: selectedGroups.includes(group.id) ? '1px solid var(--cf-orange)' : '1px solid var(--border-color)',
                        background: selectedGroups.includes(group.id) ? 'rgba(246,130,31,0.05)' : 'var(--bg-tertiary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--cf-orange)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{group.name}</div>
                        {group.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{group.description}</div>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {(group.members || []).length} members
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Or create a new team
              </label>
              <input
                type="text"
                className="form-input"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g., APAC Solutions Engineers"
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Skip
              </button>
              <button type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </>
        )}
      </div>
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
    import('./lib/api').then(({ api }) => {
      return api.users.getByEmail(emailToUse);
    }).then((user) => {
      if (user && user.name) {
        login(emailToUse, user.name);
        localStorage.setItem('seportal_user', emailToUse);
        localStorage.setItem('seportal_user_name', user.name);
        onClose();
        window.location.reload();
      } else {
        setSelectedEmail(emailToUse);
        setShowNamePrompt(true);
      }
    }).catch(() => {
      setSelectedEmail(emailToUse);
      setShowNamePrompt(true);
    });
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName) {
      try {
        const { api } = await import('./lib/api');
        await api.users.createOrUpdate(selectedEmail, firstName);
        login(selectedEmail, firstName);
        localStorage.setItem('seportal_user', selectedEmail);
        localStorage.setItem('seportal_user_name', firstName);
        onClose();
        setShowNamePrompt(false);
        setFirstName('');
        setSelectedEmail('');
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
        const { api } = await import('./lib/api');
        await api.users.createOrUpdate(email, firstName);
        login(email, firstName);
        localStorage.setItem('seportal_user', email);
        localStorage.setItem('seportal_user_name', firstName);
        onClose();
        setFirstName('');
        setEmail('');
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
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
          <div className="modal-header">
            <h3>Welcome!</h3>
            <button className="modal-close" onClick={() => { setShowNamePrompt(false); setSelectedEmail(''); setFirstName(''); }}>
              &#215;
            </button>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3>Sign In</h3>
          <button className="modal-close" onClick={onClose}>&#215;</button>
        </div>

        {/* Quick Login */}
        {admins.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '10px', fontWeight: 500 }}>
              Quick login
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {admins.map((adminEmail) => (
                <button
                  key={adminEmail}
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleQuickLogin(adminEmail)}
                  style={{
                    justifyContent: 'flex-start',
                    height: '42px',
                    fontSize: '13px',
                    padding: '0 16px',
                  }}
                >
                  <span style={{
                    width: '26px', height: '26px', borderRadius: '50%', fontSize: '11px', fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--cf-blue), var(--cf-blue-dark))', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {adminEmail.charAt(0).toUpperCase()}
                  </span>
                  {adminEmail}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '4px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '12px', fontWeight: 500 }}>
            Or sign in manually
          </p>
        </div>

        <form onSubmit={handleManualSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
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
            <label htmlFor="firstName-manual">Name</label>
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
              Sign In
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
