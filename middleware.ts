import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase SSR Middleware — Clean & minimal
 *
 * - يجدّد جلسة Supabase في كل طلب (refresh token → cookies)
 * - لازم مع @supabase/ssr عشان الـ Server Components تشوف الـ user الصح
 * - لا يعمل redirect — الحماية تتم في كل page بـ getSessionUser()/guard
 *
 * في وضع العرض التجريبي (بدون متغيرات بيئة) لا يوجد ما نجدّده، لذلك نتخطى
 * الـ middleware تمامًا بدل عمل طلب شبكة فاشل على كل تنقّل.
 *
 * Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Demo mode: no Supabase project configured → nothing to refresh.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    // مهم: استدعاء getUser() يجبر تجديد التوكن لو منتهي ويكتب الكوكيز الجديدة
    await supabase.auth.getUser();
  } catch {
    // A network/plan failure must never take down public pages.
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * يشتغل على كل المسارات ما عدا:
     * - _next/static, _next/image (ملفات Next الداخلية)
     * - favicon والصور الثابتة
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)',
  ],
};
