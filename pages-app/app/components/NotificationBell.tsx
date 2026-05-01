// ──────────────────────────────────────────────────────────────────────────────
// NotificationBell — top-nav affordance for the content_changelog feed.
//
// Polls /api/notifications/unread-count every 30s for the badge. Click the
// bell to open a dropdown that fetches /api/notifications/feed and lists
// recent changes. Self-edits are filtered server-side, so users only see
// what other people have changed.
//
// Mark-as-seen behavior follows the user's choice during scoping: items are
// only marked seen when the user clicks through to the actual content.
// "Mark all as read" is also available as an explicit action.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';

interface NotificationBellProps {
  userEmail: string | null;
}

interface Entry {
  id: number;
  content_type: 'asset' | 'script' | 'ai_solution';
  content_id: string;
  content_title: string | null;
  content_subtype: string | null;
  content_path: string;
  change_type: 'created' | 'updated' | 'deleted';
  changed_by_email: string | null;
  changed_by_name: string | null;
  changed_at: string;
  is_unread: number;
}

const TYPE_LABEL: Record<Entry['content_type'], string> = {
  asset: 'Asset',
  script: 'Script',
  ai_solution: 'AI solution',
};

const CHANGE_LABEL: Record<Entry['change_type'], string> = {
  created: 'added',
  updated: 'updated',
  deleted: 'removed',
};

const CHANGE_COLOR: Record<Entry['change_type'], string> = {
  created: '#10B981',
  updated: '#F6821F',
  deleted: '#9CA3AF',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell({ userEmail }: NotificationBellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Poll the unread count whenever we have a user. Reasonably aggressive
  // (30s) since the bell is a fast read.
  useEffect(() => {
    if (!userEmail) { setCount(0); return; }
    let cancelled = false;
    const pull = async () => {
      try {
        const r = await api.notifications.unreadCount(userEmail);
        if (!cancelled) setCount(r?.count || 0);
      } catch { /* ignore — bell stays at last known count */ }
    };
    pull();
    const t = setInterval(pull, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [userEmail]);

  // Lazy-load the feed when the dropdown opens
  useEffect(() => {
    if (!open || !userEmail) return;
    let cancelled = false;
    setLoading(true);
    api.notifications.feed(userEmail, { limit: 30, days: 14 })
      .then(rows => { if (!cancelled) setEntries(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, userEmail]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const goToEntry = async (e: Entry) => {
    setOpen(false);
    if (userEmail) {
      // Mark this item seen synchronously. The endpoint is fast; we don't
      // wait so navigation doesn't block.
      api.notifications.markSeen({
        user_email: userEmail,
        content_type: e.content_type,
        content_id: e.content_id,
      }).catch(() => { /* ignore */ });
      // Optimistic UI: drop the count immediately
      setCount(c => Math.max(0, c - (e.is_unread ? 1 : 0)));
    }
    navigate(e.content_path);
  };

  const markAll = async () => {
    if (!userEmail) return;
    try {
      await api.notifications.markAllSeen(userEmail);
      setCount(0);
      setEntries(prev => prev.map(e => ({ ...e, is_unread: 0 })));
    } catch { /* ignore */ }
  };

  if (!userEmail) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
        title={count > 0 ? `${count} unread` : 'Notifications'}
        style={{
          position: 'relative',
          width: 36, height: 36,
          padding: 0,
          background: open ? 'var(--bg-tertiary)' : 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)',
          transition: 'background 0.15s ease, color 0.15s ease',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
        type="button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 9999,
            background: '#EF4444',
            color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 0 0 2px var(--bg-primary)',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Recent updates"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 380,
            maxHeight: 480,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            zIndex: 200,
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              What's new
              {count > 0 && (
                <span style={{
                  marginLeft: 8,
                  padding: '1px 7px',
                  fontSize: 10, fontWeight: 700,
                  background: '#EF4444', color: '#fff',
                  borderRadius: 9999,
                }}>{count}</span>
              )}
            </div>
            {entries.some(e => e.is_unread) && (
              <button
                onClick={markAll}
                style={{
                  fontSize: 11, color: 'var(--cf-orange)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 0,
                }}
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
                Loading…
              </div>
            )}
            {!loading && entries.length === 0 && (
              <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
                No recent updates.
              </div>
            )}
            {!loading && entries.map(e => (
              <button
                key={e.id}
                onClick={() => goToEntry(e)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 14px',
                  background: e.is_unread ? 'rgba(246,130,31,0.05)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'inherit',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(ev) => {
                  ev.currentTarget.style.background = e.is_unread
                    ? 'rgba(246,130,31,0.10)'
                    : 'var(--bg-tertiary)';
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.background = e.is_unread
                    ? 'rgba(246,130,31,0.05)'
                    : 'transparent';
                }}
                type="button"
              >
                {/* Unread dot */}
                <span style={{
                  marginTop: 6, width: 8, height: 8, borderRadius: '50%',
                  background: e.is_unread ? '#EF4444' : 'transparent',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: 'var(--bg-tertiary)',
                      color: CHANGE_COLOR[e.change_type],
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      marginRight: 6,
                    }}>
                      {CHANGE_LABEL[e.change_type]}
                    </span>
                    <strong style={{ fontWeight: 600 }}>{e.content_title || '(untitled)'}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    {TYPE_LABEL[e.content_type]}
                    {e.content_subtype && <> · <span style={{ textTransform: 'capitalize' }}>{e.content_subtype}</span></>}
                    {' · '}
                    {e.changed_by_name || e.changed_by_email || 'someone'}
                    {' · '}
                    {relativeTime(e.changed_at)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
