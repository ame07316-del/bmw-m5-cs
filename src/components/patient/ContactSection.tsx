'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { notify } from '@/components/ui/Notification';
import { useRouter } from 'next/navigation';

// ===== صفحة تواصل معنا =====

const CLINIC = {
  phone: '+20 100 123 4567',
  phoneHref: 'tel:+201001234567',
  email: 'info@novadental.com',
  address: '٢٥ شارع الثورة، مصر الجديدة، القاهرة',
  hours: 'الأحد – الخميس: ٩:٠٠ ص – ٦:٠٠ م',
  hoursWeekend: 'الجمعة والسبت: مغلق',
};

interface ContactItem {
  title: string;
  value: string;
  href?: string;
  secondary?: string;
  ltr?: boolean;
  icon: React.ReactNode;
}

const contactItems: ContactItem[] = [
  {
    title: 'العنوان',
    value: CLINIC.address,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    title: 'الهاتف',
    value: CLINIC.phone,
    href: CLINIC.phoneHref,
    ltr: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    title: 'البريد الإلكتروني',
    value: CLINIC.email,
    href: `mailto:${CLINIC.email}`,
    ltr: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    title: 'مواعيد العمل',
    value: CLINIC.hours,
    secondary: CLINIC.hoursWeekend,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export function ContactSection() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      notify('error', 'حقول ناقصة', 'الاسم والبريد والرسالة مطلوبة.');
      return;
    }
    if (!formData.email.includes('@')) {
      notify('error', 'بريد غير صحيح', 'أدخل بريدًا إلكترونيًا صحيحًا.');
      return;
    }
    setSubmitting(true);
    // نموذج تجريبي: لا يوجد بريد فعلي مربوط بالموقع.
    // الرسالة تُحفظ في حالة الصفحة فقط، ونوضح ذلك للمستخدم بصراحة.
    setTimeout(() => {
      notify(
        'success',
        'تم استلام رسالتك',
        'هذا نموذج تجريبي ولا يتم إرسال بريد فعلي — للتواصل الفوري اتصل بالعيادة.'
      );
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setSubmitting(false);
    }, 400);
  };

  return (
    <section className="space-y-10">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-nova-text sm:text-4xl">تواصل معنا</h1>
        <p className="mt-3 text-nova-text-secondary">
          عندك سؤال قبل الحجز؟ اكتب لنا، أو اتصل بالعيادة مباشرة في مواعيد العمل.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {contactItems.map((item) => (
            <Card key={item.title}>
              <CardBody className="flex items-start gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-nova-primary-light text-nova-primary-dark">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-nova-text">{item.title}</p>
                  {item.href ? (
                    <a
                      href={item.href}
                      dir={item.ltr ? 'ltr' : undefined}
                      className="mt-0.5 inline-block text-sm text-nova-text-secondary transition-colors hover:text-nova-primary"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm text-nova-text-secondary">{item.value}</p>
                  )}
                  {item.secondary && (
                    <p className="mt-1 text-xs text-nova-text-muted">{item.secondary}</p>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}

          <Card className="border-nova-primary/30 bg-nova-primary-light/40">
            <CardBody className="p-5">
              <p className="text-sm font-bold text-nova-primary-dark">تحتاج موعد سريع؟</p>
              <p className="mt-1 text-sm text-nova-text-secondary">
                الحجز الأونلاين متاح على مدار اليوم، وتقدر تختار الخدمة والطبيب والوقت بنفسك.
              </p>
              <Button className="mt-3" onClick={() => router.push('/book')}>
                احجز موعدك أونلاين
              </Button>
            </CardBody>
          </Card>
        </div>

        <Card variant="elevated">
          <CardBody className="p-6">
            <h2 className="text-xl font-bold text-nova-text">أرسل رسالة</h2>
            <p className="mt-1 text-sm text-nova-text-muted">هنرد عليك في أقرب وقت داخل مواعيد العمل.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-nova-text">
                    الاسم الكامل <span className="text-nova-error">*</span>
                  </label>
                  <Input
                    id="contact-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="اكتب اسمك"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-nova-text">
                    البريد الإلكتروني <span className="text-nova-error">*</span>
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-phone" className="mb-1 block text-sm font-medium text-nova-text">
                    رقم الهاتف
                  </label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="mb-1 block text-sm font-medium text-nova-text">
                    الموضوع
                  </label>
                  <Input
                    id="contact-subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="موضوع الرسالة"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-nova-text">
                  رسالتك <span className="text-nova-error">*</span>
                </label>
                <Textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="اكتب رسالتك هنا..."
                  className="w-full"
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
              </Button>
              <p className="text-center text-xs text-nova-text-muted">
                نموذج تجريبي — الرسائل لا تُرسل إلى بريد خارجي.
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
