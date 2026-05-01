// ──────────────────────────────────────────────────────────────────────────────
// McpAuthBanner — reusable affordance for AI features.
//
// Drop it at the top of any AI feature (AI Coach modal, RFx page, AI email
// generator, etc.). The banner has two faces:
//
//   • CONNECTED (authed + token still valid): a status panel showing the
//     server URL, expiry countdown, refresh-token state, tool count, and a
//     disconnect button. The "compact" variant collapses to a small pill.
//
//   • DISCONNECTED: a banner with two paths to connect:
//       (a) Browser OAuth — currently blocked by cf-portal's redirect-URI
//           allowlist for our origin, so we keep the button but emphasize
//           the JWT-paste fallback below.
//       (b) Paste opaque token OR paste the full `cf-portal.tokens` JSON
//           blob from ~/.local/share/opencode/mcp-auth.json (preferred —
//           includes refresh token so silent renewal works).
//
// All grounding is opt-in: AI features always work without MCP, just less
// rich. The banner makes that contract visible.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useMcp } from '../contexts/McpContext';
import { listMcpTools } from '../lib/mcp';

// Inline click-to-copy code block — saves a few seconds of "select that
// long path correctly" friction.
function CopyableCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <code
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch { /* ignore — fall back to manual select */ }
      }}
      title={copied ? 'Copied!' : 'Click to copy'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '1px 8px',
        background: copied ? 'rgba(16,185,129,0.12)' : 'var(--bg-tertiary)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.35)' : 'var(--border-color)'}`,
        borderRadius: 4,
        fontSize: 11,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: copied ? '#10B981' : 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
        userSelect: 'all',
      }}
    >
      {text}
      <span aria-hidden style={{ opacity: 0.6, fontSize: 9 }}>{copied ? '✓' : '⎘'}</span>
    </code>
  );
}

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
  const { isAuthed, expiresAt, hasRefreshToken, serverUrl, login, logout, setToken, setTokensFromBlob } = useMcp();
  const [showPaste, setShowPaste] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toolCount, setToolCount] = useState<number | null>(null);
  const [toolListLoading, setToolListLoading] = useState(false);
  const [toolListErr, setToolListErr] = useState<string | null>(null);

  // When connected, fetch the tool count once for the status panel. We don't
  // hold the result anywhere global so each banner instance asks once — but
  // it's a single network round trip and lib/mcp.ts caches the initialize
  // call, so re-mounts are cheap.
  useEffect(() => {
    if (!isAuthed || variant !== 'banner') return;
    let cancelled = false;
    setToolListLoading(true);
    setToolListErr(null);
    listMcpTools()
      .then(tools => { if (!cancelled) setToolCount(tools.length); })
      .catch((e: any) => {
        if (cancelled) return;
        setToolListErr(e?.message?.slice(0, 80) ?? 'failed');
      })
      .finally(() => { if (!cancelled) setToolListLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthed, variant]);

  if (!enabled) return null;

  // Authed + compact → small green pill
  if (isAuthed && variant === 'compact') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 9999, fontSize: 11,
        background: 'rgba(16,185,129,0.1)', color: '#10B981',
        fontWeight: 600, letterSpacing: '0.02em',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
        cf-portal MCP
        {expiresAt && (
          <>
            <span style={{ opacity: 0.6 }}>·</span>
            <span style={{ opacity: 0.85 }}>{formatExpiry(expiresAt)} left</span>
          </>
        )}
      </div>
    );
  }

  // Authed + banner → full status panel: green outlined card with details.
  if (isAuthed) {
    const remMs = expiresAt ? expiresAt - Date.now() : 0;
    const isExpiringSoon = remMs > 0 && remMs < 5 * 60_000; // < 5 min
    return (
      <div
        role="status"
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.25)',
          marginBottom: 16,
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(16,185,129,0.15)',
          color: '#10B981',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Connected to cf-portal MCP
            </span>
            <span style={{
              fontSize: 11, color: '#10B981', fontWeight: 600,
              padding: '2px 8px', borderRadius: 9999,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.25)',
            }}>
              {feature} is grounded
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '8px 18px',
            marginTop: 8,
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}>
            <StatusRow label="Server" value={
              <a
                href={serverUrl}
                target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                title={serverUrl}
              >
                {serverUrl.replace(/^https?:\/\//, '').replace(/\/mcp$/, '')}
              </a>
            } />
            <StatusRow
              label="Token"
              value={
                <span style={{ color: isExpiringSoon ? '#F59E0B' : 'var(--text-primary)' }}>
                  {expiresAt ? `${formatExpiry(expiresAt)} left` : 'no expiry'}
                  {hasRefreshToken
                    ? <span style={{ opacity: 0.7, marginLeft: 6 }}>· auto-renewing</span>
                    : <span style={{ color: '#F59E0B', marginLeft: 6 }}>· no refresh token</span>}
                </span>
              }
            />
            <StatusRow
              label="Tools"
              value={
                toolListLoading ? '…' :
                toolListErr ? <span style={{ color: '#dc2626' }} title={toolListErr}>error</span> :
                toolCount != null ? <span style={{ color: 'var(--text-primary)' }}>{toolCount} available</span> :
                '?'
              }
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            {!hasRefreshToken && (
              <button
                onClick={() => setShowPaste(v => !v)}
                className="rfx-btn rfx-btn--subtle"
                style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                type="button"
              >
                {showPaste ? 'Hide paste' : 'Add refresh token'}
              </button>
            )}
            <button
              onClick={logout}
              className="rfx-btn rfx-btn--subtle"
              style={{ height: 28, padding: '0 10px', fontSize: 11 }}
              type="button"
            >
              Disconnect
            </button>
          </div>

          {showPaste && !hasRefreshToken && (
            <PasteForm
              tokenInput={tokenInput}
              setTokenInput={setTokenInput}
              error={error}
              setError={setError}
              setToken={setToken}
              setTokensFromBlob={setTokensFromBlob}
              hideAfterSave={() => setShowPaste(false)}
              compactCopy
            />
          )}
        </div>
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
          <PasteForm
            tokenInput={tokenInput}
            setTokenInput={setTokenInput}
            error={error}
            setError={setError}
            setToken={setToken}
            setTokensFromBlob={setTokensFromBlob}
            hideAfterSave={() => setShowPaste(false)}
          />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Status row — single label/value line in the connected status panel
// ──────────────────────────────────────────────────────────────────────────────

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        flexShrink: 0,
      }}>{label}</span>
      <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {value}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PasteForm — the inline "paste an opaque access token OR the full tokens
// JSON blob" widget. Detects which format you pasted and routes to the
// right setter so refresh tokens are preserved when present.
// ──────────────────────────────────────────────────────────────────────────────

interface PasteFormProps {
  tokenInput: string;
  setTokenInput: (v: string) => void;
  error: string | null;
  setError: (v: string | null) => void;
  setToken: (token: string, expiresInSec?: number) => void;
  setTokensFromBlob: (raw: string) => boolean;
  hideAfterSave: () => void;
  compactCopy?: boolean;
}

function PasteForm({
  tokenInput, setTokenInput, error, setError,
  setToken, setTokensFromBlob, hideAfterSave, compactCopy = false,
}: PasteFormProps) {
  return (
    <div style={{ marginTop: 10 }}>
      {!compactCopy && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
          Power-user fallback. On your laptop:
        </p>
      )}
      <ol style={{ margin: '0 0 12px 18px', padding: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <li style={{ marginBottom: 6 }}>
          Run <CopyableCode text="opencode mcp auth cf-portal" />
          {' '}— browser opens, click <strong>Done</strong>
        </li>
        <li style={{ marginBottom: 6 }}>
          For silent renewal, copy the <strong>full tokens object</strong>:{' '}
          <CopyableCode text={`jq -c '."cf-portal".tokens' ~/.local/share/opencode/mcp-auth.json | pbcopy`} />
          {' '}<span style={{ opacity: 0.7 }}>(includes refresh token)</span>
          <br />
          Or just the access token:{' '}
          <CopyableCode text={`jq -r '."cf-portal".tokens.accessToken' ~/.local/share/opencode/mcp-auth.json | pbcopy`} />
          {' '}<span style={{ opacity: 0.7 }}>(re-paste every hour)</span>
        </li>
        <li>
          Click <strong>Paste</strong> below (reads clipboard) → <strong>Save</strong>
        </li>
      </ol>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea
          value={tokenInput}
          onChange={(e) => { setTokenInput(e.target.value); setError(null); }}
          placeholder='Paste an opaque access token, OR the JSON tokens object: {"accessToken":"…","refreshToken":"…"}'
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => {
              const trimmed = tokenInput.trim();
              if (!trimmed) { setError('Paste a token first'); return; }
              // First try the JSON-blob path (preferred — preserves refresh token).
              if (trimmed.startsWith('{')) {
                if (setTokensFromBlob(trimmed)) {
                  setTokenInput('');
                  setError(null);
                  hideAfterSave();
                  return;
                }
                setError('Pasted JSON but couldn\'t find accessToken — check the shape');
                return;
              }
              // Fall back to plain access-token string. cf-portal tokens are
              // opaque (~38 chars, no dots). If the user happened to paste a
              // JWT, parse exp; otherwise default to 1h.
              let expSec = 3600;
              if (trimmed.split('.').length === 3) {
                try {
                  const payload = JSON.parse(atob(trimmed.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                  if (payload.exp) expSec = Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
                } catch { /* not JWT */ }
              }
              setToken(trimmed, expSec);
              setTokenInput('');
              setError(null);
              hideAfterSave();
            }}
            className="rfx-btn rfx-btn--primary"
            style={{ height: 36, padding: '0 14px', fontSize: 12 }}
            type="button"
          >
            Save
          </button>
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (!text || text.length < 8) { setError('Clipboard is empty or too short'); return; }
                setTokenInput(text.trim());
                setError(null);
              } catch {
                setError("Couldn't read clipboard — paste manually");
              }
            }}
            className="rfx-btn rfx-btn--subtle"
            style={{ height: 36, padding: '0 12px', fontSize: 12 }}
            type="button"
            title="Paste from clipboard"
          >
            Paste
          </button>
        </div>
      </div>
      {error && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626' }}>{error}</div>
      )}
    </div>
  );
}
