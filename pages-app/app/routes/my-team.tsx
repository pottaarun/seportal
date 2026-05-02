// ──────────────────────────────────────────────────────────────────────────────
// /my-team — group-admin + manager dashboard
//
// Shows everyone the current user has team-leadership access to. Two ways to
// gain access (computed server-side in /api/team/my-team):
//   1. Direct report: employees.manager_id matches the user's employee id
//   2. Group admin:   user's email is in groups.admins, member's email in members
//
// Click a member to open a drill panel with full skills + curriculum +
// recent activity (loaded lazily from /api/team/member/:email/snapshot).
// The endpoint re-runs the auth check, so the panel can never show data
// for someone the user shouldn't see.
//
// The page is conditionally surfaced in the top nav: root.tsx fetches the
// /my-team summary and only renders the nav item when counts.total > 0.
// ──────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { api } from '../lib/api';
import './rfx.css';

// ──────────────────────────────────────────────────────────────────────────────
// AddDirectReportModal — admin-only quick-assign of an employee as a direct
// report. Searches the full employees list and POSTs to assign-manager.
// ──────────────────────────────────────────────────────────────────────────────
function AddDirectReportModal({ requesterEmail, onClose, onSaved }: {
  requesterEmail: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.employees.getAll()
      .then(d => setAllEmployees(Array.isArray(d) ? d : []))
      .catch(() => setAllEmployees([]))
      .finally(() => setLoading(false));
  }, []);

  // Filter out the admin themselves (can't manage yourself).
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEmployees
      .filter(e => (e.email || '').toLowerCase() !== requesterEmail.toLowerCase())
      .filter(e => {
        if (!q) return true;
        return (
          (e.name || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.title || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [allEmployees, search, requesterEmail]);

  const assign = async (emp: any) => {
    setSavingId(emp.id);
    setError(null);
    const res = await api.employees.assignManager(emp.id, requesterEmail, requesterEmail);
    setSavingId(null);
    if (!res?.success) {
      setError(res?.error || 'Failed to assign — make sure you have a corresponding employee record.');
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 14,
          boxShadow: '0 24px 56px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Add direct report
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              The employee you pick will report to <strong>{requesterEmail}</strong>.
            </div>
          </div>
          <button onClick={onClose} className="rfx-btn rfx-btn--subtle" type="button" style={{ padding: '4px 10px', fontSize: 12 }}>
            Close
          </button>
        </div>

        <div style={{ padding: '12px 18px' }}>
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or title…"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Loading employees…</p>
          ) : candidates.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No matches.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {candidates.map(emp => (
                <li key={emp.id}>
                  <button
                    onClick={() => assign(emp)}
                    disabled={savingId === emp.id}
                    type="button"
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px',
                      background: 'transparent',
                      border: '1px solid transparent',
                      borderRadius: 8,
                      cursor: savingId === emp.id ? 'wait' : 'pointer',
                      color: 'inherit',
                      textAlign: 'left',
                      opacity: savingId === emp.id ? 0.5 : 1,
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => { if (savingId !== emp.id) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Avatar id={emp.id} name={emp.name} email={emp.email} photo_url={emp.photo_url} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tidyName(emp.name) || emp.email}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {emp.title}{emp.location ? ` · ${emp.location}` : ''}
                      </div>
                    </div>
                    {savingId === emp.id ? (
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Assigning…</span>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                        background: 'rgba(99,102,241,0.14)', color: '#6366F1',
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                      }}>+ Assign</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="rfx-alert rfx-alert--error" style={{ margin: '0 18px 12px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export function meta() {
  return [
    { title: 'My Team - SolutionHub' },
    { name: 'description', content: 'Team-leadership dashboard for managers and group admins' },
  ];
}

interface Member {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string | null;
  photo_url: string | null;
  location: string | null;
  region: string | null;
  manager_id: string | null;
  sources: Array<'manager' | 'group'>;
  groups: string[];
}

const PHOTO_BASE = (import.meta as any).env?.VITE_API_URL || 'https://seportal-api.arunpotta1024.workers.dev';

// ──────────────────────────────────────────────────────────────────────────────
// Tiny formatting helpers
// ──────────────────────────────────────────────────────────────────────────────

function initialsOf(name: string, email: string): string {
  const seed = name && name.trim() ? name : email;
  const parts = (seed || '?').split(/[ .@_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || '?').toUpperCase();
}

// Simple deterministic hue from a string — used to give each avatar a
// stable color when there's no photo, so a wall of avatars looks like
// a wall of distinct people instead of identical orange circles.
function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue1 = h % 360;
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 65%, 55%), hsl(${hue2}, 70%, 45%))`;
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  if (diff < 365 * 86_400_000) return `${Math.floor(diff / (30 * 86_400_000))}mo ago`;
  return new Date(iso).toLocaleDateString();
}

// "agoldberg" -> "Agoldberg" (just makes username-style names not look broken)
function tidyName(s: string | null | undefined): string {
  if (!s) return '';
  if (s.includes(' ')) return s; // already a real name
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ──────────────────────────────────────────────────────────────────────────────
// Avatar — photo or gradient + initials. Shared by the rail rows and the
// profile hero so they always look consistent.
// ──────────────────────────────────────────────────────────────────────────────

function Avatar({ id, name, email, photo_url, size }: {
  id: string;
  name: string;
  email: string;
  photo_url?: string | null;
  size: number;
}) {
  const initials = initialsOf(name, email);
  const showPhoto = !!photo_url;
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: showPhoto ? 'transparent' : avatarGradient(email || name || id),
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        flexShrink: 0,
        overflow: 'hidden',
        // A whisper-thin ring so dark photos don't disappear into the page bg
        boxShadow: '0 0 0 1px var(--border-color)',
        letterSpacing: '0.01em',
      }}
    >
      {showPhoto ? (
        <img
          src={`${PHOTO_BASE}/api/employees/${id}/photo`}
          alt={tidyName(name) || email}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            const parent = el.parentElement!;
            el.style.display = 'none';
            parent.style.background = avatarGradient(email || name || id);
            parent.textContent = initials;
          }}
        />
      ) : initials}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SourcePill — "Direct report" / "<group name>". Compact, color-coded.
// ──────────────────────────────────────────────────────────────────────────────

function SourcePill({ kind, label }: { kind: 'manager' | 'group'; label: string }) {
  const palette = kind === 'manager'
    ? { bg: 'rgba(99,102,241,0.12)', fg: '#6366F1' }
    : { bg: 'rgba(246,130,31,0.12)', fg: 'var(--cf-orange)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 9, fontWeight: 700,
      padding: '2px 7px', borderRadius: 9999,
      background: palette.bg, color: palette.fg,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: palette.fg }} />
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MemberRow — left-rail row for one team member. Dense one-line layout.
// ──────────────────────────────────────────────────────────────────────────────

function MemberRow({ member, active, onSelect }: {
  member: Member;
  active: boolean;
  onSelect: () => void;
}) {
  const sources = new Set(member.sources);
  return (
    <button
      onClick={onSelect}
      type="button"
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px',
        background: active ? 'rgba(246,130,31,0.10)' : 'transparent',
        border: `1px solid ${active ? 'rgba(246,130,31,0.45)' : 'transparent'}`,
        borderLeft: active ? '3px solid var(--cf-orange)' : '3px solid transparent',
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        transition: 'background 0.15s ease, border-color 0.15s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar id={member.id} name={member.name} email={member.email} photo_url={member.photo_url} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 600,
          color: active ? 'var(--cf-orange)' : 'var(--text-primary)',
          minWidth: 0,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
            {tidyName(member.name) || member.email}
          </span>
          {sources.has('manager') && (
            <span title="Direct report" style={{
              flexShrink: 0,
              fontSize: 8, fontWeight: 800,
              padding: '1px 5px', borderRadius: 3,
              background: 'rgba(99,102,241,0.18)', color: '#818CF8',
              letterSpacing: '0.06em',
            }}>↳</span>
          )}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {member.title}
          {member.location && <span style={{ opacity: 0.7 }}> · {member.location}</span>}
        </div>
      </div>
      {active && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cf-orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CircleStat — compact circular ring stat. Used for "courses complete" /
// "skills assessed" so small numbers feel less like wireframe placeholders
// and more like a real dashboard.
// ──────────────────────────────────────────────────────────────────────────────

function CircleStat({ label, value, total, accent, hint }: {
  label: string;
  value: number;
  total?: number;
  accent: string;
  hint?: string;
}) {
  const pct = total && total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : (value > 0 ? 100 : 0);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 12,
      minWidth: 0,
    }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
        <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth="5" />
        <circle
          cx="28" cy="28" r={radius}
          fill="none" stroke={accent} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="28" y="32" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text-primary)">
          {total != null ? `${pct}%` : value}
        </text>
      </svg>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          color: 'var(--text-tertiary)', textTransform: 'uppercase',
        }}>{label}</div>
        <div style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 22, lineHeight: 1.1, color: 'var(--text-primary)',
          marginTop: 2, letterSpacing: '-0.01em',
        }}>
          {total != null ? `${value}/${total}` : value}
        </div>
        {hint && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TileStat — for stats that aren't a fraction (last seen, AI contributions).
// ──────────────────────────────────────────────────────────────────────────────

function TileStat({ label, value, hint, accent }: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent: string;
}) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 12,
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle accent corner glow */}
      <div aria-hidden style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: accent,
        opacity: 0.10,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
        color: 'var(--text-tertiary)', textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        position: 'relative',
        fontFamily: "'DM Serif Display', serif",
        fontSize: 26, lineHeight: 1.1, color: 'var(--text-primary)',
        marginTop: 6, letterSpacing: '-0.01em',
      }}>{value}</div>
      {hint && (
        <div style={{ position: 'relative', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SectionCard — header + body. When body is empty we render an inline
// muted line; no big "no data" box hogging space.
// ──────────────────────────────────────────────────────────────────────────────

function SectionCard({
  title, count, icon, accent = 'var(--cf-orange)', emptyText, children,
}: {
  title: string;
  count?: React.ReactNode;
  icon: React.ReactNode;
  accent?: string;
  emptyText?: string;
  children?: React.ReactNode;
}) {
  const hasContent = !!children;
  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: hasContent ? 10 : 4 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 7,
          background: `${accent}1f`, color: accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
          {count != null && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{count}</span>
          )}
        </div>
      </div>
      {hasContent ? children : (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', paddingLeft: 36 }}>
          {emptyText || 'Nothing yet.'}
        </p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Snapshot panel — profile hero + stats + sections. Lazy-loaded per click.
// ──────────────────────────────────────────────────────────────────────────────

function MemberSnapshot({ member, requesterEmail }: {
  member: Member;
  requesterEmail: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    api.team.memberSnapshot(member.email, requesterEmail)
      .then(d => {
        if (cancelled) return;
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch((e: any) => { if (!cancelled) setError(e?.message || 'Failed to load snapshot'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [member.email, requesterEmail]);

  // Profile hero header — always render with the row's metadata so the
  // page doesn't flash empty while the snapshot loads.
  return (
    <div>
      <ProfileHero member={member} viaSource={data?.access?.via} loading={loading} />

      {error && (
        <div className="rfx-alert rfx-alert--error" style={{ marginTop: 0 }}>
          {error}
        </div>
      )}

      {!error && data && <SnapshotBody data={data} />}

      {loading && !error && (
        <div style={{
          marginTop: 16, padding: '40px 0', textAlign: 'center',
          color: 'var(--text-tertiary)',
        }}>
          <div className="rfx-spinner" style={{ margin: '0 auto 12px', width: 22, height: 22 }} />
          Loading skills, curriculum, and recent activity…
        </div>
      )}
    </div>
  );
}

function ProfileHero({ member, viaSource, loading }: {
  member: Member;
  viaSource: 'manager' | 'group' | null | undefined;
  loading: boolean;
}) {
  const seed = member.email || member.name || member.id;
  // Pull the two HSL stops out of the avatar gradient so the hero
  // backdrop matches the avatar exactly — same person, same palette.
  const stops = avatarGradient(seed).match(/hsl\([^)]+\)/g) || [];
  const accent1 = stops[0] || 'hsl(20, 65%, 55%)';
  const accent2 = stops[1] || 'hsl(60, 70%, 45%)';

  const sourceColor = viaSource === 'manager' ? '#6366F1' : 'var(--cf-orange)';
  const sourceLabel = loading ? 'Verifying access…'
    : viaSource === 'manager' ? 'Direct report'
    : viaSource === 'group' ? 'Group access'
    : '—';

  return (
    <div style={{
      position: 'relative',
      padding: '24px 26px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.20)',
    }}>
      {/* Personalized backdrop: dual radial-gradients seeded by the user's
          email. Strong enough to feel like a banner, subtle enough that
          text stays legible. */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 60% 80% at 8% 0%, ${accent1} 0%, transparent 55%),
          radial-gradient(ellipse 55% 75% at 100% 100%, ${accent2} 0%, transparent 60%)
        `,
        opacity: 0.18,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Avatar id={member.id} name={member.name} email={member.email} photo_url={member.photo_url} size={72} />
          {/* Source mini-icon overlapping the avatar — quick visual signal
              of why this person is in your team without reading the pill. */}
          <div
            title={sourceLabel}
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--bg-secondary)',
              border: `2px solid ${sourceColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: sourceColor,
              opacity: loading ? 0.4 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            {viaSource === 'manager' ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 20 18 20" />
                <polyline points="14 4 20 4 20 10" />
                <line x1="20" y1="4" x2="6" y2="18" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            )}
          </div>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div style={{
            fontSize: 24, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.15,
          }}>
            {tidyName(member.name) || member.email}
          </div>
          <div style={{
            fontSize: 13, color: 'var(--text-secondary)', marginTop: 4,
            fontWeight: 500,
          }}>
            {member.title}{member.department ? ` · ${member.department}` : ''}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10,
            display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <a
              href={`mailto:${member.email}`}
              style={{
                color: 'inherit', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {member.email}
            </a>
            {member.location && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {member.location}
              </span>
            )}
            {member.region && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
                {member.region}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700,
            padding: '5px 12px', borderRadius: 9999,
            background: viaSource === 'manager' ? 'rgba(99,102,241,0.14)' : 'rgba(246,130,31,0.14)',
            color: sourceColor,
            border: `1px solid ${viaSource === 'manager' ? 'rgba(99,102,241,0.30)' : 'rgba(246,130,31,0.30)'}`,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 0.2s ease',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sourceColor }} />
            {sourceLabel}
          </span>
          {member.groups.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', maxWidth: 240 }}>
              {member.groups.slice(0, 3).map(g => (
                <span key={g} style={{
                  fontSize: 10, fontWeight: 600,
                  padding: '3px 9px', borderRadius: 9999,
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  whiteSpace: 'nowrap',
                }}>{g}</span>
              ))}
              {member.groups.length > 3 && (
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  +{member.groups.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SnapshotBody({ data }: { data: any }) {
  const skills = data.skills?.assessments || [];
  const courses = data.curriculum?.courses || [];
  const completed = data.curriculum?.completed || 0;
  const assigned = data.curriculum?.assigned || 0;
  const skillsAssessed = data.skills?.assessed || 0;
  const pages = data.activity?.pages_30d || [];
  const totalPageViews30d = pages.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
  const aiHubRecent = data.ai_hub?.recent || [];
  const lastSeen = data.activity?.last_seen;

  return (
    <>
      {/* Top stat strip — circles for fractions, tiles for scalars */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10,
        marginBottom: 12,
      }}>
        <CircleStat
          label="Curriculum"
          value={completed}
          total={assigned}
          accent={assigned > 0 && completed === assigned ? '#10B981' : '#F59E0B'}
          hint={assigned === 0 ? 'No courses assigned' : `${completed} of ${assigned} done`}
        />
        <CircleStat
          label="Skills assessed"
          value={skillsAssessed}
          accent="#6366F1"
          hint={skillsAssessed === 0 ? 'No assessments yet' : 'self-rated'}
        />
        <TileStat
          label="Activity (30d)"
          value={totalPageViews30d}
          hint={pages.length > 0 ? `Top: ${pages[0].page_label || pages[0].page_path}` : 'Nothing recent'}
          accent="#F6821F"
        />
        <TileStat
          label="Last seen"
          value={<span style={{ fontFamily: 'inherit', fontSize: 18, fontWeight: 600 }}>{relTime(lastSeen)}</span>}
          hint={lastSeen ? new Date(lastSeen).toLocaleString() : 'Never logged in'}
          accent={lastSeen ? '#10B981' : '#9CA3AF'}
        />
      </div>

      {/* Section grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10,
      }}>
        <SectionCard
          title="Skills"
          count={skills.length > 0 ? `${skills.length} assessed` : null}
          accent="#6366F1"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
          emptyText="No skill assessments yet. Encourage them to self-rate on /skills-matrix."
        >
          {skills.length > 0 && <SkillsList skills={skills} />}
        </SectionCard>

        <SectionCard
          title="Curriculum"
          count={assigned > 0 ? `${completed}/${assigned}` : null}
          accent="#F59E0B"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>}
          emptyText="No courses assigned yet."
        >
          {courses.length > 0 && <CourseList courses={courses} />}
        </SectionCard>

        <SectionCard
          title="Recent activity"
          count="last 30 days"
          accent="#F6821F"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
          emptyText="No portal activity in the last 30 days."
        >
          {pages.length > 0 && <ActivityList pages={pages} totalViews={totalPageViews30d} />}
        </SectionCard>

        <SectionCard
          title="AI Hub contributions"
          count={aiHubRecent.length > 0 ? `${data.ai_hub.contributions} total` : null}
          accent="#EC4899"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L17.5 9 12 19 6.5 9 12 5.5z" /></svg>}
          emptyText="Hasn't contributed any AI Hub solutions yet."
        >
          {aiHubRecent.length > 0 && <AiHubList items={aiHubRecent} />}
        </SectionCard>
      </div>
    </>
  );
}

// Levels per workers/api/schema.sql (skill_assessments.level):
//   1 = No Exposure, 2 = Awareness, 3 = Working Knowledge,
//   4 = Deep Expertise, 5 = Subject Matter Expert
const LEVEL_LABELS: Record<number, string> = {
  1: 'No exposure',
  2: 'Awareness',
  3: 'Working',
  4: 'Deep',
  5: 'Expert',
};
const LEVEL_COLORS: Record<number, string> = {
  1: '#6B7280',
  2: '#9CA3AF',
  3: '#6366F1',
  4: '#8B5CF6',
  5: '#EC4899',
};

function SkillsList({ skills }: { skills: any[] }) {
  // 1) Distribution across the 5 levels — drives the top-line summary bar.
  const distribution = [0, 0, 0, 0, 0]; // index = level - 1
  for (const s of skills) {
    const lvl = Number(s.level);
    if (lvl >= 1 && lvl <= 5) distribution[lvl - 1] += 1;
  }
  const total = skills.length;
  const expertCount = distribution[3] + distribution[4]; // Deep + Expert
  const workingCount = distribution[2];

  // 2) Group by category for the body. Skills without a category fall into
  //    a synthetic "Uncategorized" bucket so they're never lost.
  const groups = new Map<string, { name: string; icon: string | null; items: any[] }>();
  for (const s of skills) {
    const key = s.category_id || '__none__';
    if (!groups.has(key)) {
      groups.set(key, {
        name: s.category_name || 'Uncategorized',
        icon: s.category_icon || null,
        items: [],
      });
    }
    groups.get(key)!.items.push(s);
  }
  // Sort each group by level desc so the strongest skills appear first.
  for (const g of groups.values()) {
    g.items.sort((a, b) => (b.level || 0) - (a.level || 0));
  }
  // Sort groups by their average level (highest avg → first).
  const orderedGroups = Array.from(groups.entries()).sort(([, a], [, b]) => {
    const aAvg = a.items.reduce((s, i) => s + (i.level || 0), 0) / a.items.length;
    const bAvg = b.items.reduce((s, i) => s + (i.level || 0), 0) / b.items.length;
    return bAvg - aAvg;
  });

  return (
    <div>
      {/* Headline summary + segmented distribution bar */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{expertCount}</strong> deep/expert
          {' · '}
          <strong style={{ color: 'var(--text-primary)' }}>{workingCount}</strong> working
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {orderedGroups.length} {orderedGroups.length === 1 ? 'category' : 'categories'}
        </span>
      </div>
      <div style={{
        display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden',
        background: 'var(--bg-tertiary)', marginBottom: 14,
      }}>
        {distribution.map((count, i) => {
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={i}
              title={`${count} ${LEVEL_LABELS[i + 1]}`}
              style={{ width: `${pct}%`, background: LEVEL_COLORS[i + 1] }}
            />
          );
        })}
      </div>

      {/* Per-category list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {orderedGroups.slice(0, 4).map(([key, g]) => (
          <div key={key}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 6,
            }}>
              <span>
                {g.icon && <span style={{ marginRight: 6 }}>{g.icon}</span>}
                {g.name}
              </span>
              <span style={{ color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
                {g.items.length}
              </span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {g.items.slice(0, 6).map((s: any) => {
                const level = Number(s.level) || 0;
                return (
                  <li key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    fontSize: 12,
                  }}>
                    <span style={{
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1, minWidth: 0,
                    }}>
                      {s.skill_name || s.skill_id || '(unknown skill)'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span title={LEVEL_LABELS[level] || 'Unknown'} style={{ display: 'inline-flex', gap: 3 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <span key={n} style={{
                            width: 8, height: 6, borderRadius: 1,
                            background: n <= level ? LEVEL_COLORS[level] : 'var(--bg-tertiary)',
                          }} />
                        ))}
                      </span>
                      <span style={{ fontSize: 10, color: LEVEL_COLORS[level] || 'var(--text-tertiary)', fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                        {LEVEL_LABELS[level] || '—'}
                      </span>
                    </span>
                  </li>
                );
              })}
              {g.items.length > 6 && (
                <li style={{ fontSize: 11, color: 'var(--text-tertiary)', paddingTop: 2 }}>
                  +{g.items.length - 6} more in {g.name}
                </li>
              )}
            </ul>
          </div>
        ))}
        {orderedGroups.length > 4 && (
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
            +{orderedGroups.length - 4} more {orderedGroups.length - 4 === 1 ? 'category' : 'categories'}
          </p>
        )}
      </div>
    </div>
  );
}

function CourseList({ courses }: { courses: any[] }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {courses.slice(0, 8).map((c: any) => {
        const done = c.status === 'completed' || !!c.completed_at;
        return (
          <li key={c.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            fontSize: 12,
          }}>
            <span style={{
              color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, minWidth: 0,
            }}>
              {c.course_name || c.title || c.course_id}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 9999,
              background: done ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)',
              color: done ? '#10B981' : '#F59E0B',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              {done ? '✓ Done' : (c.status || 'In progress')}
            </span>
          </li>
        );
      })}
      {courses.length > 8 && (
        <li style={{ fontSize: 11, color: 'var(--text-tertiary)', paddingTop: 4 }}>
          +{courses.length - 8} more
        </li>
      )}
    </ul>
  );
}

function ActivityList({ pages, totalViews }: { pages: any[]; totalViews: number }) {
  // Mini bar chart per page — proportion of their 30d views on each tab.
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {pages.map((p: any) => {
        const pct = totalViews > 0 ? Math.round((p.views / totalViews) * 100) : 0;
        return (
          <li key={p.page_path} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
              <span style={{
                color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, minWidth: 0,
              }}>
                {p.page_label || p.page_path}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {p.views} · {relTime(p.last_viewed)}
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--cf-orange)', borderRadius: 2 }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AiHubList({ items }: { items: any[] }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.slice(0, 6).map((c: any) => (
        <li key={c.id} style={{ fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{
              color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
            }}>{c.title}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              background: 'rgba(236,72,153,0.12)', color: '#EC4899',
              letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0,
            }}>{c.type}</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
            ↑ {c.upvotes || 0} · {c.uses || 0} uses · {relTime(c.updated_at)}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────

export default function MyTeam() {
  const { currentUserName, isAdmin } = useAdmin();
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('seportal_user') : null;

  const [members, setMembers] = useState<Member[]>([]);
  const [counts, setCounts] = useState({ total: 0, direct_reports: 0, group_only: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'manager' | 'group'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Member | null>(null);
  // Add-direct-report modal (admin-only). The button is conditionally
  // rendered in the header; the modal handles employee search + assign.
  const [showAddReport, setShowAddReport] = useState(false);

  // Reusable so the AddDirectReport modal can refresh after save.
  const reload = useCallback(() => {
    if (!userEmail) { setLoading(false); return; }
    setLoading(true);
    api.team.myTeam(userEmail)
      .then(d => {
        const list: Member[] = d?.members || [];
        setMembers(list);
        setCounts(d?.counts || { total: 0, direct_reports: 0, group_only: 0 });
        // Keep the selected member if it's still in the list, else first match.
        setSelected(prev => {
          if (prev && list.find(m => m.email === prev.email)) return prev;
          return list[0] || null;
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userEmail]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    let list = members;
    if (filter === 'manager') list = list.filter(m => m.sources.includes('manager'));
    else if (filter === 'group') list = list.filter(m => m.sources.includes('group'));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.title || '').toLowerCase().includes(q)
    );
    return list;
  }, [members, filter, search]);

  // Keep the rail in sync with the snapshot — if the user filters out the
  // currently selected member, jump to the first match (or null).
  useEffect(() => {
    if (selected && !filtered.find(m => m.email === selected.email)) {
      setSelected(filtered[0] || null);
    }
  }, [filtered, selected]);

  if (!userEmail) {
    return (
      <div className="rfx-page" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2 className="rfx-title" style={{ fontSize: 32 }}>Sign in to see your team</h2>
        <p className="rfx-muted">My Team needs to know who you are.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rfx-page">
        <div className="rfx-loading">
          <div className="rfx-spinner" />
          <span>Loading your team…</span>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rfx-page" style={{ paddingBottom: 40 }}>
        <div className="rfx-header animate-in">
          <h2 className="rfx-title">My Team</h2>
          <p className="rfx-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Team-leadership dashboard for managers and group admins.
          </p>
        </div>
        <div className="rfx-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <h3 className="rfx-h">You don't lead anyone (yet)</h3>
          <p className="rfx-muted" style={{ maxWidth: 560, margin: '8px auto 16px' }}>
            This page activates when either someone's <code>manager_id</code> in the
            org chart points at you, or you're listed as an admin on a group.
            {isAdmin && ' As an admin you can assign reports to yourself right now.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowAddReport(true)}
              className="rfx-btn rfx-btn--primary"
              type="button"
            >
              + Add a direct report
            </button>
          )}
        </div>
        {showAddReport && userEmail && (
          <AddDirectReportModal
            requesterEmail={userEmail}
            onClose={() => setShowAddReport(false)}
            onSaved={reload}
          />
        )}
      </div>
    );
  }

  return (
    <div className="rfx-page" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="rfx-header animate-in">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 className="rfx-title">My Team</h2>
            <p className="rfx-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
              {tidyName(currentUserName) || userEmail} · the people you lead, with their skill, curriculum, and activity snapshots.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddReport(true)}
              className="rfx-btn rfx-btn--primary"
              type="button"
              style={{ flexShrink: 0 }}
            >
              + Add direct report
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <HeaderPill color="#10B981" label={`${counts.total} ${counts.total === 1 ? 'person' : 'people'}`} />
          {counts.direct_reports > 0 && (
            <HeaderPill color="#6366F1" label={`${counts.direct_reports} direct ${counts.direct_reports === 1 ? 'report' : 'reports'}`} />
          )}
          {counts.group_only > 0 && (
            <HeaderPill color="#F6821F" label={`${counts.group_only} via group`} />
          )}
        </div>
      </div>

      {showAddReport && userEmail && (
        <AddDirectReportModal
          requesterEmail={userEmail}
          onClose={() => setShowAddReport(false)}
          onSaved={reload}
        />
      )}

      {/* Two-column layout — sticky member rail on the left, scrolling
          snapshot on the right. */}
      <div className="rfx-layout">
        {/* Left rail */}
        <div>
          <div style={{
            position: 'sticky', top: 90,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {/* Search + filter */}
            <div style={{
              padding: '8px 10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ position: 'relative' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                     style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, title…"
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 30px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
                background: 'var(--bg-tertiary)', padding: 3, borderRadius: 8,
              }}>
                {(['all', 'manager', 'group'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      height: 26,
                      padding: '0 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      border: 'none',
                      borderRadius: 6,
                      background: filter === f ? 'var(--bg-primary)' : 'transparent',
                      color: filter === f ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.18)' : 'none',
                    }}
                    type="button"
                  >
                    {f === 'manager' ? 'Reports' : f === 'group' ? 'Groups' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Rail */}
            <div style={{
              padding: 4,
              maxHeight: 'calc(100vh - 280px)',
              overflowY: 'auto',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              {filtered.length === 0 ? (
                <p style={{
                  textAlign: 'center', padding: '2rem 1rem',
                  fontSize: 12, color: 'var(--text-tertiary)',
                }}>
                  No matches.
                </p>
              ) : filtered.map(m => (
                <MemberRow
                  key={m.email}
                  member={m}
                  active={selected?.email === m.email}
                  onSelect={() => setSelected(m)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right pane */}
        <div>
          {selected ? (
            <MemberSnapshot
              key={selected.email}
              member={selected}
              requesterEmail={userEmail}
            />
          ) : (
            <div className="rfx-panel" style={{ textAlign: 'center', padding: '3rem' }}>
              <p className="rfx-muted">Pick a team member to see their snapshot.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderPill({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 9999, fontSize: 12,
      background: `${color}1a`,
      color, border: `1px solid ${color}30`,
      fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}
