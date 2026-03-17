import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { getRelativeTime } from "../lib/timeUtils";

export function meta() {
  return [
    { title: "Shoutouts - SolutionHub" },
    { name: "description", content: "Team recognition and celebrations" },
  ];
}

const categoryConfig: Record<string, { color: string; bg: string; badgeClass: string; icon: string }> = {
  achievement: { color: 'var(--cf-orange)', bg: 'rgba(246,130,31,0.08)', badgeClass: 'badge-orange', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  helpful: { color: 'var(--color-success)', bg: 'var(--color-success-light)', badgeClass: 'badge-green', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  teamwork: { color: 'var(--cf-blue)', bg: 'rgba(0,81,195,0.08)', badgeClass: 'badge-blue', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  mentorship: { color: 'var(--color-purple)', bg: 'var(--color-purple-light)', badgeClass: 'badge-purple', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  innovation: { color: 'var(--color-warning)', bg: 'var(--color-warning-light)', badgeClass: 'badge-yellow', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  dedication: { color: 'var(--color-danger)', bg: 'var(--color-danger-light)', badgeClass: 'badge-red', icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
};

export default function Shoutouts() {
  const { isAdmin } = useAdmin();
  const [showModal, setShowModal] = useState(false);
  const [newShoutout, setNewShoutout] = useState({ to: "", message: "", category: "achievement" });
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [likedShoutouts, setLikedShoutouts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadShoutouts = async () => {
      try {
        const userEmail = localStorage.getItem('seportal_user') || 'anonymous';
        const data = await api.shoutouts.getAll();
        const formatted = data.map((s: any) => ({ ...s, from: s.from_user, to: s.to_user }));
        setShoutouts(formatted);
        const likedIds = await api.shoutouts.getUserLikes(userEmail);
        setLikedShoutouts(new Set(likedIds));
      } catch (e) {
        console.error('Error loading shoutouts:', e);
      }
    };
    loadShoutouts();
  }, []);

  const handleLike = async (shoutoutId: string) => {
    const userEmail = localStorage.getItem('seportal_user') || 'anonymous';
    try {
      await api.shoutouts.like(shoutoutId, userEmail);
      const data = await api.shoutouts.getAll();
      setShoutouts(data.map((s: any) => ({ ...s, from: s.from_user, to: s.to_user })));
      const likedIds = await api.shoutouts.getUserLikes(userEmail);
      setLikedShoutouts(new Set(likedIds));
    } catch (error) {
      console.error('Failed to like shoutout:', error);
    }
  };

  const deleteShoutout = async (shoutoutId: string) => {
    if (window.confirm('Are you sure you want to delete this shoutout?')) {
      try {
        await api.shoutouts.delete(shoutoutId);
        setShoutouts(prev => prev.filter(s => s.id !== shoutoutId));
      } catch (e) {
        console.error('Error deleting shoutout:', e);
        alert('Failed to delete shoutout');
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Team Shoutouts</h2>
          <p className="page-subtitle">Recognize and celebrate your teammates' awesome work</p>
        </div>
        <button onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
          Give Shoutout
        </button>
      </div>

      <div className="content-grid">
        {shoutouts.map((shoutout, index) => {
          const config = categoryConfig[shoutout.category] || categoryConfig.achievement;
          return (
            <div key={shoutout.id} className="card animate-in" style={{
              animationDelay: `${index * 0.05}s`,
              borderLeft: `3px solid ${config.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '14px', marginBottom: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                  background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={config.icon} />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{shoutout.from}</strong>
                      {' '}&rarr;{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{shoutout.to}</strong>
                    </span>
                    <span className={`badge ${config.badgeClass}`} style={{ textTransform: 'capitalize', fontSize: '11px' }}>
                      {shoutout.category}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{
                margin: '0 0 16px 0', fontSize: '14px', lineHeight: 1.6,
                color: 'var(--text-primary)', fontStyle: 'italic', maxWidth: 'none',
                paddingLeft: '14px', borderLeft: '2px solid var(--border-color)',
              }}>
                "{shoutout.message}"
              </p>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '12px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '8px',
              }}>
                <button
                  onClick={() => handleLike(shoutout.id)}
                  className={likedShoutouts.has(shoutout.id) ? 'heart-btn liked' : 'heart-btn'}
                >
                  <span className="heart-icon">{likedShoutouts.has(shoutout.id) ? '\u2764' : '\u2661'}</span>
                  {shoutout.likes}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {shoutout.createdAt ? getRelativeTime(shoutout.createdAt) : shoutout.date}
                  </span>
                  {isAdmin && (
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteShoutout(shoutout.id); }}
                      type="button" className="btn-danger btn-sm">Delete</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {shoutouts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <p className="empty-state-text">No shoutouts yet</p>
          <p className="empty-state-sub">Be the first to recognize a teammate!</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Give a Shoutout</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&#215;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const currentUser = localStorage.getItem('seportal_user_name') || 'Anonymous';
              const categoryIcons: Record<string, string> = {
                achievement: '\u{1F3C6}', helpful: '\u{1F4AA}', teamwork: '\u{1F91D}',
                mentorship: '\u{1F468}\u200D\u{1F3EB}', innovation: '\u{1F4A1}', dedication: '\u{1F525}'
              };
              const newShout = {
                id: Date.now().toString(), from: currentUser, to: newShoutout.to,
                message: newShoutout.message, category: newShoutout.category,
                likes: 0, date: 'Just now', createdAt: new Date().toISOString(),
                icon: categoryIcons[newShoutout.category] || '\u{1F389}'
              };
              try {
                await api.shoutouts.create(newShout);
                setShoutouts(prev => [newShout, ...prev]);
                setShowModal(false);
                setNewShoutout({ to: "", message: "", category: "achievement" });
              } catch (error) {
                console.error('Error posting shoutout:', error);
                alert('Failed to post shoutout');
              }
            }}>
              <div className="form-group">
                <label htmlFor="to">Who deserves recognition?</label>
                <input id="to" type="text" className="form-input" value={newShoutout.to}
                  onChange={(e) => setNewShoutout({ ...newShoutout, to: e.target.value })}
                  placeholder="Team member name" required />
              </div>
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select id="category" className="form-select" value={newShoutout.category}
                  onChange={(e) => setNewShoutout({ ...newShoutout, category: e.target.value })}>
                  <option value="achievement">Achievement</option>
                  <option value="helpful">Helpful</option>
                  <option value="teamwork">Teamwork</option>
                  <option value="mentorship">Mentorship</option>
                  <option value="innovation">Innovation</option>
                  <option value="dedication">Dedication</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="message">Your message</label>
                <textarea id="message" className="form-input" value={newShoutout.message}
                  onChange={(e) => setNewShoutout({ ...newShoutout, message: e.target.value })}
                  placeholder="Share why they're awesome..." rows={4} required style={{ resize: 'vertical' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit">Send Shoutout</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-footer">SolutionHub by Cloudflare SE Team</div>
    </div>
  );
}
