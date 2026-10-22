'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';

/**
 * PublicLayout — الغلاف العام للموقع التعريفي (هيدر + فوتر)
 *
 * كل الصفحات العامة (الرئيسية، الخدمات، الأطباء، المعرض، تواصل معنا، الحجز)
 * كانت من غير تنقّل أو هوية بصرية. الغلاف ده بيوحّدها ويخلي الموقع
 * قابل للنشر كموقع عيادة كامل، مع الحفاظ على مساحة عرض مريحة للقراءة.
 */

const publicNav = [
  { href: '/', label: 'الرئيسية' },
  { href: '/services', label: 'خدماتنا' },
  { href: '/doctors', label: 'أطباؤنا' },
  { href: '/gallery', label: 'المعرض' },
  { href: '/contact', label: 'تواصل معنا' },
];

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nova-primary text-white shadow-soft">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3c-2.6 0-3.6 1.4-5 1.4S4 3.5 4 6.1c0 3.2 1.1 4.7 1.7 8.2.5 3 .9 6.3 2.4 6.3 1.5 0 1.3-3.3 2.2-5.2.5-1.2 1-1.9 1.7-1.9s1.2.7 1.7 1.9c.9 1.9.7 5.2 2.2 5.2 1.5 0 1.9-3.3 2.4-6.3C19 10.8 20 9.3 20 6.1c0-2.6-1.6-1.7-3-1.7S14.6 3 12 3Z" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight text-nova-text">NOVA</span>
          <span className="text-[10px] font-medium text-nova-text-muted">عيادة أسنان</span>
        </span>
      )}
    </span>
  );
}

// The static export (GitHub Pages) has no server, so the staff area is not
// part of it — hide the staff entry points instead of linking to a 404.
const IS_STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_SITE === '1';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col bg-nova-bg">
      <header className="sticky top-0 z-40 border-b border-nova-border bg-nova-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <Link href="/" aria-label="NOVA Dental Studio — الصفحة الرئيسية" className="shrink-0">
            <BrandMark />
          </Link>

          <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 lg:flex">
            {publicNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive(item.href)
                    ? 'bg-nova-primary-light text-nova-primary-dark'
                    : 'text-nova-text-secondary hover:bg-nova-muted hover:text-nova-text'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!IS_STATIC_SITE && (
              <Link
                href={isAuthenticated ? '/dashboard' : '/login'}
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-nova-text-secondary transition-colors hover:bg-nova-muted hover:text-nova-text sm:inline-flex"
              >
                {isAuthenticated ? 'لوحة التحكم' : 'دخول الطاقم'}
              </Link>
            )}
            <Link
              href="/book"
              className="hidden h-10 items-center rounded-lg bg-nova-primary px-4 text-sm font-bold text-white shadow-soft transition-colors hover:bg-nova-primary-dark sm:inline-flex"
            >
              احجز موعد
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="public-mobile-nav"
              aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-nova-border bg-nova-surface text-nova-text transition-colors hover:bg-nova-muted lg:hidden"
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="public-mobile-nav" className="border-t border-nova-border bg-nova-surface lg:hidden">
            <nav aria-label="التنقل على الجوال" className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              {publicNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                    isActive(item.href)
                      ? 'bg-nova-primary-light text-nova-primary-dark'
                      : 'text-nova-text-secondary hover:bg-nova-muted'
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2 border-t border-nova-border pt-3">
                <Link
                  href="/book"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg bg-nova-primary px-4 text-sm font-bold text-white"
                >
                  احجز موعد
                </Link>
                {!IS_STATIC_SITE && (
                  <Link
                    href={isAuthenticated ? '/dashboard' : '/login'}
                    onClick={() => setMenuOpen(false)}
                    className="flex h-10 flex-1 items-center justify-center rounded-lg border border-nova-border px-4 text-sm font-semibold text-nova-text"
                  >
                    {isAuthenticated ? 'لوحة التحكم' : 'دخول الطاقم'}
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-12 lg:px-8">{children}</div>
      </main>

      <footer className="border-t border-nova-border bg-nova-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 md:px-6 lg:grid-cols-4 lg:px-8">
          <div className="lg:col-span-2">
            <BrandMark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-nova-text-secondary">
              عيادة أسنان حديثة تقدم رعاية شاملة: الفحص الوقائي، التجميل، التقويم، وزراعة الأسنان —
              بفريق من الأطباء المتخصصين.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-nova-muted px-3 py-1 text-xs font-medium text-nova-text-secondary">
              <span className="h-2 w-2 rounded-full bg-nova-success" aria-hidden="true" />
              نستقبل الحجز الأونلاين على مدار اليوم
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-nova-text">روابط سريعة</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {publicNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-nova-text-secondary transition-colors hover:text-nova-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/book" className="text-nova-text-secondary transition-colors hover:text-nova-primary">
                  حجز موعد
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-nova-text">تواصل معنا</h2>
            <ul className="mt-4 space-y-3 text-sm text-nova-text-secondary">
              <li className="flex items-start gap-2">
                <span aria-hidden="true">📍</span>
                <span>القاهرة، مصر</span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden="true">📞</span>
                <a href="tel:+201001234567" className="transition-colors hover:text-nova-primary" dir="ltr">
                  +20 100 123 4567
                </a>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden="true">✉️</span>
                <a href="mailto:info@novadental.com" className="transition-colors hover:text-nova-primary">
                  info@novadental.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden="true">🕒</span>
                <span>الأحد – الخميس: 9:00 ص – 6:00 م</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-nova-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-nova-text-muted md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} NOVA Dental Studio — جميع الحقوق محفوظة.</p>
            <p>موقع تجريبي (Demo) — البيانات المعروضة توضيحية وغير حقيقية.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
