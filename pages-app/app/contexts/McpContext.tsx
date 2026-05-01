// ──────────────────────────────────────────────────────────────────────────────
// McpContext — global state for cf-portal MCP auth + grounding
//
// Wraps the imperative helpers in lib/mcp.ts in a React context so AI
// features anywhere in the app can:
//   const { isAuthed, expiresAt, login, logout, gather } = useMcp();
//
// `gather(query)` is the convenience that AI features use most: it returns
// best-effort grounding context from cf-portal (wiki + Backstage techdocs +
// catalog + Cloudflare docs) and silently returns [] if the user isn't
// authenticated. AI features can therefore opt in to MCP without making it a
// hard dependency.
// ──────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import {
  isAuthed as mcpIsAuthed,
  getTokenExpiry,
  loginWithMcp,
  clearMcpAuth,
  setManualToken,
  setManualTokens,
  parseTokensBlob,
  gatherContext,
  callMcpTool,
  listMcpTools,
  MCP_CONFIG,
  type McpToolDef,
} from '../lib/mcp';

interface McpContextValue {
  isAuthed: boolean;
  expiresAt: number | null;
  /** True if a refresh token is stored — silent renewal possible. */
  hasRefreshToken: boolean;
  /** The MCP server URL (for status display). */
  serverUrl: string;
  /** Begin OAuth (redirects the page). */
  login: (returnTo?: string) => Promise<void>;
  /** Clear local tokens and require re-auth. */
  logout: () => void;
  /** Power-user fallback: paste an opaque access token (no refresh). */
  setToken: (token: string, expiresInSec?: number) => void;
  /** Power-user fallback: paste the full tokens JSON blob from
   *  ~/.local/share/opencode/mcp-auth.json. Stores both access_token and
   *  refresh_token so silent renewal works afterward. Returns true if the
   *  blob parsed and was stored, false otherwise. */
  setTokensFromBlob: (raw: string) => boolean;
  /** Best-effort grounding for AI features. Returns [] if not authed. */
  gather: (query: string, opts?: Parameters<typeof gatherContext>[1]) => Promise<{ source: string; text: string }[]>;
  /** Direct tool invocation. Throws 'mcp_unauthorized' if not authed. */
  callTool: typeof callMcpTool;
  /** List available tools (lazy, mostly for the Settings UI). */
  listTools: () => Promise<McpToolDef[]>;
}

const McpContext = createContext<McpContextValue | null>(null);

export function McpProvider({ children }: { children: ReactNode }) {
  const [isAuthedState, setIsAuthedState] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [hasRefreshToken, setHasRefreshToken] = useState(false);

  // Refresh the local view of auth state. Called on mount, after login, and
  // on a window focus event (in case the user authed in another tab).
  const sync = useCallback(() => {
    setIsAuthedState(mcpIsAuthed());
    setExpiresAt(getTokenExpiry());
    if (typeof window === 'undefined') {
      setHasRefreshToken(false);
    } else {
      try {
        const raw = localStorage.getItem(MCP_CONFIG.storageKeys.tokens);
        const parsed = raw ? JSON.parse(raw) : null;
        setHasRefreshToken(!!parsed?.refresh_token);
      } catch {
        setHasRefreshToken(false);
      }
    }
  }, []);

  useEffect(() => {
    sync();
    if (typeof window === 'undefined') return;
    const onFocus = () => sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('mcp.cf-portal.')) sync();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [sync]);

  const login = useCallback(async (returnTo?: string) => {
    await loginWithMcp(returnTo);
    // `loginWithMcp` redirects, this line never runs in practice
  }, []);

  const logout = useCallback(() => {
    clearMcpAuth();
    sync();
  }, [sync]);

  const setToken = useCallback((token: string, expiresInSec = 3600) => {
    setManualToken(token, expiresInSec);
    sync();
  }, [sync]);

  const setTokensFromBlob = useCallback((raw: string): boolean => {
    const parsed = parseTokensBlob(raw);
    if (!parsed) return false;
    setManualTokens(parsed);
    sync();
    return true;
  }, [sync]);

  const gather = useCallback<McpContextValue['gather']>(async (query, opts) => {
    if (!mcpIsAuthed()) return [];
    try {
      return await gatherContext(query, opts);
    } catch (e: any) {
      // If we got an unauthorized mid-call, surface that by clearing state.
      if (e?.code === 'mcp_unauthorized') sync();
      return [];
    }
  }, [sync]);

  const value = useMemo<McpContextValue>(() => ({
    isAuthed: isAuthedState,
    expiresAt,
    hasRefreshToken,
    serverUrl: MCP_CONFIG.serverUrl,
    login,
    logout,
    setToken,
    setTokensFromBlob,
    gather,
    callTool: callMcpTool,
    listTools: listMcpTools,
  }), [isAuthedState, expiresAt, hasRefreshToken, login, logout, setToken, setTokensFromBlob, gather]);

  return <McpContext.Provider value={value}>{children}</McpContext.Provider>;
}

export function useMcp(): McpContextValue {
  const ctx = useContext(McpContext);
  if (!ctx) throw new Error('useMcp must be used inside <McpProvider>');
  return ctx;
}
