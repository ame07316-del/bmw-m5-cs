'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'nova-last-booking';

interface StoredBooking {
  reference: string;
  service?: string;
  dentist?: string;
  date?: string;
  time?: string;
  demo?: boolean;
}

function formatArabicDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('ar-EG-u-nu-latn', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// صفحة تأكيد الحجز
export function BookingSuccess() {
  const router = useRouter();
  const [booking, setBooking] = useState<StoredBooking | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Supports both the old plain-id format and the newer JSON payload.
        if (raw.trim().startsWith('{')) {
          setBooking(JSON.parse(raw) as StoredBooking);
        } else {
          setBooking({ reference: raw });
        }
      }
    } catch {
      setBooking(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  const rows = [
    { label: 'رقم الحجز', value: booking?.reference ? `#${booking.reference.slice(0, 8).toUpperCase()}` : 'تم التأكيد' },
    { label: 'الخدمة', value: booking?.service },
    { label: 'الطبيب', value: booking?.dentist },
    { label: 'التاريخ', value: formatArabicDate(booking?.date) },
    { label: 'الوقت', value: booking?.time },
    { label: 'الدفع', value: 'عند العيادة' },
    { label: 'الإلغاء', value: 'قبل ٢٤ ساعة' },
  ].filter((row) => row.value);

  return (
    <div className="mx-auto max-w-lg">
      <Card variant="elevated" className="overflow-hidden">
        <CardBody className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-nova-text">تم حجز الموعد بنجاح</h1>
          <p className="mt-3 text-sm leading-relaxed text-nova-text-secondary">
            وصلنا طلب الحجز وتم تسجيله في جدول العيادة. لو احتجت تعديل أو إلغاء، اتصل بالعيادة
            قبل ٢٤ ساعة من الموعد.
          </p>

          {loaded && (
            <dl className="mt-6 space-y-3 rounded-xl bg-nova-muted/40 p-4 text-start">
              {rows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <dt className="text-sm text-nova-text-muted">{row.label}</dt>
                  <dd className="text-sm font-semibold text-nova-text">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {booking?.demo && (
            <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              وضع العرض التجريبي: الحجز لم يُحفظ في قاعدة بيانات فعلية بعد ربط Supabase.
            </p>
          )}

          <p className="mt-4 rounded-lg border border-dashed border-nova-border bg-nova-muted/30 p-3 text-xs text-nova-text-secondary">
            💰 الدفع يتم عند وصولك إلى العيادة (كاش أو بطاقة).
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button className="w-full" onClick={() => router.push('/')}>
              العودة للرئيسية
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/book')}>
              حجز موعد آخر
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
