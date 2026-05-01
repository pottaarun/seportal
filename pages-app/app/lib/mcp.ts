// ──────────────────────────────────────────────────────────────────────────────
// cf-portal MCP browser client
//
// Talks to https://portal.mcp.cfdata.org/mcp directly from the browser.
// Auth uses OAuth 2.1 + PKCE + Dynamic Client Registration against
// cf-mcp.cloudflareaccess.com. Tokens live in localStorage so they survive
// page reloads. CORS is wide-open at the MCP server (verified with a
// preflight) so no worker proxy is required.
//
// Why: every AI capability in SolutionHub (AI Coach chat, RFx generator,
// announcement email writer, curriculum advisor, etc.) can pull richer
// grounding from cf-portal — Backstage techdocs, the internal wiki, Jira
// tickets, GitLab files, BigQuery-backed prometheus metrics, all under the
// signed-in user's permissions.
//
// If the user hasn't authed yet, the UI shows a hint:
//   "Connect cf-portal MCP for richer answers"
// plus a fallback for power users:
//   "Already authed via OpenCode? Run `opencode mcp auth cf-portal` and
//    the tokens will sync if you have the same login session."
// (The OpenCode tokens at ~/.local/share/opencode/mcp-auth.json can be
// pasted into the Settings UI as a manual override.)
// ──────────────────────────────────────────────────────────────────────────────

export const MCP_CONFIG = {
  // Source: ~/.config/opencode/opencode.jsonc (the global OpenCode config).
  // Production cf-portal MCP server — same one OpenCode uses.
  serverUrl: 'https://portal.mcp.cfdata.org/mcp',
  // The OAuth authorization server is auto-discovered from
  // /.well-known/oauth-protected-resource. The values below are the current
  // production endpoints; they're cached at module load and will be
  // re-discovered if a request returns 401 with new metadata.
  authServer: 'https://cf-mcp.cloudflareaccess.com',
  // Resource indicator that the AS expects in the audience claim.
  resource: 'https://portal.mcp.cfdata.org',
  // localStorage keys
  storageKeys: {
    client: 'mcp.cf-portal.client',         // {client_id, client_id_issued_at, …}
    tokens: 'mcp.cf-portal.tokens',         // {access_token, refresh_token, expires_at, scope}
    pkce:   'mcp.cf-portal.pkce',           // {state, code_verifier, return_to}
    sessionId: 'mcp.cf-portal.session_id',  // server-issued Mcp-Session-Id
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// PKCE helpers — RFC 7636
// ──────────────────────────────────────────────────────────────────────────────

function base64UrlEncode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(byteLen = 32): string {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
}

async function s256(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

// ──────────────────────────────────────────────────────────────────────────────
// Type definitions
// ──────────────────────────────────────────────────────────────────────────────

interface OAuthClient {
  client_id: string;
  client_id_issued_at?: number;
  client_secret?: string;
  redirect_uris: string[];
  registration_client_uri?: string;
  registration_access_token?: string;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_at: number; // epoch ms
  scope?: string;
}

interface PkceState {
  state: string;
  code_verifier: string;
  return_to: string;
}

export interface McpToolDef {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface McpToolCallResult {
  content?: Array<{ type: string; text?: string; data?: any }>;
  isError?: boolean;
  // When the response is structured (newer MCP spec), this carries the JSON
  structuredContent?: any;
  [key: string]: any;
}

// ──────────────────────────────────────────────────────────────────────────────
// localStorage persistence
// ──────────────────────────────────────────────────────────────────────────────

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function deleteKey(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function getStoredClient(): OAuthClient | null {
  return readJson<OAuthClient>(MCP_CONFIG.storageKeys.client);
}

export function getStoredTokens(): OAuthTokens | null {
  return readJson<OAuthTokens>(MCP_CONFIG.storageKeys.tokens);
}

function setStoredTokens(tokens: OAuthTokens) {
  writeJson(MCP_CONFIG.storageKeys.tokens, tokens);
}

export function clearMcpAuth() {
  deleteKey(MCP_CONFIG.storageKeys.tokens);
  deleteKey(MCP_CONFIG.storageKeys.pkce);
  deleteKey(MCP_CONFIG.storageKeys.sessionId);
  // Keep the registered client — DCR is one-time per browser
}

export function isAuthed(): boolean {
  const t = getStoredTokens();
  if (!t?.access_token) return false;
  // Treat as expired 60s early to avoid edge-case 401s
  return t.expires_at > Date.now() + 60_000;
}

export function getTokenExpiry(): number | null {
  return getStoredTokens()?.expires_at ?? null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Dynamic Client Registration — RFC 7591
//
// The cf-portal authorization server supports `none` token_endpoint_auth_method
// which means we register as a public client (no client_secret) and the
// browser handles the entire flow with PKCE protection.
// ──────────────────────────────────────────────────────────────────────────────

async function registerClient(): Promise<OAuthClient> {
  const existing = getStoredClient();
  if (existing?.client_id) return existing;

  const redirectUri = getRedirectUri();
  const res = await fetch(`${MCP_CONFIG.authServer}/cdn-cgi/access/oauth/registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'SolutionHub (seportal)',
      client_uri: window.location.origin,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      // Optional: scope hint. cf-portal currently uses empty/default scope.
      scope: '',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MCP DCR failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const client: OAuthClient = {
    client_id: data.client_id,
    client_id_issued_at: data.client_id_issued_at,
    client_secret: data.client_secret, // typically undefined for public clients
    redirect_uris: data.redirect_uris ?? [redirectUri],
    registration_client_uri: data.registration_client_uri,
    registration_access_token: data.registration_access_token,
  };
  writeJson(MCP_CONFIG.storageKeys.client, client);
  return client;
}

function getRedirectUri(): string {
  return `${window.location.origin}/auth/mcp/callback`;
}

// ──────────────────────────────────────────────────────────────────────────────
// OAuth flow
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Begin the OAuth login. Sets up PKCE, registers the client if needed, and
 * redirects the browser to the authorization endpoint. Returns nothing — the
 * page navigates away.
 *
 * @param returnTo where to land after the callback (defaults to current page)
 */
export async function loginWithMcp(returnTo?: string): Promise<void> {
  const client = await registerClient();

  const code_verifier = randomString(48);
  const code_challenge = await s256(code_verifier);
  const state = randomString(16);

  const pkce: PkceState = {
    state,
    code_verifier,
    return_to: returnTo ?? window.location.pathname + window.location.search,
  };
  writeJson(MCP_CONFIG.storageKeys.pkce, pkce);

  const url = new URL(`${MCP_CONFIG.authServer}/cdn-cgi/access/oauth/authorization`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', client.client_id);
  url.searchParams.set('redirect_uri', getRedirectUri());
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', code_challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // Resource indicator (RFC 8707) so the issued token's audience targets
  // the cf-portal MCP server rather than a generic Access app.
  url.searchParams.set('resource', MCP_CONFIG.resource);

  window.location.href = url.toString();
}

/**
 * Called from /auth/mcp/callback. Exchanges the authorization code for tokens
 * and stores them. Returns the path the user should be redirected to.
 */
export async function handleMcpCallback(searchParams: URLSearchParams): Promise<string> {
  const code = searchParams.get('code');
  const stateFromUrl = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    const desc = searchParams.get('error_description') || error;
    throw new Error(`OAuth error: ${desc}`);
  }
  if (!code) throw new Error('OAuth callback missing `code` parameter');

  const pkce = readJson<PkceState>(MCP_CONFIG.storageKeys.pkce);
  if (!pkce) throw new Error('Missing PKCE state — please retry login');
  if (pkce.state !== stateFromUrl) throw new Error('OAuth state mismatch (possible CSRF)');

  const client = getStoredClient();
  if (!client) throw new Error('No registered client — please retry login');

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', getRedirectUri());
  body.set('client_id', client.client_id);
  body.set('code_verifier', pkce.code_verifier);
  body.set('resource', MCP_CONFIG.resource);

  const res = await fetch(`${MCP_CONFIG.authServer}/cdn-cgi/access/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const tokens: OAuthTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type ?? 'Bearer',
    expires_at: Date.now() + (Number(data.expires_in ?? 3600) * 1000),
    scope: data.scope,
  };
  setStoredTokens(tokens);

  // Clean up one-time PKCE state
  deleteKey(MCP_CONFIG.storageKeys.pkce);

  return pkce.return_to || '/';
}

/**
 * Use the refresh token to get a fresh access token. Returns null if refresh
 * isn't possible (no refresh token, or refresh failed) — caller should
 * trigger a fresh loginWithMcp() in that case.
 */
async function refreshTokens(): Promise<OAuthTokens | null> {
  const stored = getStoredTokens();
  if (!stored?.refresh_token) return null;
  const client = getStoredClient();
  if (!client) return null;

  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', stored.refresh_token);
  body.set('client_id', client.client_id);

  const res = await fetch(`${MCP_CONFIG.authServer}/cdn-cgi/access/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const tokens: OAuthTokens = {
    access_token: data.access_token,
    // Some servers rotate refresh tokens, others don't — keep the existing
    // one if not provided.
    refresh_token: data.refresh_token ?? stored.refresh_token,
    token_type: data.token_type ?? 'Bearer',
    expires_at: Date.now() + (Number(data.expires_in ?? 3600) * 1000),
    scope: data.scope ?? stored.scope,
  };
  setStoredTokens(tokens);
  return tokens;
}

/**
 * Returns a fresh access token, refreshing if necessary. Returns null if no
 * valid token is available (caller should kick the user to loginWithMcp).
 */
async function getAccessToken(): Promise<string | null> {
  let stored = getStoredTokens();
  if (stored && stored.expires_at > Date.now() + 60_000) return stored.access_token;
  // Try refresh
  const refreshed = await refreshTokens();
  return refreshed?.access_token ?? null;
}

/**
 * Manual override — paste a JWT obtained from `opencode mcp auth cf-portal`.
 * The OpenCode tool stores tokens at ~/.local/share/opencode/mcp-auth.json.
 * Power users can copy that token here to skip the in-app OAuth.
 */
export function setManualToken(accessToken: string, expiresInSec = 86_400): void {
  setStoredTokens({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_at: Date.now() + expiresInSec * 1000,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// MCP transport (Streamable HTTP)
//
// The MCP server speaks JSON-RPC 2.0 over POST. Each request carries the
// auth token and the optional Mcp-Session-Id header (returned by the server
// after `initialize`). Responses can be plain JSON or text/event-stream — we
// only consume the JSON path here for tool calls.
// ──────────────────────────────────────────────────────────────────────────────

let nextId = 1;
function rpcId() { return nextId++; }

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

async function rpc(method: string, params?: any): Promise<any> {
  const token = await getAccessToken();
  if (!token) {
    const err: any = new Error('mcp_unauthorized');
    err.code = 'mcp_unauthorized';
    throw err;
  }

  const sessionId = (typeof window !== 'undefined')
    ? localStorage.getItem(MCP_CONFIG.storageKeys.sessionId)
    : null;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    // The MCP HTTP transport requires us to declare what we accept.
    'Accept': 'application/json, text/event-stream',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const req: JsonRpcRequest = { jsonrpc: '2.0', id: rpcId(), method, params };

  const res = await fetch(MCP_CONFIG.serverUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });

  // Capture session id if the server issued one
  const newSession = res.headers.get('Mcp-Session-Id');
  if (newSession && typeof window !== 'undefined') {
    localStorage.setItem(MCP_CONFIG.storageKeys.sessionId, newSession);
  }

  if (res.status === 401) {
    // Token might be revoked — clear and surface as unauthenticated
    clearMcpAuth();
    const err: any = new Error('mcp_unauthorized');
    err.code = 'mcp_unauthorized';
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP transport error (${res.status}): ${text.slice(0, 400)}`);
  }

  const ctype = res.headers.get('Content-Type') || '';
  if (ctype.includes('text/event-stream')) {
    // Streaming response — read the first JSON-RPC message
    const text = await res.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload) as JsonRpcResponse;
          if (parsed.error) throw new Error(`MCP RPC error ${parsed.error.code}: ${parsed.error.message}`);
          return parsed.result;
        } catch (e) { /* keep scanning */ }
      }
    }
    throw new Error('MCP SSE response did not include a result');
  }

  const body = await res.json() as JsonRpcResponse | JsonRpcResponse[];
  // Some servers return arrays for batched calls — we only sent one
  const resp = Array.isArray(body) ? body[0] : body;
  if (resp.error) throw new Error(`MCP RPC error ${resp.error.code}: ${resp.error.message}`);
  return resp.result;
}

let initialized = false;

async function initializeOnce(): Promise<void> {
  if (initialized) return;
  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'seportal-browser', version: '1.0.0' },
  });
  // Notify server we're ready (per MCP spec)
  try {
    await rpc('notifications/initialized', {});
  } catch { /* notification — server may not respond */ }
  initialized = true;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public MCP API
// ──────────────────────────────────────────────────────────────────────────────

export async function listMcpTools(): Promise<McpToolDef[]> {
  await initializeOnce();
  const result = await rpc('tools/list');
  return (result?.tools ?? []) as McpToolDef[];
}

/**
 * Call an MCP tool by name. Returns the structured result. If the user is not
 * authenticated, throws an error with code 'mcp_unauthorized' — the UI should
 * catch that and prompt re-login.
 */
export async function callMcpTool(name: string, args: Record<string, any> = {}): Promise<McpToolCallResult> {
  await initializeOnce();
  const result = await rpc('tools/call', { name, arguments: args });
  return result as McpToolCallResult;
}

/**
 * Convenience: call a tool and return the first text/JSON content as a string.
 * Used by AI features that just want grounding context to inline into a
 * prompt.
 */
export async function callMcpToolForContext(name: string, args: Record<string, any> = {}): Promise<string> {
  const result = await callMcpTool(name, args);
  if (result.isError) return '';
  if (result.structuredContent) {
    return JSON.stringify(result.structuredContent, null, 2);
  }
  const parts: string[] = [];
  for (const item of result.content ?? []) {
    if (item.type === 'text' && item.text) parts.push(item.text);
    if (item.type === 'json' && item.data) parts.push(JSON.stringify(item.data, null, 2));
  }
  return parts.join('\n\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// High-level grounding helpers — small wrappers around the cf-portal tools
// the AI features in SolutionHub want to use. Each is best-effort: if the
// user isn't authed or the tool errors, return an empty string and let the
// AI feature continue without grounding.
// ──────────────────────────────────────────────────────────────────────────────

async function bestEffort<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

/**
 * Search the internal Cloudflare wiki (Confluence). Returns plain text
 * suitable to inline as grounding context.
 */
export async function searchWiki(query: string, limit = 3): Promise<string> {
  return bestEffort(async () => {
    const result = await callMcpTool('wiki-mcp-server_search_wiki', { query });
    return formatList(result, 'wiki', limit);
  }, '');
}

/**
 * Search Backstage techdocs (engineering SOPs, READMEs, walkthroughs).
 */
export async function searchTechdocs(query: string, limit = 3): Promise<string> {
  return bestEffort(async () => {
    const result = await callMcpTool('backstage_backstage_search_techdocs', { search: query });
    return formatList(result, 'techdoc', limit);
  }, '');
}

/**
 * Search the Backstage software catalog (services, owners, dependencies).
 */
export async function searchBackstageCatalog(query: string, limit = 3): Promise<string> {
  return bestEffort(async () => {
    const result = await callMcpTool('backstage_backstage_search_catalog', { search: query });
    return formatList(result, 'catalog', limit);
  }, '');
}

/**
 * Search Cloudflare's public docs via cf-portal (different index than the
 * one in the seportal worker; this one is always fresh and broader).
 */
export async function searchCloudflareDocs(query: string): Promise<string> {
  return bestEffort(async () => {
    const result = await callMcpTool('cloudflare-docs_search_cloudflare_documentation', { query });
    return formatList(result, 'cf-doc', 5);
  }, '');
}

function formatList(result: McpToolCallResult, label: string, limit: number): string {
  // Most cf-portal tools return either a content array or structuredContent
  // with .results. Normalize and take the top N.
  let items: any[] = [];
  if (result.structuredContent?.results) items = result.structuredContent.results;
  else if (Array.isArray(result.structuredContent)) items = result.structuredContent;
  else if (result.content) {
    // Try to coerce the text payload as JSON
    for (const c of result.content) {
      if (c.type === 'text' && c.text) {
        try {
          const parsed = JSON.parse(c.text);
          if (Array.isArray(parsed)) items = parsed;
          else if (parsed.results) items = parsed.results;
          else if (parsed.items) items = parsed.items;
        } catch { /* not JSON, skip */ }
      }
    }
  }
  if (!items.length) return '';
  return items.slice(0, limit).map((it: any, i: number) => {
    const title = it.title || it.name || it.metadata?.name || it.document?.entityTitle || it.document?.title || `${label} ${i + 1}`;
    const text = it.snippet || it.text || it.document?.text || it.description || '';
    const url = it.url || it.location || it.document?.location || '';
    return `[${label}] ${title}${url ? ` (${url})` : ''}\n${text}`;
  }).join('\n\n');
}

/**
 * Pulls the top relevant context from multiple cf-portal tools at once.
 * Used by AI features that want broad grounding (e.g., the AI Coach chat).
 *
 * Runs every tool in parallel; any individual failure is ignored.
 */
export async function gatherContext(query: string, opts: {
  wiki?: boolean;
  techdocs?: boolean;
  catalog?: boolean;
  cfDocs?: boolean;
} = {}): Promise<{ source: string; text: string }[]> {
  const tasks: Promise<{ source: string; text: string }>[] = [];
  if (opts.wiki !== false) tasks.push(searchWiki(query, 2).then(text => ({ source: 'wiki', text })));
  if (opts.techdocs !== false) tasks.push(searchTechdocs(query, 2).then(text => ({ source: 'techdocs', text })));
  if (opts.catalog !== false) tasks.push(searchBackstageCatalog(query, 2).then(text => ({ source: 'catalog', text })));
  if (opts.cfDocs !== false) tasks.push(searchCloudflareDocs(query).then(text => ({ source: 'cf-docs', text })));
  const results = await Promise.all(tasks);
  return results.filter(r => r.text.trim().length > 0);
}
