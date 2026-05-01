// ──────────────────────────────────────────────────────────────────────────────
// /my-team — group-admin + manager dashboard
//
// Shows everyone the current user has team-leadership access to. Two ways to
// gain access (computed server-side in /api/team/my-team):
//   1. Direct report: employees.manager_id matches the user's employee id
//   2. Group admin:   user's email is in groups.admins, member's email in members
// The same user can be reached via both paths — the UI shows the union with
// per-source provenance ("via Manager" / "via AMER SE team" / both).
//
// Click a member to open a drill panel with full skills + curriculum +
// recent activity (loaded lazily from /api/team/member/:email/snapshot).
// The endpoint re-runs the auth check, so the panel can never show data
// for someone the user shouldn't see.
//
// The page is conditionally surfaced in the top nav: root.tsx fetches the
// /my-team summary and only renders the nav item when counts.total > 0.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { api } from '../lib/api';
import './rfx.css';

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

function photoOrInitials(emp: Member): { src?: string; initials: string } {
  const initials = (emp.name || emp.email)
    .split(/[ .@_-]+/).filter(Boolean).slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '').join('');
  if (!emp.photo_url) return { initials };
  return { src: `${PHOTO_BASE}/api/employees/${emp.id}/photo`, initials };
}

function relTime(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ──────────────────────────────────────────────────────────────────────────────
// MemberCard — left-rail row for one team member
// ──────────────────────────────────────────────────────────────────────────────

function MemberCard({ member, active, onSelect }: {
  member: Member;
  active: boolean;
  onSelect: () => void;
}) {
  const photo = photoOrInitials(member);
  const sources = new Set(member.sources);
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px',
        background: active ? 'rgba(246,130,31,0.10)' : 'var(--bg-secondary)',
        border: `1px solid ${active ? 'rgba(246,130,31,0.35)' : 'var(--border-color)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
      type="button"
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: photo.src ? 'transparent' : 'linear-gradient(135deg, var(--cf-orange), var(--cf-blue, #4F8BF5))',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
        flexShrink: 0, overflow: 'hidden',
      }}>
        {photo.src ? (
          <img
            src={photo.src} alt={member.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.textContent = photo.initials;
            }}
          />
        ) : photo.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {member.name}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {member.title}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {sources.has('manager') && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              padding: '1px 6px', borderRadius: 3,
              background: 'rgba(99,102,241,0.12)', color: '#6366F1',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>Direct report</span>
          )}
          {sources.has('group') && member.groups.slice(0, 2).map(g => (
            <span key={g} style={{
              fontSize: 9, fontWeight: 700,
              padding: '1px 6px', borderRadius: 3,
              background: 'rgba(246,130,31,0.12)', color: 'var(--cf-orange)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>{g}</span>
          ))}
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Snapshot panel
// ──────────────────────────────────────────────────────────────────────────────

function MemberSnapshot({ targetEmail, requesterEmail }: {
  targetEmail: string;
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
    api.team.memberSnapshot(targetEmail, requesterEmail)
      .then(d => {
        if (cancelled) return;
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch((e: any) => { if (!cancelled) setError(e?.message || 'Failed to load snapshot'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [targetEmail, requesterEmail]);

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <div className="rfx-spinner" style={{ margin: '0 auto 12px', width: 22, height: 22 }} />
        Loading snapshot…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rfx-alert rfx-alert--error" style={{ marginTop: 0 }}>
        {error}
      </div>
    );
  }
  if (!data?.profile) return null;

  const p = data.profile;
  const skills = data.skills?.assessments || [];
  const courses = data.curriculum?.courses || [];
  const completed = data.curriculum?.completed || 0;
  const assigned = data.curriculum?.assigned || 0;
  const pages = data.activity?.pages_30d || [];
  const aiHub = data.ai_hub?.recent || [];
  const photo = photoOrInitials({
    id: p.id, name: p.name, email: p.email, title: p.title,
    department: p.department, photo_url: p.photo_url, location: p.location,
    region: p.region, manager_id: p.manager_id, sources: [], groups: [],
  });

  return (
    <div>
      {/* Profile header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 18px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        marginBottom: 12,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: photo.src ? 'transparent' : 'linear-gradient(135deg, var(--cf-orange), var(--cf-blue, #4F8BF5))',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700,
          overflow: 'hidden', flexShrink: 0,
        }}>
          {photo.src ? (
            <img src={photo.src} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = photo.initials; }} />
          ) : photo.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>{p.email}</span>
            {p.location && <span>📍 {p.location}</span>}
            {p.region && <span>{p.region}</span>}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 9999,
          background: 'rgba(16,185,129,0.12)', color: '#10B981',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          via {data.access?.via}
        </span>
      </div>

      {/* Stat tiles */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10,
        marginBottom: 16,
      }}>
        <StatTile label="Skills assessed" value={data.skills?.assessed || 0} accent="#6366F1" />
        <StatTile
          label="Courses complete"
          value={`${completed}/${assigned}`}
          accent={assigned > 0 && completed === assigned ? '#10B981' : '#F59E0B'}
        />
        <StatTile label="Pages (30d)" value={pages.reduce((sum: number, p: any) => sum + (p.views || 0), 0)} accent="#F6821F" />
        <StatTile label="Last seen" value={relTime(data.activity?.last_seen)} accent={data.activity?.last_seen ? '#10B981' : '#9CA3AF'} small />
        <StatTile label="AI contributions" value={data.ai_hub?.contributions || 0} accent="#EC4899" />
      </div>

      {/* Two-column body: skills + curriculum on one side, activity on the other */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12,
      }}>
        <SectionCard title={`Skills (${skills.length})`}>
          {skills.length === 0 ? (
            <p className="rfx-fine" style={{ margin: 0 }}>No assessments recorded yet.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {skills.slice(0, 8).map((s: any) => (
                <li key={s.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 12,
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <span style={{ color: 'var(--text-primary)' }}>{s.skill_name || s.skill_id}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.level || s.score || '—'}</span>
                </li>
              ))}
              {skills.length > 8 && (
                <li className="rfx-fine" style={{ padding: '6px 0' }}>+{skills.length - 8} more</li>
              )}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={`Curriculum (${completed}/${assigned})`}>
          {courses.length === 0 ? (
            <p className="rfx-fine" style={{ margin: 0 }}>No courses assigned.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {courses.slice(0, 8).map((c: any) => {
                const done = c.status === 'completed' || !!c.completed_at;
                return (
                  <li key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 12,
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <span style={{ color: 'var(--text-primary)' }}>{c.course_name || c.title || c.course_id}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 9999,
                      background: done ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                      color: done ? '#10B981' : '#F59E0B',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>{done ? 'Done' : (c.status || 'In progress')}</span>
                  </li>
                );
              })}
              {courses.length > 8 && (
                <li className="rfx-fine" style={{ padding: '6px 0' }}>+{courses.length - 8} more</li>
              )}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={`Recent activity (last 30 days)`}>
          {pages.length === 0 ? (
            <p className="rfx-fine" style={{ margin: 0 }}>No portal activity in the last 30 days.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pages.map((p: any) => (
                <li key={p.page_path} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 12,
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.page_label || p.page_path}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {p.views} views · {relTime(p.last_viewed)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={`AI Hub contributions (${data.ai_hub?.contributions || 0})`}>
          {aiHub.length === 0 ? (
            <p className="rfx-fine" style={{ margin: 0 }}>No solutions contributed.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {aiHub.slice(0, 5).map((c: any) => (
                <li key={c.id} style={{
                  fontSize: 12, padding: '6px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.title}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.type}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {c.upvotes || 0} upvotes · {c.uses || 0} uses · updated {relTime(c.updated_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent, small }: { label: string; value: any; accent: string; small?: boolean }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 10,
      borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{
        fontFamily: small ? undefined : "'DM Serif Display', serif",
        fontSize: small ? 14 : 24,
        fontWeight: small ? 600 : 400,
        color: 'var(--text-primary)',
        marginTop: 2,
        letterSpacing: small ? undefined : '-0.01em',
      }}>
        {value}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 12,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 8,
      }}>{title}</div>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────

export default function MyTeam() {
  const { currentUserName } = useAdmin();
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('seportal_user') : null;

  const [members, setMembers] = useState<Member[]>([]);
  const [counts, setCounts] = useState({ total: 0, direct_reports: 0, group_only: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'manager' | 'group'>('all');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    let cancelled = false;
    api.team.myTeam(userEmail)
      .then(d => {
        if (cancelled) return;
        const list = d?.members || [];
        setMembers(list);
        setCounts(d?.counts || { total: 0, direct_reports: 0, group_only: 0 });
        if (list.length > 0) setSelectedEmail(list[0].email);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userEmail]);

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
          <p className="rfx-muted" style={{ maxWidth: 520, margin: '8px auto' }}>
            This page activates when either: (a) someone's <code>manager_id</code> in
            the org chart points at you, or (b) you're listed as an admin on a group.
            Ask an admin to update the org chart or add you to a group.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rfx-page" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="rfx-header animate-in">
        <h2 className="rfx-title">My Team</h2>
        <p className="rfx-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
          {currentUserName || userEmail} · the people you lead, with their skill, curriculum, and activity snapshots.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 9999, fontSize: 12,
            background: 'rgba(16,185,129,0.10)', color: '#10B981', fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            {counts.total} {counts.total === 1 ? 'person' : 'people'}
          </span>
          {counts.direct_reports > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 9999, fontSize: 12,
              background: 'rgba(99,102,241,0.10)', color: '#6366F1', fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1' }} />
              {counts.direct_reports} direct {counts.direct_reports === 1 ? 'report' : 'reports'}
            </span>
          )}
          {counts.group_only > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 9999, fontSize: 12,
              background: 'rgba(246,130,31,0.10)', color: '#F6821F', fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F6821F' }} />
              {counts.group_only} group-admin {counts.group_only === 1 ? 'access' : 'accesses'}
            </span>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="rfx-layout">
        {/* Left: filtered list */}
        <div>
          {/* Filter / search controls */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, title…"
              style={{
                flex: '1 1 200px', minWidth: 0,
                padding: '6px 10px',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'manager', 'group'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rfx-btn rfx-btn--seg ${filter === f ? 'rfx-btn--seg-active' : ''}`}
                  type="button"
                  style={{ height: 30, padding: '0 10px', fontSize: 11, textTransform: 'capitalize' }}
                >
                  {f === 'manager' ? 'Reports' : f === 'group' ? 'Groups' : 'All'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 ? (
              <p className="rfx-fine" style={{ textAlign: 'center', padding: '2rem' }}>
                No matches.
              </p>
            ) : filtered.map(m => (
              <MemberCard
                key={m.email}
                member={m}
                active={selectedEmail === m.email}
                onSelect={() => setSelectedEmail(m.email)}
              />
            ))}
          </div>
        </div>

        {/* Right: snapshot for selected member */}
        <div>
          {selectedEmail ? (
            <MemberSnapshot
              key={selectedEmail}
              targetEmail={selectedEmail}
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
