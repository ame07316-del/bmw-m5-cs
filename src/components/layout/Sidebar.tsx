'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from './AppProvider';
import { useLanguage } from './LanguageProvider';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

// Navigation items
export const navItems = [
  {
    id: 'dashboard',
    label: { en: 'Dashboard', ar: 'لوحة التحكم' },
    href: '/dashboard',
    icon: 'grid',
    roles: ['doctor', 'secretary', 'admin'],
  },
  {
    id: 'appointments',
    label: { en: 'Appointments', ar: 'المواعيد' },
    href: '/appointments',
    icon: 'calendar',
    roles: ['doctor', 'secretary', 'admin'],
  },
  {
    id: 'patients',
    label: { en: 'Patients', ar: 'المرضى' },
    href: '/patients',
    icon: 'users',
    roles: ['doctor', 'secretary', 'admin'],
  },
  {
    id: 'dentists',
    label: { en: 'Dentists', ar: 'أطباء الأسنان' },
    href: '/dentists',
    icon: 'stethoscope',
    roles: ['admin'],
  },
  {
    id: 'services',
    label: { en: 'Services', ar: 'الخدمات' },
    href: '/services',
    icon: 'service',
    roles: ['doctor', 'secretary', 'admin'],
  },
  {
    id: 'gallery',
    label: { en: 'Gallery', ar: 'المعرض' },
    href: '/gallery',
    icon: 'image',
    roles: ['doctor', 'secretary', 'admin'],
  },
  {
    id: 'settings',
    label: { en: 'Settings', ar: 'الإعدادات' },
    href: '/settings',
    icon: 'settings',
    roles: ['doctor', 'secretary', 'admin'],
  },
] as const;

// Sidebar component
export function Sidebar() {
  const { sidebarOpen, toggleSidebar, isMobile, closeSidebar } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace('/login');
  };

  return (
      <aside
        className={`
          fixed inset-y-0 start-0 z-40 h-full bg-nova-surface
          transition-all duration-300 ease-out
          ${sidebarOpen ? 'w-64 border-e border-nova-border shadow-floating md:shadow-none' : 'w-0 overflow-hidden md:w-16 md:border-e md:border-nova-border'}
        `}
        aria-hidden={!sidebarOpen && isMobile}
      >
      <div className="flex h-16 items-center justify-between px-4 border-b border-nova-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-nova-primary text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          {sidebarOpen && (
            <span className="truncate text-lg font-bold text-nova-text">NOVA</span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-md text-nova-text-muted hover:bg-nova-muted hover:text-nova-text transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={sidebarOpen ? '' : 'rotate-180'}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => { if (isMobile) closeSidebar(); }}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-nova-primary-light text-nova-primary-dark font-semibold'
                      : 'text-nova-text-secondary hover:bg-nova-muted hover:text-nova-text'
                    }
                  `}
                  title={!sidebarOpen ? item.label[language === 'ar' ? 'ar' : 'en'] : undefined}
                >
                  <Icon name={item.icon} />
                  {sidebarOpen && <span>{item.label[language === 'ar' ? 'ar' : 'en']}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-nova-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-nova-text-secondary hover:bg-nova-muted hover:text-nova-text transition-colors"
        >
          <Icon name="logout" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

// Icon component
function Icon({ name, className = '' }: { name: string; className?: string }) {
  const iconPaths: Record<string, ReactElement> = {
    grid: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    calendar: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    users: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    stethoscope: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.27 16.2C5.12 17.2 6.31 18 7.62 18c.6 0 1-.18 1.41-.54l2.1-2.1" /><path d="M19.73 7.8C18.88 6.8 17.69 6 16.38 6c-.6 0-1 .18-1.41.54l-2.1 2.1" /><path d="M12 12h.01" />
      </svg>
    ),
    service: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    image: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    settings: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    logout: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  };

  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {iconPaths[name] || iconPaths['grid']}
    </span>
  );
}
