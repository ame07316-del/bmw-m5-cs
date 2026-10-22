'use client';

import { PublicLayout } from '@/components/layout/PublicLayout';
import {
  HeroSection,
  FeaturesSection,
  ServicesPreviewSection,
  DoctorsPreviewSection,
  CTASection,
} from '@/components/patient/LandingPage';

export default function LandingPage() {
  return (
    <PublicLayout>
      <div className="space-y-16 md:space-y-24">
        <HeroSection />
        <FeaturesSection />
        <ServicesPreviewSection />
        <DoctorsPreviewSection />
        <CTASection />
      </div>
    </PublicLayout>
  );
}
