'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Avatar } from '@/components/dental/AvatarsAndMore';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatPrice, formatTimeAr } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { notify } from '@/components/ui/Notification';
import { getPublicCatalog, getDoctorAvailability, getAvailableSlots, bookAppointment } from '@/app/actions';
import { dentists as demoDentists, services as demoServices, schedules as demoSchedules } from '@/data/demo';
import type { Service, Dentist, Schedule } from '@/lib/supabase/types';
import { dentistDisplayName, dentistNameAr } from '@/lib/labels';

// ===== ترجمة الأسماء للعربية — الموقع عربي 100% =====
const serviceArMap: Record<string, { name: string; category: string }> = {
  'General Check-up': { name: 'فحص عام شامل', category: 'وقائي' },
  'Deep Cleaning': { name: 'تنظيف عميق', category: 'وقائي' },
  'Teeth Whitening': { name: 'تبييض الأسنان', category: 'تجميلي' },
  'Dental Implant': { name: 'زراعة الأسنان', category: 'ترميمي' },
  'Root Canal': { name: 'علاج الجذور', category: 'ترميمي' },
  'Dental Filling': { name: 'حشو الأسنان', category: 'ترميمي' },
  'Braces/Invisalign': { name: 'تقويم الأسنان', category: 'تقويم' },
  'Wisdom Tooth Extraction': { name: 'خلع ضرس العقل', category: 'جراحة الفم' },
  'Emergency Consultation': { name: 'استشارة طارئة', category: 'طوارئ' },
};
const specialtyArMap: Record<string, string> = {
  'Orthodontics': 'تقويم الأسنان',
  'Oral Surgery': 'جراحة الفم',
  'Cosmetic Dentistry': 'تجميل الأسنان',
  'General Dentistry': 'طب أسنان عام',
  'Preventive': 'وقائي',
  'Restorative': 'ترميمي',
  'Cosmetic': 'تجميلي',
  'Emergency': 'طوارئ',
};
function arServiceName(s: Service): string {
  return (s as any).nameAr ?? serviceArMap[s.name]?.name ?? s.name;
}
function arServiceCat(s: Service): string {
  return (s as any).categoryAr ?? serviceArMap[s.name]?.category ?? specialtyArMap[s.category] ?? s.category;
}
function arSpecialty(s: string): string {
  return specialtyArMap[s] ?? s;
}

type AvailabilitySlot = { start_time: string; end_time: string };



// Booking flow data types
interface BookingData {
  step: number;
  serviceId: string;
  serviceName: string;
  dentistId: string;
  dentistName: string;
  preferredDentist: boolean;
  date: string;
  time: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reason: string;
  complaint: string;
  notes: string;
}

// Initial booking state
const initialBooking: BookingData = {
  step: 1,
  serviceId: '',
  serviceName: '',
  dentistId: '',
  dentistName: '',
  preferredDentist: false,
  date: '',
  time: '',
  patientName: '',
  patientEmail: '',
  patientPhone: '',
  reason: '',
  complaint: '',
  notes: '',
};

export function BookingFlow() {
  const { language, direction } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [slotsByDentist, setSlotsByDentist] = useState<Record<string, AvailabilitySlot[]>>({});
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingData>(initialBooking);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill service if passed via URL
  const prefilledService = searchParams.get('service');
  const prefilledDentist = searchParams.get('doctor');

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    const res = await getPublicCatalog();
    if (res.ok) {
      setServices(res.data.services);
      setDentists(res.data.dentists);

      // Load working schedules for every active dentist (real availability).
      const scheduleResults = await Promise.all(
        res.data.dentists.map((d) => getDoctorAvailability(d.id))
      );
      setSchedules(scheduleResults.flatMap((r) => (r.ok ? r.data : [])));
    } else {
      // Supabase غير متصل أو الكاتالوج فشل → وضع العرض التجريبي:
      // نكمّل التصفح ببيانات الديمو بدل ما نعلّق المستخدم على رسالة خطأ.
      setServices(demoServices as unknown as Service[]);
      setDentists(demoDentists as unknown as Dentist[]);
      setSchedules(demoSchedules as unknown as Schedule[]);
      notify('info', 'وضع العرض التجريبي', 'يتم عرض بيانات تجريبية — الحجز الفعلي يتطلب ربط Supabase.');
    }
    setCatalogLoading(false);
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  // Pre-fill from URL once catalog is loaded.
  // Accepts live UUIDs AND legacy demo ids (dentist-001…) by matching names.
  useEffect(() => {
    if (prefilledDentist && dentists.length > 0) {
      const dentist =
        dentists.find((d) => d.id === prefilledDentist) ??
        (() => {
          const demo = demoDentists.find((d) => d.id === prefilledDentist);
          if (!demo) return undefined;
          const full = `${demo.firstName} ${demo.lastName}`.toLowerCase();
          return dentists.find((d) => `${d.firstName} ${d.lastName}`.toLowerCase() === full);
        })();
      if (dentist) {
        setBooking((prev) => ({
          ...prev,
          dentistId: dentist.id,
          dentistName: dentistNameAr(dentist),
          preferredDentist: false,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledDentist, dentists]);

  useEffect(() => {
    if (prefilledService && services.length > 0) {
      // Accepts live UUIDs AND legacy demo ids (service-001…) by matching names.
      const service =
        services.find((s) => s.id === prefilledService) ??
        (() => {
          const demo = demoServices.find((s) => s.id === prefilledService);
          if (!demo) return undefined;
          return services.find((s) => s.name.toLowerCase() === demo.name.toLowerCase());
        })();
      if (service) {
        setBooking((prev) => ({ ...prev, serviceId: service.id, serviceName: service.name }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledService, services]);

  // Load available slots whenever service/dentist/date changes
  useEffect(() => {
    if (!booking.serviceId || !booking.date) {
      setSlotsByDentist({});
      return;
    }

    let cancelled = false;
    // A selected dentist restricts the lookup; otherwise ("any dentist" mode
    // or nothing chosen yet) fan out to all dentists.
    const targets = booking.dentistId ? [booking.dentistId] : dentists.map((d) => d.id);

    const load = async () => {
      setSlotsLoading(true);
      const results = await Promise.all(
        targets.map((dentistId) => getAvailableSlots(dentistId, booking.serviceId, booking.date))
      );
      if (cancelled) return;
      const map: Record<string, AvailabilitySlot[]> = {};
      let rpcFailed = false;
      results.forEach((res, i) => {
        if (res.ok && res.data.length > 0) map[targets[i]] = res.data;
        if (!res.ok) rpcFailed = true;
      });
      // وضع الديمو: RPC غير متاح — نولّد المواعيد محليًا من جداول العمل الديمو
      // بنفس قواعد الحجز الفعلي (خطوات 30 دقيقة، مدة الخدمة، باستثناء البريك).
      if (rpcFailed && Object.keys(map).length === 0) {
        const service = services.find((s) => s.id === booking.serviceId);
        const duration = Math.max(15, Number(service?.durationMinutes ?? 30));
        for (const dentistId of targets) {
          const daySchedules = schedules.filter(
            (s) => s.dentistId === dentistId && s.date === booking.date && s.isAvailable
          );
          const slots: AvailabilitySlot[] = [];
          for (const sch of daySchedules) {
            const [sh, sm] = sch.startTime.split(':').map(Number);
            const [eh, em] = sch.endTime.split(':').map(Number);
            const bs = sch.breakStart ? sch.breakStart.split(':').map(Number) : null;
            const be = sch.breakEnd ? sch.breakEnd.split(':').map(Number) : null;
            const bsMin = bs ? bs[0] * 60 + bs[1] : null;
            const beMin = be ? be[0] * 60 + be[1] : null;
            for (let t = sh * 60 + sm; t + duration <= eh * 60 + em; t += 30) {
              // تخطّي أي slot يتراكب مع فترة الراحة
              if (bsMin !== null && beMin !== null && t < beMin && t + duration > bsMin) continue;
              const fmt = (mins: number) =>
                `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
              slots.push({ start_time: fmt(t), end_time: fmt(t + duration) });
            }
          }
          if (slots.length > 0) map[dentistId] = slots;
        }
      }
      setSlotsByDentist(map);
      setSlotsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [booking.serviceId, booking.dentistId, booking.preferredDentist, booking.date, dentists, services, schedules]);

  // Dates that are actually in the selected dentist's schedule (or union across dentists)
  const availableDates = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const source = booking.dentistId
      ? schedules.filter((s) => s.dentistId === booking.dentistId)
      : schedules;
    return [...new Set(source.filter((s) => s.date >= today).map((s) => s.date))].sort();
  }, [schedules, booking.dentistId]);

  // Filter available dentists based on service
  const availableDentists = useMemo(() => {
    if (!booking.serviceId) return dentists;
    const service = services.find((s) => s.id === booking.serviceId);
    if (!service) return dentists;
    const byCategory = dentists.filter((d) => d.specialty === service.category);
    return byCategory.length > 0 ? byCategory : dentists;
  }, [booking.serviceId, services, dentists]);

  // Filter available time slots for selected date and dentist
  const availableTimeSlots = useMemo(() => {
    const all = Object.values(slotsByDentist).flat();
    const seen = new Set<string>();
    const deduped: AvailabilitySlot[] = [];
    for (const slot of all) {
      if (!seen.has(slot.start_time)) {
        seen.add(slot.start_time);
        deduped.push(slot);
      }
    }
    return deduped;
  }, [slotsByDentist]);

  // Map a slot start time back to the dentist that offers it (used when "Any dentist" is chosen).
  const dentistBySlotTime = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [dentistId, slots] of Object.entries(slotsByDentist)) {
      for (const s of slots) if (!map[s.start_time]) map[s.start_time] = dentistId;
    }
    return map;
  }, [slotsByDentist]);

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Service
        if (!booking.serviceId) newErrors.serviceId = 'اختر الخدمة أولًا';
        break;
      case 2: // Dentist
        if (!booking.dentistId && !booking.preferredDentist) newErrors.dentistId = 'اختر طبيبًا أو «أي طبيب متاح»';
        break;
      case 3: // Date
        if (!booking.date) newErrors.date = 'اختر التاريخ';
        break;
      case 4: // Time
        if (!booking.time) newErrors.time = 'اختر وقت الموعد';
        break;
      case 5: // Patient info
        if (!booking.patientName.trim()) newErrors.patientName = 'الاسم مطلوب';
        if (!booking.patientPhone.trim()) newErrors.patientPhone = 'رقم الهاتف مطلوب';
        if (!booking.patientEmail.trim()) newErrors.patientEmail = 'البريد الإلكتروني مطلوب';
        break;
      case 6: // Review
        // All previous steps validated
        break;
      case 7: // Confirm
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToStep = (step: number) => {
    // Allow going backward to any completed step, or forward only one step.
    if (step <= booking.step || step === booking.step + 1) {
      if (validateStep(booking.step)) {
        setBooking((prev) => ({ ...prev, step }));
      }
    }
  };

  const handleNext = () => {
    if (validateStep(booking.step)) {
      const nextStep = booking.step + 1;
      if (nextStep <= 7) {
        setBooking((prev) => ({ ...prev, step: nextStep }));
      }
    }
  };

  const handleBack = () => {
    const prevStep = booking.step - 1;
    if (prevStep >= 1) {
      setBooking((prev) => ({ ...prev, step: prevStep }));
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    setBooking((prev) => ({
      ...prev,
      serviceId,
      serviceName: service?.name || '',
      dentistId: '',
      dentistName: '',
      preferredDentist: false,
    }));
  };

  const handleDentistSelect = (dentistId: string) => {
    const dentist = dentists.find((d) => d.id === dentistId);
    const name = dentist ? dentistNameAr(dentist) : '';
    setBooking((prev) => ({
      ...prev,
      dentistId,
      dentistName: name,
    }));
  };

  const handleSubmitBooking = async () => {
    if (!booking.serviceId || !booking.date || !booking.time || submitting) return;

    // Validate patient info before submission.
    if (!booking.patientName.trim() || !booking.patientEmail.trim() || !booking.patientPhone.trim()) {
      notify('error', 'بيانات ناقصة', 'أكمل بيانات المريض للمتابعة.');
      return;
    }
    if (!booking.patientEmail.trim().includes('@')) {
      notify('error', 'بريد غير صحيح', 'أدخل بريدًا إلكترونيًا صحيحًا.');
      return;
    }

    // Resolve the concrete dentist when "أي طبيب متاح" was chosen.
    const resolvedDentistId =
      booking.dentistId || dentistBySlotTime[booking.time] || dentists[0]?.id;
    if (!resolvedDentistId) {
      notify('error', 'تعذّر الحجز', 'لا يوجد طبيب متاح في هذا الوقت — اختر وقتًا آخر.');
      return;
    }

    setSubmitting(true);
    const [firstName, ...rest] = booking.patientName.trim().split(' ');
    const res = await bookAppointment({
      serviceId: booking.serviceId,
      dentistId: resolvedDentistId,
      date: booking.date,
      startTime: booking.time,
      treatmentType: booking.serviceName || 'General Consultation',
      notes:
        [
          booking.reason && `Reason: ${booking.reason}`,
          booking.complaint && `Complaint: ${booking.complaint}`,
          booking.notes && `Notes: ${booking.notes}`,
        ]
          .filter(Boolean)
          .join('\n') || undefined,
      patient: {
        firstName: firstName || 'Guest',
        lastName: rest.join(' '),
        email: booking.patientEmail.trim(),
        phone: booking.patientPhone.trim(),
      },
    });
    setSubmitting(false);

    if (res.ok) {
      if (res.data.demo) {
        notify(
          'info',
          language === 'ar' ? 'وضع العرض التجريبي' : 'Demo Mode',
          language === 'ar'
            ? 'تمت محاكاة الحجز بنجاح — لن يُحفظ فعليًا حتى ربط Supabase.'
            : 'Booking simulated — it will not be saved until Supabase is connected.'
        );
      } else {
        notify(
          'success',
          'تم حجز الموعد',
          `${selectedService ? arServiceName(selectedService) : booking.serviceName} — ${formattedDate} الساعة ${formatTimeAr(booking.time)}. الدفع عند العيادة.`
        );
      }
      try {
        sessionStorage.setItem(
          'nova-last-booking',
          JSON.stringify({
            reference: res.data.appointmentId,
            service: arServiceName(
              services.find((item) => item.id === booking.serviceId) ?? ({ name: booking.serviceName } as Service)
            ),
            dentist: booking.dentistName || 'أي طبيب متاح',
            date: booking.date,
            time: formatTimeAr(booking.time),
            demo: Boolean(res.data.demo),
          })
        );
      } catch {
        // storage unavailable — success page falls back gracefully
      }
      router.push('/booking-success');
    } else {
      notify('error', 'تعذّر إتمام الحجز', res.error);
    }
  };

  const stepTitles = [
    '',
    'اختر الخدمة',
    'اختر الطبيب',
    'اختر التاريخ',
    'اختر الوقت',
    'بيانات المريض',
    'مراجعة التفاصيل',
    'التأكيد',
  ];

  const progressPercent = ((booking.step - 1) / 6) * 100;

  const selectedService = booking.serviceId
    ? services.find((item) => item.id === booking.serviceId)
    : undefined;

  const formattedDate = booking.date
    ? new Date(`${booking.date}T00:00:00`).toLocaleDateString('ar-EG-u-nu-latn', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const reasonLabels: Record<string, string> = {
    checkup: 'فحص روتيني',
    pain: 'ألم في الأسنان',
    cosmetic: 'تجميل الأسنان',
    orthodontics: 'تقويم',
    emergency: 'طارئ',
    other: 'أخرى',
  };
  const reasonLabel = reasonLabels[booking.reason] ?? '';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-nova-text">احجز موعدك</h1>
        <p className="mx-auto mt-2 max-w-xl text-nova-text-secondary">
          سبع خطوات بسيطة: اختار الخدمة، الطبيب، التاريخ والوقت، وسيب بياناتك — الدفع عند العيادة.
        </p>
      </div>

      {/* Progress bar */}
      <div className="overflow-hidden rounded-full bg-nova-muted">
        <div
          className="h-2 rounded-full bg-nova-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between gap-1">
        {stepTitles.filter((_, i) => i > 0).map((title, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === booking.step;
          const isCompleted = stepNum < booking.step;
          return (
            <button
              key={stepNum}
              onClick={() => goToStep(stepNum)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                isActive ? 'bg-nova-primary text-white' :
                isCompleted ? 'bg-green-100 text-green-700' :
                'bg-nova-muted text-nova-text-muted'
              )}
            >
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                isActive ? 'bg-nova-primary text-white' :
                isCompleted ? 'bg-green-500 text-white' :
                'bg-nova-border text-nova-text-muted'
              )}>
                {isCompleted ? '✓' : stepNum}
              </div>
              <span className="hidden sm:inline">{title}</span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <Card variant="elevated">
        <CardBody className="p-6">
          {/* Step 1: Select Service */}
          {booking.step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-nova-text">{stepTitles[1]}</h2>
              {selectedService && (
                <div className="flex items-center gap-2 rounded-lg bg-nova-primary-light p-3 text-sm font-semibold text-nova-primary-dark">
                  <span aria-hidden="true">✓</span>
                  <span>{arServiceName(selectedService)} — تم اختيارها من صفحة الخدمات</span>
                </div>
              )}
              {catalogLoading ? (
                <div className="rounded-lg bg-nova-muted/40 p-8 text-center text-sm text-nova-text-muted">
                  {language === 'ar' ? 'جارٍ تحميل الخدمات...' : 'جارٍ تحميل الخدمات...'}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service.id)}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-4 text-left transition-all hover:shadow-soft',
                      booking.serviceId === service.id
                        ? 'border-nova-primary bg-nova-primary-light'
                        : 'border-nova-border bg-nova-surface hover:border-nova-primary/50'
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold text-nova-text">{arServiceName(service)}</p>
                      <p className="text-xs text-nova-text-muted">{arServiceCat(service)} • {service.durationMinutes} دقيقة</p>
                    </div>
                    <span className="text-sm font-bold text-nova-primary">{formatPrice(service.price)}</span>
                  </button>
                ))}
                </div>
              )}
              {errors.serviceId && <p className="text-sm text-nova-error">{errors.serviceId}</p>}
            </div>
          )}

          {/* Step 2: Select Dentist */}
          {booking.step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-nova-text">{stepTitles[2]}</h2>
              <p className="text-sm text-nova-text-muted">
                {language === 'ar' ? 'اختر طبيبك المفضل أو اختر "أي طبيب متاح"' : 'اختر طبيبك المفضل أو "أي طبيب متاح"'}
              </p>
              <div className="space-y-3">
                {/* Any dentist option */}
                <button
                  onClick={() => { setBooking((prev) => ({ ...prev, dentistId: '', preferredDentist: true, dentistName: '' })); }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all',
                    booking.preferredDentist && !booking.dentistId
                      ? 'border-nova-primary bg-nova-primary-light'
                      : 'border-nova-border bg-nova-surface'
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    booking.preferredDentist && !booking.dentistId ? 'bg-nova-primary text-white' : 'bg-nova-muted'
                  )}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-nova-text">أي طبيب متاح</p>
                    <p className="text-xs text-nova-text-muted">هنرشح لك أقرب طبيب متاح في الموعد اللي تختاره</p>
                  </div>
                </button>

                {availableDentists.map((dentist) => {
                  const isSelected = booking.dentistId === dentist.id;
                  return (
                    <button
                      key={dentist.id}
                      onClick={() => handleDentistSelect(dentist.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all',
                        isSelected ? 'border-nova-primary bg-nova-primary-light' : 'border-nova-border bg-nova-surface'
                      )}
                    >
                      <Avatar name={`${dentist.firstName} ${dentist.lastName}`} size="md" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-nova-text">{dentistDisplayName(dentist)}</p>
                        <p className="text-xs text-nova-text-muted">{arSpecialty(dentist.specialty)}</p>
                      </div>
                      {isSelected && <div className="flex h-6 w-6 items-center justify-center rounded-full bg-nova-primary text-white">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>}
                    </button>
                  );
                })}
              </div>
              {errors.dentistId && <p className="text-sm text-nova-error">{errors.dentistId}</p>}
            </div>
          )}

          {/* Step 3: Select Date */}
          {booking.step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-nova-text">{stepTitles[3]}</h2>
              {availableDates.length === 0 ? (
                <div className="rounded-lg bg-amber-50 p-4 text-center text-sm text-amber-700">
                  {language === 'ar'
                    ? 'لا توجد مواعيد متاحة حاليًا — جرّب تغيّر الدكتور أو راجعنا لاحقًا.'
                    : 'لا توجد مواعيد متاحة حاليًا — جرّب تغيّر الدكتور أو راجعنا لاحقًا.'}
                </div>
              ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {availableDates.map((date) => {
                  const selectedDate = new Date(`${date}T00:00:00`);
                  const dayName = selectedDate.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long' });
                  const dayNumber = selectedDate.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' });
                  const isSelected = booking.date === date;
                  return (
                    <button
                      key={date}
                      onClick={() => setBooking((prev) => ({ ...prev, date, time: '' }))}
                      className={cn(
                        'rounded-lg border p-3 text-center transition-all hover:shadow-soft',
                        isSelected ? 'border-nova-primary bg-nova-primary-light' : 'border-nova-border bg-nova-surface'
                      )}
                    >
                      <p className="text-sm font-bold text-nova-text">{dayName}</p>
                      <p className="mt-0.5 text-[11px] text-nova-text-muted">{dayNumber}</p>
                    </button>
                  );
                })}
              </div>
              )}
              {errors.date && <p className="text-sm text-nova-error">{errors.date}</p>}
            </div>
          )}

          {/* Step 4: Select Time */}
          {booking.step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-nova-text">{stepTitles[4]}</h2>
              <p className="text-sm text-nova-text-muted">التاريخ المختار: {formattedDate}</p>
              {slotsLoading ? (
                <div className="rounded-lg bg-nova-muted/40 p-4 text-center text-sm text-nova-text-muted">
                  {language === 'ar' ? 'جارٍ تحميل المواعيد المتاحة...' : 'جارٍ تحميل المواعيد المتاحة...'}
                </div>
              ) : availableTimeSlots.length === 0 ? (
                <div className="rounded-lg bg-amber-50 p-4 text-center text-sm text-amber-700">
                  {language === 'ar' ? 'لا توجد مواعيد متاحة في هذا التاريخ. اختر تاريخاً آخر.' : 'لا توجد مواعيد متاحة في هذا التاريخ. اختر تاريخاً آخر.'}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {availableTimeSlots.map((slot) => {
                    const time = slot.start_time;
                    const isSelected = booking.time === time;
                    const slotDentist = booking.dentistId || dentistBySlotTime[time];
                    const slotDentistRow = slotDentist ? dentists.find((d) => d.id === slotDentist) : undefined;
                    const slotDentistName = slotDentistRow ? dentistDisplayName(slotDentistRow) : '';
                    return (
                      <button
                        key={time}
                        onClick={() =>
                          setBooking((prev) => ({
                            ...prev,
                            time,
                            dentistId: prev.dentistId || dentistBySlotTime[time] || '',
                          }))
                        }
                        className={cn(
                          'rounded-lg border p-3 text-center transition-all hover:shadow-soft',
                          isSelected ? 'border-nova-primary bg-nova-primary-light' : 'border-nova-border bg-nova-surface'
                        )}
                      >
                        <p className="text-sm font-semibold text-nova-text">{formatTimeAr(time)}</p>
                        {booking.preferredDentist && slotDentistName && (
                          <p className="mt-1 truncate text-[10px] text-nova-text-muted">{slotDentistName}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.time && <p className="text-sm text-nova-error">{errors.time}</p>}
            </div>
          )}

          {/* Step 5: Patient Info */}
          {booking.step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-nova-text">{stepTitles[5]}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-nova-text">
                    {language === 'ar' ? 'الاسم الكامل' : 'Full Name'} *
                  </label>
                  <Input
                    type="text"
                    required
                    value={booking.patientName}
                    onChange={(e) => setBooking((prev) => ({ ...prev, patientName: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                    className={errors.patientName ? 'border-nova-error' : ''}
                  />
                  {errors.patientName && <p className="text-sm text-nova-error">{errors.patientName}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-nova-text">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'} *
                  </label>
                  <Input
                    type="tel"
                    required
                    value={booking.patientPhone}
                    onChange={(e) => setBooking((prev) => ({ ...prev, patientPhone: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل رقم هاتفك' : 'Enter your phone number'}
                    className={errors.patientPhone ? 'border-nova-error' : ''}
                  />
                  {errors.patientPhone && <p className="text-sm text-nova-error">{errors.patientPhone}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-nova-text">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'} *
                  </label>
                  <Input
                    type="email"
                    required
                    value={booking.patientEmail}
                    onChange={(e) => setBooking((prev) => ({ ...prev, patientEmail: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                    className={errors.patientEmail ? 'border-nova-error' : ''}
                  />
                  {errors.patientEmail && <p className="text-sm text-nova-error">{errors.patientEmail}</p>}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-nova-text">
                  {language === 'ar' ? 'سبب الزيارة' : 'Reason for Visit'}
                </label>
                <Select
                  value={booking.reason}
                  onChange={(e) => setBooking((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full"
                >
                  <option value="">{language === 'ar' ? 'اختر السبب' : 'Select reason'}</option>
                  <option value="checkup">{language === 'ar' ? 'فحص روتيني' : 'Routine Check-up'}</option>
                  <option value="pain">{language === 'ar' ? 'ألم في الأسنان' : 'Tooth Pain'}</option>
                  <option value="cosmetic">{language === 'ar' ? 'تجميل الأسنان' : 'Cosmetic'}</option>
                  <option value="orthodontics">{language === 'ar' ? 'تقويم' : 'Orthodontics'}</option>
                  <option value="emergency">{language === 'ar' ? 'طوارئ' : 'Emergency'}</option>
                  <option value="other">{language === 'ar' ? 'أخرى' : 'Other'}</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-nova-text">
                  {language === 'ar' ? 'الشكوى الرئيسية' : 'Main Complaint'}
                </label>
                <Textarea
                  rows={3}
                  value={booking.complaint}
                  onChange={(e) => setBooking((prev) => ({ ...prev, complaint: e.target.value }))}
                  placeholder={language === 'ar' ? 'صف شكواك الرئيسية' : 'Describe your main complaint'}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-nova-text">
                  {language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
                </label>
                <Textarea
                  rows={2}
                  value={booking.notes}
                  onChange={(e) => setBooking((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={language === 'ar' ? 'أي ملاحظات إضافية' : 'Any additional notes'}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {booking.step === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-nova-text">{stepTitles[6]}</h2>
              <div className="space-y-4 rounded-lg bg-nova-muted/30 p-4">
                {[
                  { label: language === 'ar' ? 'الخدمة' : 'Service', value: (serviceArMap[booking.serviceName]?.name ?? booking.serviceName) },
                  { label: language === 'ar' ? 'الطبيب' : 'Dentist', value: booking.dentistName || 'أي طبيب متاح' },
                  { label: language === 'ar' ? 'التاريخ' : 'Date', value: formattedDate },
                  { label: language === 'ar' ? 'الوقت' : 'Time', value: booking.time ? formatTimeAr(booking.time) : '' },
                  { label: language === 'ar' ? 'الاسم' : 'Name', value: booking.patientName },
                  { label: language === 'ar' ? 'البريد الإلكتروني' : 'Email', value: booking.patientEmail },
                  { label: language === 'ar' ? 'الهاتف' : 'Phone', value: booking.patientPhone },
                  { label: language === 'ar' ? 'سبب الزيارة' : 'Reason', value: reasonLabel || 'غير محدد' },
                ].map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-sm text-nova-text-muted">{item.label}</span>
                    <span className="text-sm font-semibold text-nova-text">{item.value}</span>
                  </div>
                ))}
                {booking.complaint && (
                  <div className="flex justify-between">
                    <span className="text-sm text-nova-text-muted">{language === 'ar' ? 'الشكوى' : 'Complaint'}</span>
                    <span className="text-sm font-semibold text-nova-text">{booking.complaint}</span>
                  </div>
                )}
                {booking.notes && (
                  <div className="flex justify-between">
                    <span className="text-sm text-nova-text-muted">{language === 'ar' ? 'ملاحظات' : 'Notes'}</span>
                    <span className="text-sm font-semibold text-nova-text">{booking.notes}</span>
                  </div>
                )}
              </div>
              <div className="rounded-lg border-2 border-dashed border-nova-border bg-amber-50/50 p-3">
                <p className="text-center text-xs text-amber-700">
                  💰 {language === 'ar' ? 'الدفع يُدفع عند وصولك إلى العيادة' : 'Payment is made at the clinic cashier'}
                </p>
              </div>
            </div>
          )}

          {/* Step 7: Confirm */}
          {booking.step === 7 && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-nova-text">
                {language === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}
              </h2>
              <p className="text-nova-text-secondary">
                {language === 'ar' ? 'هل أنت متأكد من حجز الموعد التالي؟' : 'Are you sure you want to book this appointment?'}
              </p>
              <div className="rounded-lg bg-nova-muted/30 p-4 text-left">
                {[
                  { label: language === 'ar' ? 'الخدمة' : 'Service', value: (serviceArMap[booking.serviceName]?.name ?? booking.serviceName) },
                  { label: language === 'ar' ? 'الطبيب' : 'Dentist', value: booking.dentistName || 'أي طبيب متاح' },
                  { label: language === 'ar' ? 'التاريخ' : 'Date', value: formattedDate },
                  { label: language === 'ar' ? 'الوقت' : 'Time', value: booking.time ? formatTimeAr(booking.time) : '' },
                  { label: language === 'ar' ? 'الاسم' : 'Name', value: booking.patientName },
                ].map((item, index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-sm text-nova-text-muted">{item.label}</span>
                    <span className="text-sm font-semibold text-nova-text">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" onClick={handleBack} disabled={booking.step === 1}>
              {language === 'ar' ? 'رجوع' : 'Back'}
            </Button>
            {booking.step < 7 ? (
              <Button onClick={handleNext}>
                {booking.step === 6 ? 'تأكيد البيانات' : 'التالي'}
              </Button>
            ) : (
              <Button onClick={handleSubmitBooking} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                {submitting
                  ? language === 'ar'
                    ? 'جارٍ الحجز...'
                    : 'Booking...'
                  : language === 'ar'
                    ? 'تأكيد الحجز'
                    : 'Confirm Booking'}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}