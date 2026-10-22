'use client';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { DoctorsPage } from '@/components/patient/DoctorsPage';

export default function DoctorsPageRoute() {
  return (
    <PublicLayout>
      <DoctorsPage />
    </PublicLayout>
  );
}
