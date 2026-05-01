import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { handleMcpCallback } from '../lib/mcp';

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
          <p className="rfx-muted" style={{ maxWidth: 560, margin: '12px auto' }}>{error}</p>
          <div className="rfx-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
            <a href="/" className="rfx-btn">Back to Dashboard</a>
            <a href="/admin" className="rfx-btn rfx-btn--primary">Try again from Admin → MCP</a>
          </div>
          <p className="rfx-fine" style={{ marginTop: 24 }}>
            Power-user fallback: run <code style={{ padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: 4 }}>opencode mcp auth cf-portal</code> on
            your laptop and paste the JWT in <strong>Admin → MCP</strong>.
          </p>
        </>
      )}
    </div>
  );
}
