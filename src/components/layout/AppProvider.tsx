'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthProvider';

// App context for global state
interface AppContextType {
  sidebarOpen: boolean;
  /** True under the `md` breakpoint — the sidebar becomes an overlay there. */
  isMobile: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  notifications: Array<{ id: string; type: string; message: string; time: string }>;
  addNotification: (type: string, message: string) => void;
  removeNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; message: string; time: string }>>([]);

  // On desktop, start with the sidebar open; on mobile it starts closed and
  // behaves as an overlay so it never eats a permanent 64px of a phone screen.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia('(max-width: 767px)');
    const apply = (mobile: boolean) => {
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    apply(query.matches);
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = pendingTimeouts.current;
    return () => {
      pending.forEach(clearTimeout);
      pendingTimeouts.current = [];
    };
  }, []);

  const addNotification = useCallback((type: string, message: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, message, time: new Date().toLocaleTimeString() }]);

    // Auto-remove after 5 seconds
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
    pendingTimeouts.current.push(timer);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        isMobile,
        toggleSidebar,
        closeSidebar,
        notifications,
        addNotification,
        removeNotification,
      }}
    >
      <div className="min-h-screen bg-nova-bg">
        {children}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
