'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { dentists } from '@/data/demo';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { dentistDisplayName, specialtyAr } from '@/lib/labels';

// ===== صفحة الأطباء =====

export function DoctorsPage() {
  const router = useRouter();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const specialties = useMemo(() => {
    const list = [...new Set(dentists.map((d) => d.specialty))];
    return ['all', ...list];
  }, []);

  const filteredDoctors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return dentists
      .filter((d) => d.isActive)
      .filter((dentist) => {
        const matchesSpecialty = selectedSpecialty === 'all' || dentist.specialty === selectedSpecialty;
        if (!matchesSpecialty) return false;
        if (!q) return true;
        const haystack = [
          dentist.firstName,
          dentist.lastName,
          dentist.specialty,
          specialtyAr(dentist.specialty),
          dentist.nameAr ?? '',
          dentist.bioAr ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [selectedSpecialty, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nova-text sm:text-4xl">أطباؤنا</h1>
          <p className="mt-3 max-w-xl text-nova-text-secondary">
            فريق من أطباء الأسنان المتخصصين — اختار طبيبك واحجز معه مباشرة.
          </p>
        </div>
        <Input
          type="search"
          placeholder="ابحث باسم الطبيب أو التخصص..."
          aria-label="ابحث عن طبيب"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية الأطباء حسب التخصص">
        {specialties.map((spec) => (
          <button
            key={spec}
            type="button"
            onClick={() => setSelectedSpecialty(spec)}
            aria-pressed={selectedSpecialty === spec}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              selectedSpecialty === spec
                ? 'bg-nova-primary text-white shadow-soft'
                : 'bg-nova-muted text-nova-text-secondary hover:bg-nova-border'
            )}
          >
            {spec === 'all' ? 'كل التخصصات' : specialtyAr(spec)}
          </button>
        ))}
      </div>

      {filteredDoctors.length === 0 ? (
        <EmptyState
          title="لا يوجد أطباء مطابقون"
          description="جرّب كلمة بحث مختلفة أو اختر تخصصًا آخر."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDoctors.map((dentist) => (
            <Card key={dentist.id} variant="interactive" className="flex flex-col overflow-hidden p-0">
              <div className="h-1.5 bg-gradient-to-r from-nova-primary to-nova-primary-dark" />
              <CardBody className="flex flex-1 flex-col p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-nova-primary-light text-lg font-bold text-nova-primary-dark">
                    {(dentist.nameAr ?? `${dentist.firstName} ${dentist.lastName}`).trim().charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold leading-tight text-nova-text">
                      {dentistDisplayName(dentist)}
                    </h2>
                    <p className="mt-1 text-sm text-nova-text-secondary">
                      {dentist.specialtyAr ?? specialtyAr(dentist.specialty)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 text-sm text-nova-text-secondary">
                  <span className="flex items-center gap-1" aria-label={`التقييم ${dentist.rating} من 5`}>
                    <span className="text-amber-500" aria-hidden="true">★</span>
                    <span className="font-semibold text-nova-text">{dentist.rating}</span>
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>{dentist.patientCount} مريض</span>
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-nova-text-muted">
                  {dentist.bioAr ?? dentist.bio}
                </p>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <Badge variant="success" dot>
                    متاح للحجز
                  </Badge>
                  <Button size="sm" onClick={() => router.push(`/book?doctor=${dentist.id}`)}>
                    احجز معه
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
