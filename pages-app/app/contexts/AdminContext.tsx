import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  admins: string[];
  currentUserName: string | null;
  currentUserEmail: string | null;
  login: (email: string, name?: string) => void;
  logout: () => void;
  addAdmin: (email: string) => void;
  removeAdmin: (email: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [admins, setAdmins] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedAdmins = localStorage.getItem('seportal_admins');
      if (savedAdmins) {
        return JSON.parse(savedAdmins);
      }
    }
    return ['admin@cloudflare.com', 'apottacloudflare.com', 'apotta@cloudflare.com'];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('seportal_user');
      const savedName = localStorage.getItem('seportal_user_name');
      if (savedUser) {
        setCurrentUser(savedUser);
        setCurrentUserName(savedName);
        setIsAdmin(admins.includes(savedUser));
      }
    }
  }, [admins]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('seportal_admins', JSON.stringify(admins));
    }
  }, [admins]);

  const login = useCallback((email: string, name?: string) => {
    setCurrentUser(email);
    localStorage.setItem('seportal_user', email);
    if (name) {
      setCurrentUserName(name);
      localStorage.setItem('seportal_user_name', name);
    }
    setIsAdmin(admins.includes(email));
  }, [admins]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentUserName(null);
    setIsAdmin(false);
    localStorage.removeItem('seportal_user');
    localStorage.removeItem('seportal_user_name');
  }, []);

  const addAdmin = useCallback((email: string) => {
    if (!admins.includes(email)) {
      setAdmins([...admins, email]);
    }
  }, [admins]);

  const removeAdmin = useCallback((email: string) => {
    setAdmins(admins.filter(a => a !== email));
  }, [admins]);

  return (
    <AdminContext.Provider value={{ isAdmin, admins, currentUserName, currentUserEmail: currentUser, login, logout, addAdmin, removeAdmin }}>
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
