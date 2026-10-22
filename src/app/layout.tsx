import { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { DemoDataProvider } from '@/components/layout/DemoDataProvider';
import { AppProvider } from '@/components/layout/AppProvider';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { LanguageProvider } from '@/components/layout/LanguageProvider';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { NotificationProvider } from '@/components/notifications';
import { NotificationContainer } from '@/components/ui/Notification';
import { SITE_URL } from '@/lib/site';

// نفس خطوط Google (Inter + Noto Naskh Arabic — رخصة OFL، ملفاتهم في src/fonts/)
// لكن self-hosted:
// 1) البناء لا يعتمد على الاتصال بـ fonts.googleapis.com (كان يفشل أوفلاين)
// 2) الخطوط تُطبَّق فعليًا عبر متغيرات --font-inter / --font-arabic الموصولة في tailwind.config.js
const inter = localFont({
  src: '../fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
});

const notoNaskhArabic = localFont({
  src: '../fonts/noto-naskh-arabic-arabic-wght-normal.woff2',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
  variable: '--font-arabic',
});

export const metadata: Metadata = {
  title: {
    default: 'NOVA Dental Studio — عيادة أسنان في القاهرة',
    template: '%s | NOVA Dental Studio',
  },
  description:
    'عيادة أسنان حديثة: فحص عام، تنظيف عميق، تبييض، تقويم، زراعة أسنان، وعلاج جذور — احجز موعدك أونلاين في دقيقة.',
  keywords: [
    'عيادة أسنان',
    'طب أسنان',
    'حجز موعد أسنان',
    'تقويم أسنان',
    'زراعة أسنان',
    'تبييض أسنان',
    'dental clinic',
    'dentist',
  ],
  authors: [{ name: 'NOVA Dental Studio' }],
  creator: 'NOVA Dental Studio',
  publisher: 'NOVA Dental Studio',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: SITE_URL,
    siteName: 'NOVA Dental Studio',
    title: 'NOVA Dental Studio — عيادة أسنان في القاهرة',
    description:
      'رعاية أسنان شاملة بأيدي أطباء متخصصين. احجز موعدك أونلاين بخطوات بسيطة.',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'NOVA Dental Studio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NOVA Dental Studio — عيادة أسنان',
    description: 'رعاية أسنان شاملة بأيدي أطباء متخصصين. احجز موعدك أونلاين.',
    images: ['/og.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0EA5E9' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1F3A' },
  ],
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html
        lang="ar"
        dir="rtl"
        suppressHydrationWarning
        className={`${inter.variable} ${notoNaskhArabic.variable}`}
      >
      <body className="min-h-screen bg-nova-bg font-body antialiased text-nova-text transition-colors duration-200">
        {/* Prevent RTL/LTR flash by setting direction before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var lang = localStorage.getItem('nova-language') || 'ar';
                  var dir = lang === 'ar' ? 'rtl' : 'ltr';
                  document.documentElement.setAttribute('dir', dir);
                  document.documentElement.setAttribute('lang', lang);
                } catch(e) {}
              })();
            `,
          }}
        />
        <AppProvider>
          <ThemeProvider>
            <LanguageProvider>
              <DemoDataProvider>
                <AuthProvider>
                  <NotificationProvider>
                    {children}
                    {/* Toasts must be mounted once globally so public pages and
                        the login screen can show feedback too. */}
                    <NotificationContainer />
                  </NotificationProvider>
                </AuthProvider>
              </DemoDataProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}
