'use client';

import { Suspense } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { BookingFlow } from '@/components/patient/BookingFlow';

export default function BookPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={<div className="flex min-h-[60vh] items-center justify-center text-nova-text-muted">جارٍ تحميل الحجز...</div>}
      >
        <BookingFlow />
      </Suspense>
    </PublicLayout>
  );
}
