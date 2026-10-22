'use client';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';

export default function GalleryPage() {
  return (
    <PublicLayout>
      <GalleryGrid />
    </PublicLayout>
  );
}
