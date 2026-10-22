'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

/**
 * معرض العيادة — صور محلية داخل /public/gallery
 *
 * الصفحة كانت فاضية تمامًا لأنها كانت تعتمد على avatarUrl للأطباء
 * (وهو غير موجود في البيانات)، فأصبحت تعرض حالة "لا توجد صور".
 * الآن تعرض صور العيادة الفعلية مع عارض (lightbox) بسيط.
 */

interface GalleryPhoto {
  src: string;
  alt: string;
  caption: string;
  span?: string;
}

const PHOTOS: GalleryPhoto[] = [
  {
    src: '/gallery/clinic-reception.jpg',
    alt: 'استقبال عيادة نوفا لطب الأسنان',
    caption: 'استقبال العيادة',
    span: 'sm:col-span-2',
  },
  {
    src: '/gallery/treatment-room.jpg',
    alt: 'غرفة العلاج وغرفة الأشعة داخل العيادة',
    caption: 'غرفة العلاج',
  },
  {
    src: '/gallery/smile-care.jpg',
    alt: 'نتيجة تبييض وتجميل الأسنان',
    caption: 'نتيجة تبييض',
  },
];

export function GalleryGrid() {
  const [active, setActive] = useState<number | null>(null);

  // Close the lightbox with Escape and lock background scrolling while open.
  useEffect(() => {
    if (active === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-nova-text sm:text-4xl">المعرض</h1>
        <p className="mt-3 text-nova-text-secondary">
          لمحة من داخل العيادة وبعض نتائج العلاج. الصور توضيحية لأغراض العرض.
        </p>
      </div>

      <div className="grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PHOTOS.map((photo, index) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`عرض صورة: ${photo.caption}`}
            className={cn(
              'group relative overflow-hidden rounded-card border border-nova-border bg-nova-muted text-start focus-visible:ring-2 focus-visible:ring-nova-primary',
              photo.span
            )}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-nova-primary-dark/80 to-transparent p-4 pt-10 text-sm font-semibold text-white">
              {photo.caption}
            </span>
          </button>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-sm text-nova-text-secondary">
          <span className="font-bold text-nova-text">ملاحظة:</span> جميع الصور توضيحية للعرض التجريبي
          ولا تمثل حالات مرضى حقيقية.
        </p>
      </Card>

      {active !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={PHOTOS[active].caption}
          className="fixed inset-0 z-50 flex items-center justify-center bg-nova-primary-dark/80 p-4"
          onClick={() => setActive(null)}
        >
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-black">
              <Image
                src={PHOTOS[active].src}
                alt={PHOTOS[active].alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-white">
              <p className="text-sm font-semibold">{PHOTOS[active].caption}</p>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-lg border border-white/40 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
