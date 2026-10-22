'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { services as allServices } from '@/data/demo';
import { useRouter } from 'next/navigation';
import { cn, formatPrice } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

// ===== صفحة الخدمات =====

type ServiceItem = (typeof allServices)[number];

const nameOf = (s: ServiceItem) => s.nameAr ?? s.name;
const descOf = (s: ServiceItem) => s.descriptionAr ?? s.description;
const catOf = (s: ServiceItem) => s.categoryAr ?? s.category;

const categoryColors: Record<string, string> = {
  وقائي: 'bg-green-100 text-green-700',
  ترميمي: 'bg-blue-100 text-blue-700',
  تجميلي: 'bg-pink-100 text-pink-700',
  تقويم: 'bg-violet-100 text-violet-700',
  'جراحة الفم': 'bg-red-100 text-red-700',
  طوارئ: 'bg-amber-100 text-amber-700',
};

export function ServicesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = useMemo(() => {
    const list = [...new Set(allServices.map(catOf))];
    return ['all', ...list];
  }, []);

  const filteredServices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allServices.filter((service) => {
      const matchesCategory = selectedCategory === 'all' || catOf(service) === selectedCategory;
      if (!q) return matchesCategory;
      const haystack = [
        service.name,
        service.nameAr ?? '',
        service.description,
        service.descriptionAr ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return matchesCategory && haystack.includes(q);
    });
  }, [selectedCategory, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nova-text sm:text-4xl">خدماتنا</h1>
          <p className="mt-3 max-w-xl text-nova-text-secondary">
            كل خدمات طب الأسنان تحت سقف واحد — أسعار واضحة، ومدة محددة لكل جلسة، والدفع عند العيادة.
          </p>
        </div>
        <Input
          type="search"
          placeholder="ابحث عن خدمة..."
          aria-label="ابحث عن خدمة"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية الخدمات حسب التخصص">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            aria-pressed={selectedCategory === cat}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              selectedCategory === cat
                ? 'bg-nova-primary text-white shadow-soft'
                : 'bg-nova-muted text-nova-text-secondary hover:bg-nova-border'
            )}
          >
            {cat === 'all' ? 'الكل' : cat}
          </button>
        ))}
      </div>

      {filteredServices.length === 0 ? (
        <EmptyState
          title="لا توجد خدمات مطابقة"
          description="جرّب كلمة بحث مختلفة أو اختر تصنيفًا آخر."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <Card key={service.id} variant="interactive" className="flex flex-col overflow-hidden p-0">
              <div className="h-1.5 bg-gradient-to-r from-nova-primary to-nova-secondary" />
              <CardBody className="flex flex-1 flex-col p-6">
                <Badge
                  variant="outline"
                  className={cn('mb-3 self-start border-0', categoryColors[catOf(service)] ?? 'bg-nova-muted text-nova-text-secondary')}
                >
                  {catOf(service)}
                </Badge>
                <h2 className="text-lg font-bold text-nova-text">{nameOf(service)}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-nova-text-secondary">{descOf(service)}</p>

                <div className="mt-5 flex items-end justify-between border-t border-nova-border pt-4">
                  <div>
                    <p className="text-xs text-nova-text-muted">السعر</p>
                    <p className="text-xl font-bold text-nova-primary">{formatPrice(service.price)}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-nova-text-muted">المدة</p>
                    <p className="text-sm font-semibold text-nova-text">{service.durationMinutes} دقيقة</p>
                  </div>
                </div>

                <Button className="mt-4 w-full" onClick={() => router.push(`/book?service=${service.id}`)}>
                  احجز الآن
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
