'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/layout/AppProvider';
import { useAuth } from '@/components/layout/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  requireAuth?: boolean;
  className?: string;
}

export function AppLayout({
  children,
  showSidebar = true,
  requireAuth = true,
  className,
}: AppLayoutProps) {
  const { sidebarOpen } = useApp();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect unauthenticated users to the login page once session state resolves.
  useEffect(() => {
    if (!requireAuth) return;
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [requireAuth, isLoading, isAuthenticated, router]);

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-nova-bg px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-nova-border border-t-nova-primary" />
          <p className="text-sm text-nova-text-muted">جارٍ التحويل إلى صفحة تسجيل الدخول…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      {showSidebar && <Sidebar />}

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          showSidebar ? (sidebarOpen ? 'md:ms-64' : 'md:ms-16') : 'ms-0',
          className
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// Auth layout (no sidebar/header)
interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-nova-primary-light via-nova-bg to-nova-surface">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
