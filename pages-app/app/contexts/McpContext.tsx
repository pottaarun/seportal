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
  gatherContext,
  callMcpTool,
  listMcpTools,
  type McpToolDef,
} from '../lib/mcp';

interface McpContextValue {
  isAuthed: boolean;
  expiresAt: number | null;
  /** Begin OAuth (redirects the page). */
  login: (returnTo?: string) => Promise<void>;
  /** Clear local tokens and require re-auth. */
  logout: () => void;
  /** Power-user fallback: paste a JWT from `opencode mcp auth cf-portal`. */
  setToken: (jwt: string, expiresInSec?: number) => void;
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

  // Refresh the local view of auth state. Called on mount, after login, and
  // on a window focus event (in case the user authed in another tab).
  const sync = useCallback(() => {
    setIsAuthedState(mcpIsAuthed());
    setExpiresAt(getTokenExpiry());
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

  const setToken = useCallback((jwt: string, expiresInSec = 86_400) => {
    setManualToken(jwt, expiresInSec);
    sync();
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
    login,
    logout,
    setToken,
    gather,
    callTool: callMcpTool,
    listTools: listMcpTools,
  }), [isAuthedState, expiresAt, login, logout, setToken, gather]);

  return <McpContext.Provider value={value}>{children}</McpContext.Provider>;
}

export function useMcp(): McpContextValue {
  const ctx = useContext(McpContext);
  if (!ctx) throw new Error('useMcp must be used inside <McpProvider>');
  return ctx;
}
