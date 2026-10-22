'use client';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { ServicesPage } from '@/components/patient/ServicesPage';

export default function ServicesPageRoute() {
  return (
    <PublicLayout>
      <ServicesPage />
    </PublicLayout>
  );
}
