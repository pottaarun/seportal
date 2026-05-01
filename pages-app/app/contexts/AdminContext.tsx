import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../lib/api';

interface AdminContextType {
  isAdmin: boolean;
  /** Admin emails (normalized to lowercase). Empty until the first server fetch returns. */
  admins: string[];
  currentUserName: string | null;
  currentUserEmail: string | null;
  login: (email: string, name?: string) => void;
  logout: () => void;
  /**
   * Grant admin to a new email. Server-side check enforces that the
   * current user must already be admin. Returns true on success, false
   * (with a console warning) on failure.
   */
  addAdmin: (email: string, name?: string) => Promise<boolean>;
  /** Revoke admin. Same auth check + last-admin guard server-side. */
  removeAdmin: (email: string) => Promise<boolean>;
  /** Force a re-fetch of the admin list (used after add/remove). */
  refreshAdmins: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Local-storage cache key. The cache lets the UI render an immediate
// best-guess admin state before the server fetch finishes — otherwise
// admin-only UI flickers off then on every page load. We always trust
// the server response over the cache once it arrives.
const ADMINS_CACHE_KEY = 'seportal_admins_cache';

function readCache(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADMINS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((s: string) => s.toLowerCase()) : [];
  } catch {
    return [];
  }
}

function writeCache(emails: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMINS_CACHE_KEY, JSON.stringify(emails));
  } catch { /* ignore */ }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admins, setAdmins] = useState<string[]>(() => readCache());
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  // isAdmin is derived from (currentUser, admins). We don't store it
  // separately — the source of truth is the intersection of those two.
  const isAdmin = !!currentUser && admins.some(a => a.toLowerCase() === currentUser.toLowerCase());

  // Fetch the canonical admin list from the worker. Called on mount and
  // after every add/remove so all browsers stay in sync.
  const refreshAdmins = useCallback(async () => {
    try {
      const data = await api.admins.list();
      const list = (data?.admins || []).map((s: string) => s.toLowerCase());
      setAdmins(list);
      writeCache(list);
    } catch (e) {
      // Network blip — fall back to whatever we already have. The cache
      // means the UI doesn't suddenly drop admin status on a flaky network.
      console.warn('Failed to refresh admin list:', e);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('seportal_user');
      const savedName = localStorage.getItem('seportal_user_name');
      if (savedUser) {
        setCurrentUser(savedUser);
        setCurrentUserName(savedName);
      }
    }
    refreshAdmins();
  }, [refreshAdmins]);

  const login = useCallback((email: string, name?: string) => {
    setCurrentUser(email);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seportal_user', email);
    }
    if (name) {
      setCurrentUserName(name);
      if (typeof window !== 'undefined') {
        localStorage.setItem('seportal_user_name', name);
      }
    }
    // Refresh in case admin grants happened while we were logged out.
    refreshAdmins();
  }, [refreshAdmins]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentUserName(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('seportal_user');
      localStorage.removeItem('seportal_user_name');
    }
  }, []);

  const addAdmin = useCallback(async (email: string, name?: string): Promise<boolean> => {
    if (!currentUser) {
      console.warn('addAdmin: not signed in');
      return false;
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return false;
    try {
      const res = await api.admins.add({
        email: trimmed,
        name: name?.trim() || undefined,
        requester_email: currentUser,
      });
      if (res?.success) {
        await refreshAdmins();
        return true;
      }
      console.warn('addAdmin failed:', res?.error);
      return false;
    } catch (e) {
      console.warn('addAdmin error:', e);
      return false;
    }
  }, [currentUser, refreshAdmins]);

  const removeAdmin = useCallback(async (email: string): Promise<boolean> => {
    if (!currentUser) {
      console.warn('removeAdmin: not signed in');
      return false;
    }
    try {
      const res = await api.admins.remove(email, currentUser);
      if (res?.success) {
        await refreshAdmins();
        return true;
      }
      console.warn('removeAdmin failed:', res?.error);
      return false;
    } catch (e) {
      console.warn('removeAdmin error:', e);
      return false;
    }
  }, [currentUser, refreshAdmins]);

  return (
    <AdminContext.Provider value={{
      isAdmin, admins,
      currentUserName, currentUserEmail: currentUser,
      login, logout,
      addAdmin, removeAdmin,
      refreshAdmins,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
