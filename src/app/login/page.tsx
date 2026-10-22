'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';
import { checkSupabaseServer } from '@/app/actions';
import { AuthLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { notify } from '@/components/ui/Notification';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  // فحص اتصال السيرفر بـ Supabase (بيئة المعاينة قد تحجب الدومين حتى مع المفاتيح الصحيحة)
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void checkSupabaseServer().then((r) => {
      if (!cancelled) setServerReachable(r.reachable);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      notify('error', 'حقول ناقصة', 'أدخل بريدك وكلمة المرور.');
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      notify('error', 'وضع العرض التجريبي', 'Supabase غير متصل — أضف متغيرات البيئة في .env.local لتشغيل تسجيل الدخول.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      notify('success', 'مرحباً بعودتك', 'تم تسجيل الدخول بنجاح.');
      await router.refresh();
      router.replace('/dashboard');
    } catch (err) {
      notify('error', 'فشل تسجيل الدخول', (err as Error).message || 'تحقق من بياناتك.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !firstName) {
      notify('error', 'حقول ناقصة', 'الاسم والبريد وكلمة المرور مطلوبة.');
      return;
    }
    if (password.length < 6) {
      notify('error', 'كلمة مرور ضعيفة', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      notify('error', 'وضع العرض التجريبي', 'Supabase غير متصل — أضف متغيرات البيئة في .env.local لتشغيل إنشاء الحسابات.');
      return;
    }
    setLoading(true);
    try {
      // Patient-only public signup. Staff accounts are created by an admin,
      // never by self-selected role (prevents privilege escalation).
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'patient',
          },
        },
      });
      if (error) throw error;
      // No session = email confirmation required
      if (!data.session) {
        setCheckEmail(true);
        notify('success', 'تحقق من بريدك', 'أكد بريدك لإتمام إنشاء الحساب.');
        return;
      }
      notify('success', 'تم إنشاء الحساب', 'يمكنك الآن تسجيل الدخول.');
      setMode('signin');
      setPassword('');
    } catch (err) {
      notify('error', 'فشل إنشاء الحساب', (err as Error).message || 'تعذر إنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card variant="elevated">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-nova-primary text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4.27 16.2C5.12 17.2 6.31 18 7.62 18c.6 0 1-.18 1.41-.54l2.1-2.1" />
              <path d="M20.38 11.2l-7.3-7.3-6.2 6.2-2.5-2.5c-1 1-1.58 2.36-1.58 3.9 0 1.54.58 2.9 1.58 3.9l2.5-2.5 6.2 6.2 7.3-7.3z" />
            </svg>
          </div>
          <CardTitle className="text-xl">NOVA Dental Studio</CardTitle>
          <p className="mt-1 text-sm text-nova-text-secondary">
            {mode === 'signin' ? 'تسجيل دخول الطاقم' : 'إنشاء حساب مريض'}
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          {!isSupabaseConfigured && (
            <div role="status" className="rounded-lg border border-nova-border bg-nova-muted p-3 text-xs leading-relaxed text-nova-text-secondary">
              <span className="me-1">🛈</span>
              وضع العرض التجريبي — Supabase غير متصل. الصفحات العامة والبيانات التجريبية تعمل،
              وتسجيل الدخول يتطلب إضافة <code className="rounded bg-nova-surface px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> و{' '}
              <code className="rounded bg-nova-surface px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> في ملف{' '}
              <code className="rounded bg-nova-surface px-1 py-0.5">.env.local</code>.
            </div>
          )}
          {isSupabaseConfigured && serverReachable === false && (
            <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              <span className="me-1">⚠️</span>
              المفاتيح مظبوطة ✓ لكن سيرفر التطبيق <strong>مش قادر يوصل لـ Supabase</strong> من هذه البيئة
              (شبكة المعاينة محجوبة عن الدومين). جرّب تشغيل المشروع على جهازك{' '}
              <code className="rounded bg-white px-1 py-0.5">npm run dev</code> لتجربة الاتصال الحقيقي —
              وبينما ذلك تستخدم الواجهات العامة ببيانات تجريبية.
            </div>
          )}
          <div className="flex gap-1 rounded-lg bg-nova-muted p-1" role="tablist">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setCheckEmail(false); }}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  mode === m ? 'bg-nova-primary text-white shadow-soft' : 'text-nova-text-secondary hover:text-nova-text'
                )}
              >
                {m === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </button>
            ))}
          </div>

          {checkEmail ? (
            <p className="rounded-lg bg-nova-muted p-3 text-sm leading-relaxed text-nova-text">
              تم إنشاء الحساب. افتح بريدك الإلكتروني لتأكيد الحساب، وبعدها سجّل الدخول.
            </p>
          ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); mode === 'signin' ? void handleSignIn() : void handleSignUp(); }}
          >
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="mb-1 block text-xs font-medium text-nova-text">الاسم الأول</label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="مثال: أحمد" />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-1 block text-xs font-medium text-nova-text">اسم العائلة</label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="مثال: حسن" />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-nova-text">البريد الإلكتروني</label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@novadental.com" />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-nova-text">كلمة المرور</label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {mode === 'signup' && (
              <p className="text-xs leading-relaxed text-nova-text-muted">
                التسجيل العام ينشئ حساب مريض فقط. حسابات الطاقم (طبيب / سكرتيرة) تُنشأ بواسطة مدير النظام.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'يرجى الانتظار…' : mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </Button>
          </form>
          )}

          <p className="text-center text-xs text-nova-text-muted">
            {mode === 'signin'
              ? 'معندكش حساب؟ اختار «إنشاء حساب» من فوق.'
              : 'أفراد الطاقم يسجلوا الدخول مباشرة.'}
          </p>

          <p className="text-center text-xs">
            <a href="/" className="font-semibold text-nova-primary hover:underline">
              ← العودة إلى موقع العيادة
            </a>
          </p>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
