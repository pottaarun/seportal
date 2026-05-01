// ──────────────────────────────────────────────────────────────────────────────
// McpAuthBanner — reusable affordance for AI features.
//
// Drop it at the top of any AI feature (AI Coach modal, RFx page, AI email
// generator, curriculum advisor, etc.). When the user IS connected to
// cf-portal MCP, it renders a slim "Powered by cf-portal" status pill so
// users know responses are richer. When they're NOT, it expands to a banner
// with a Connect button + a power-user fallback to paste a JWT from
// `opencode mcp auth cf-portal`.
//
// All grounding is opt-in: AI features always work without MCP, just less
// rich. The banner makes that contract visible.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useMcp } from '../contexts/McpContext';

interface Props {
  /** Short label for what the AI feature is — e.g. "AI Coach", "RFx generator". */
  feature: string;
  /** Where to bring the user back to after OAuth. Defaults to current page. */
  returnTo?: string;
  /** When false, renders nothing (lets parents disable the affordance). */
  enabled?: boolean;
  /** When 'compact', collapses to a single status pill (no banner). */
  variant?: 'banner' | 'compact';
}

function formatExpiry(expiresAt: number | null): string {
  if (!expiresAt) return '';
  const remMs = expiresAt - Date.now();
  if (remMs <= 0) return 'expired';
  const h = Math.floor(remMs / 3_600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  if (h >= 1) return `${h}h`;
  const m = Math.max(1, Math.floor(remMs / 60_000));
  return `${m}m`;
}

export function McpAuthBanner({ feature, returnTo, enabled = true, variant = 'banner' }: Props) {
  const { isAuthed, expiresAt, login, logout, setToken } = useMcp();
  const [showPaste, setShowPaste] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  // Authed → small status pill (or nothing in 'compact' mode)
  if (isAuthed) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 9999, fontSize: 11,
        background: 'rgba(16,185,129,0.1)', color: '#10B981',
        fontWeight: 600, letterSpacing: '0.02em',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
        Powered by cf-portal MCP
        {expiresAt && (
          <>
            <span style={{ opacity: 0.6 }}>·</span>
            <span style={{ opacity: 0.85 }}>{formatExpiry(expiresAt)} left</span>
          </>
        )}
        {variant === 'banner' && (
          <button
            onClick={logout}
            style={{
              marginLeft: 6, padding: 0, background: 'transparent', border: 'none',
              color: '#10B981', opacity: 0.7, cursor: 'pointer', fontSize: 11,
              textDecoration: 'underline',
            }}
            type="button"
          >
            disconnect
          </button>
        )}
      </div>
    );
  }

  // Not authed → banner with Connect button + paste fallback
  if (variant === 'compact') {
    return (
      <button
        onClick={() => login(returnTo)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 9999, fontSize: 11,
          background: 'rgba(246,130,31,0.10)',
          color: 'var(--cf-orange)',
          border: '1px solid rgba(246,130,31,0.25)',
          fontWeight: 600, letterSpacing: '0.02em', cursor: 'pointer',
        }}
        type="button"
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cf-orange)' }} />
        Connect cf-portal MCP
      </button>
    );
  }

  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.18)',
        marginBottom: 16,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'rgba(99,102,241,0.12)',
        color: '#6366F1',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          Connect cf-portal MCP for richer answers
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {feature} can pull live grounding from Backstage techdocs, the
          internal wiki, the software catalog, and Cloudflare docs — under
          your own permissions. Without MCP, answers are still generated
          but with less context.
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => login(returnTo)}
            className="rfx-btn rfx-btn--primary"
            style={{ height: 32, padding: '0 14px', fontSize: 12 }}
            type="button"
          >
            Connect cf-portal
          </button>
          <button
            onClick={() => { setShowPaste(v => !v); setError(null); }}
            className="rfx-btn rfx-btn--subtle"
            style={{ height: 32, padding: '0 12px', fontSize: 12 }}
            type="button"
          >
            {showPaste ? 'Hide' : 'Already authed via OpenCode?'}
          </button>
        </div>

        {showPaste && (
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
              Power-user fallback. On your laptop, run:
              {' '}
              <code style={{
                padding: '2px 8px', background: 'var(--bg-tertiary)',
                borderRadius: 4, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}>opencode mcp auth cf-portal</code>
              {' '}
              then paste the <code style={{
                padding: '2px 6px', background: 'var(--bg-tertiary)',
                borderRadius: 4, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}>accessToken</code> from{' '}
              <code style={{
                padding: '2px 6px', background: 'var(--bg-tertiary)',
                borderRadius: 4, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}>~/.local/share/opencode/mcp-auth.json</code> below.
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <textarea
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setError(null); }}
                placeholder="Paste the JWT (eyJ…)"
                rows={3}
                style={{
                  flex: 1, padding: '8px 10px',
                  fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  minWidth: 0,
                }}
              />
              <button
                onClick={() => {
                  const trimmed = tokenInput.trim();
                  if (!trimmed) { setError('Paste a JWT first'); return; }
                  if (!trimmed.startsWith('eyJ')) {
                    setError('That doesn\'t look like a JWT (should start with "eyJ")');
                    return;
                  }
                  // Try to read exp from the JWT payload — best effort, just for UX
                  let expSec = 86_400;
                  try {
                    const payload = JSON.parse(atob(trimmed.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                    if (payload.exp) {
                      expSec = Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
                    }
                  } catch { /* ignore */ }
                  setToken(trimmed, expSec);
                  setTokenInput('');
                  setShowPaste(false);
                }}
                className="rfx-btn rfx-btn--primary"
                style={{ height: 36, padding: '0 14px', fontSize: 12 }}
                type="button"
              >
                Save token
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626' }}>{error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
