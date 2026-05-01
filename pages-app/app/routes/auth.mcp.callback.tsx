import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { handleMcpCallback } from '../lib/mcp';
// rfx.css for the .rfx-page / .rfx-h / .rfx-btn / .rfx-spinner styling.
// Otherwise the error UI renders unstyled (text run together, no buttons).
import './rfx.css';

export function meta() {
  return [
    { title: 'Connecting cf-portal MCP… - SolutionHub' },
    { name: 'description', content: 'OAuth callback handler for cf-portal MCP' },
  ];
}

/**
 * OAuth 2.0 redirect target. cf-portal sends the user back here with
 * `?code=...&state=...`. We exchange the code for tokens, persist them in
 * localStorage, and bounce the user back to whatever page started the login.
 *
 * Registered in routes.ts as a flat route; URL is /auth/mcp/callback (matches
 * the `redirect_uri` we register via DCR in lib/mcp.ts).
 */
export default function McpCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'exchanging' | 'done' | 'error'>('exchanging');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    handleMcpCallback(params)
      .then(returnTo => {
        setStage('done');
        // Replace history so the back button skips the callback page.
        navigate(returnTo || '/', { replace: true });
      })
      .catch(err => {
        console.error('MCP OAuth callback failed:', err);
        setError(err instanceof Error ? err.message : String(err));
        setStage('error');
      });
  }, [navigate]);

  return (
    <div className="rfx-page" style={{ paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}>
      {stage === 'exchanging' && (
        <>
          <div className="rfx-spinner" style={{ margin: '0 auto 16px', width: 28, height: 28 }} />
          <h2 className="rfx-h" style={{ fontSize: 32 }}>Connecting cf-portal…</h2>
          <p className="rfx-muted">Exchanging authorization code for an access token.</p>
        </>
      )}

      {stage === 'error' && (
        <>
          <h2 className="rfx-h" style={{ fontSize: 32, color: '#dc2626' }}>Couldn't connect cf-portal MCP</h2>
          <p className="rfx-muted" style={{ maxWidth: 600, margin: '12px auto' }}>{error}</p>

          {/* The most common failure: cf-portal's authorization server keeps a
              server-side allowlist of redirect URIs that DCR can't override.
              In that case the only path forward is the JWT paste fallback. */}
          {(error || '').toLowerCase().includes('redirect uri') ? (
            <div style={{
              maxWidth: 640, margin: '20px auto 0', textAlign: 'left',
              padding: '18px 22px',
              background: 'rgba(246,130,31,0.06)',
              border: '1px solid rgba(246,130,31,0.25)',
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                What this means
              </div>
              <p className="rfx-muted" style={{ marginTop: 0 }}>
                cf-portal's authorization server doesn't accept SolutionHub's
                redirect URI yet. The browser-side OAuth path needs a one-time
                allowlist entry from whoever maintains cf-portal MCP.
              </p>

              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '14px 0 6px' }}>
                What works right now
              </div>
              <p className="rfx-muted" style={{ marginTop: 0 }}>
                Use the JWT-paste fallback — same identity as OAuth, just
                routed through OpenCode's existing auth instead of the browser:
              </p>
              <ol className="rfx-muted" style={{ margin: '8px 0 0 22px', paddingLeft: 0 }}>
                <li style={{ marginBottom: 6 }}>
                  On your laptop, run{' '}
                  <code style={{ padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: 4, fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>opencode mcp auth cf-portal</code>
                </li>
                <li style={{ marginBottom: 6 }}>
                  Open{' '}
                  <code style={{ padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: 4, fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>~/.local/share/opencode/mcp-auth.json</code>{' '}
                  and copy the <code style={{ padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: 4, fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>cf-portal.tokens.accessToken</code> value
                </li>
                <li>
                  Click any AI feature in SolutionHub (AI Coach, RFx, AI email
                  writer). The MCP banner has an <strong>"Already authed via OpenCode?"</strong>{' '}
                  button — paste the JWT there.
                </li>
              </ol>
            </div>
          ) : null}

          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center',
            marginTop: 24, flexWrap: 'wrap',
          }}>
            <a href="/" className="rfx-btn">Back to Dashboard</a>
            <a href="/ai-hub" className="rfx-btn rfx-btn--primary">Open AI Hub</a>
          </div>
        </>
      )}
    </div>
  );
}
