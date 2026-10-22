'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { services as allServices, dentists } from '@/data/demo';
import { formatPrice } from '@/lib/utils';
import { dentistDisplayName } from '@/lib/labels';

// ===== الصفحة الرئيسية — عربي بالكامل =====

export function HeroSection() {
  const router = useRouter();

  const stats = [
    { value: '+٢٠٠٠', label: 'مريض سعيد' },
    { value: '+٥٠٠', label: 'حالة علاجية' },
    { value: '٣', label: 'أطباء متخصصون' },
  ];

  return (
    <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <Badge variant="primary" className="mb-5 px-3 py-1.5 text-xs">
          ✦ عيادة أسنان متكاملة — القاهرة
        </Badge>

        <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-nova-text sm:text-5xl">
          ابتسامتك تستحق
          <span className="block text-nova-primary">العناية المثالية</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-nova-text-secondary">
          عيادة أسنان حديثة بفريق من الأطباء المتخصصين. خدمات شاملة تشمل الفحص الوقائي،
          تجميل الأسنان، التقويم، والجراحة — مع حجز أونلاين في أقل من دقيقة.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => router.push('/book')}>
            احجز موعدك الآن
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push('/services')}>
            تعرّف على الخدمات
          </Button>
        </div>

        <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-nova-border pt-6">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-nova-text-muted">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-bold text-nova-text">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-nova-border shadow-prominent">
          <Image
            src="/gallery/treatment-room.jpg"
            alt="غرفة علاج داخل عيادة نوفا لطب الأسنان"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="absolute -bottom-6 start-4 flex items-center gap-3 rounded-2xl border border-nova-border bg-nova-surface p-4 shadow-floating sm:start-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-nova-text">تعقيم بمعايير عالمية</p>
            <p className="text-xs text-nova-text-muted">أدوات معقّمة لكل مريض</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  const features = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3c-2.6 0-3.6 1.4-5 1.4S4 3.5 4 6.1c0 3.2 1.1 4.7 1.7 8.2.5 3 .9 6.3 2.4 6.3 1.5 0 1.3-3.3 2.2-5.2.5-1.2 1-1.9 1.7-1.9s1.2.7 1.7 1.9c.9 1.9.7 5.2 2.2 5.2 1.5 0 1.9-3.3 2.4-6.3C19 10.8 20 9.3 20 6.1c0-2.6-1.6-1.7-3-1.7S14.6 3 12 3Z" />
        </svg>
      ),
      title: 'أطباء متخصصون',
      description: 'فريق من أطباء الأسنان في تخصصات التقويم والجراحة والتجميل.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      title: 'حجز أونلاين سهل',
      description: 'اختار الخدمة والطبيب والوقت المناسب واحجز في خطوات بسيطة.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
        </svg>
      ),
      title: 'مواعيد بدون انتظار',
      description: 'جدول مواعيد منظم يقلل وقت الانتظار ويحترم وقتك.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: 'خصوصية وأمان',
      description: 'بياناتك وملفك الطبي محفوظان ولا يظهران لأي طرف خارجي.',
    },
  ];

  return (
    <section>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-nova-text sm:text-4xl">لماذا نوفا؟</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-nova-text-secondary">
          تجربة طب أسنان شاملة — من أول فحص لحد المتابعة — بأحدث التقنيات.
        </p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title} variant="interactive" className="p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-nova-primary-light text-nova-primary-dark">
              {feature.icon}
            </div>
            <h3 className="text-base font-bold text-nova-text">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-nova-text-secondary">{feature.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function ServicesPreviewSection() {
  const router = useRouter();
  const preview = allServices.slice(0, 3);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-nova-text sm:text-4xl">خدماتنا الأكثر طلبًا</h2>
          <p className="mt-3 max-w-xl text-nova-text-secondary">
            أسعار واضحة ومدة محددة لكل خدمة — الدفع عند العيادة بدون أي رسوم أونلاين.
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/services')}>
          كل الخدمات ←
        </Button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {preview.map((service) => (
          <Card key={service.id} variant="interactive" className="overflow-hidden p-0">
            <div className="h-1.5 bg-gradient-to-r from-nova-primary to-nova-secondary" />
            <CardBody className="p-6">
              <Badge variant="primary" className="mb-3">
                {service.categoryAr ?? service.category}
              </Badge>
              <h3 className="text-lg font-bold text-nova-text">{service.nameAr ?? service.name}</h3>
              <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-nova-text-secondary">
                {service.descriptionAr ?? service.description}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-nova-border pt-4">
                <div>
                  <p className="text-xs text-nova-text-muted">تبدأ من</p>
                  <p className="text-lg font-bold text-nova-primary">{formatPrice(service.price)}</p>
                </div>
                <div className="text-end">
                  <p className="text-xs text-nova-text-muted">المدة</p>
                  <p className="text-sm font-semibold text-nova-text">{service.durationMinutes} دقيقة</p>
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={() => router.push(`/book?service=${service.id}`)}>
                احجز هذه الخدمة
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function DoctorsPreviewSection() {
  const router = useRouter();

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-nova-text sm:text-4xl">تعرّف على أطبائنا</h2>
          <p className="mt-3 max-w-xl text-nova-text-secondary">
            فريق متخصص يغطي كل احتياجات أسنانك تحت سقف واحد.
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/doctors')}>
          كل الأطباء ←
        </Button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {dentists.map((dentist) => (
          <Card key={dentist.id} variant="interactive" className="p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-nova-primary-light text-xl font-bold text-nova-primary-dark">
              {(dentist.nameAr ?? `${dentist.firstName} ${dentist.lastName}`).trim().charAt(0)}
            </div>
            <h3 className="mt-4 text-base font-bold text-nova-text">
              {dentistDisplayName(dentist)}
            </h3>
            <p className="mt-1 text-sm text-nova-text-secondary">{dentist.specialtyAr ?? dentist.specialty}</p>
            <p className="mt-3 text-sm leading-relaxed text-nova-text-muted">{dentist.bioAr ?? dentist.bio}</p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => router.push(`/book?doctor=${dentist.id}`)}>
              احجز معه
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function CTASection() {
  const router = useRouter();

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-l from-nova-primary to-nova-primary-dark px-6 py-14 text-center sm:px-10">
      <h2 className="text-3xl font-bold text-white sm:text-4xl">جاهز لابتسامة مثالية؟</h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-nova-primary-light">
        احجز موعدك الآن ودع أطباءنا يضعون خطة العلاج المناسبة لك — الدفع عند العيادة.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" variant="gold" onClick={() => router.push('/book')}>
          احجز موعدك
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="border-white text-white hover:bg-white/10"
          onClick={() => router.push('/contact')}
        >
          تواصل معنا
        </Button>
      </div>
    </section>
  );
}
