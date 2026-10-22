import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-nova-bg px-4" dir="rtl">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-nova-primary-light">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0C4A6E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3c-2.6 0-3.6 1.4-5 1.4S4 3.5 4 6.1c0 3.2 1.1 4.7 1.7 8.2.5 3 .9 6.3 2.4 6.3 1.5 0 1.3-3.3 2.2-5.2.5-1.2 1-1.9 1.7-1.9s1.2.7 1.7 1.9c.9 1.9.7 5.2 2.2 5.2 1.5 0 1.9-3.3 2.4-6.3C19 10.8 20 9.3 20 6.1c0-2.6-1.6-1.7-3-1.7S14.6 3 12 3Z" />
          </svg>
        </div>
        <div>
          <p className="text-5xl font-bold text-nova-text">404</p>
          <h1 className="mt-3 text-2xl font-bold text-nova-text">الصفحة غير موجودة</h1>
          <p className="mt-2 text-sm leading-relaxed text-nova-text-secondary">
            الرابط اللي فتحته غير صحيح أو تم نقل الصفحة. تقدر ترجع للرئيسية أو تحجز موعدك مباشرة.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-nova-primary px-5 text-sm font-bold text-white transition-colors hover:bg-nova-primary-dark"
          >
            الصفحة الرئيسية
          </Link>
          <Link
            href="/book"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-nova-primary px-5 text-sm font-bold text-nova-primary transition-colors hover:bg-nova-primary-light"
          >
            احجز موعد
          </Link>
        </div>
      </div>
    </div>
  );
}
