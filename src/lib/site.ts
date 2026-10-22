/**
 * Public site URL — used for canonical URLs, Open Graph, sitemap and robots.
 *
 * Order of preference:
 * 1. NEXT_PUBLIC_APP_URL (set this in Vercel for your custom domain)
 * 2. Vercel's stable production domain
 * 3. The per-deployment URL (preview)
 * 4. localhost
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'http://localhost:3000';

export const SITE_NAME = 'NOVA Dental Studio';
export const SITE_DESCRIPTION =
  'عيادة أسنان حديثة: فحص عام، تنظيف عميق، تبييض، تقويم، زراعة أسنان، وعلاج جذور — احجز موعدك أونلاين في دقيقة.';
