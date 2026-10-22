import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge Tailwind CSS classes with conflict resolution
 * Uses tailwind-merge to prevent class conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Base path the app is served from (`/nova-dental` on GitHub Pages, empty on
 * Vercel/localhost). Next.js prefixes routes/assets automatically, but plain
 * string paths passed to `next/image` or metadata do not get prefixed.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Prefix a public asset path with the deployment base path. */
export function assetPath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}

/**
 * Format a date for display based on locale
 */
export function formatDate(
  date: string | Date,
  locale: 'en' | 'ar' = 'en',
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  // ar-EG keeps Gregorian dates in Arabic (ar-SA would switch to Hijri).
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', defaultOptions).format(d);
}

/**
 * Format a date for input (YYYY-MM-DD)
 */
export function formatDateInput(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format time (HH:MM)
 */
export function formatTime(time: string): string {
  if (!time || typeof time !== 'string') return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const [hours, minutes] = parts;
  const h = parseInt(hours, 10);
  if (Number.isNaN(h) || h < 0 || h > 23) return time;
  if (!/^\d{1,2}$/.test(minutes)) return time;
  const m = parseInt(minutes, 10);
  if (m < 0 || m > 59) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Format currency based on locale
 */
export function formatCurrency(amount: number, currency: string = 'EGP', locale: 'en' | 'ar' = 'en'): string {
  // `-u-nu-latn` keeps Latin digits so prices match the rest of the UI
  // (durations, dates and times all use Latin digits).
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Price label used across the public site (Arabic-first).
 * Falls back to the currency code when Intl is unavailable.
 */
export function formatPrice(amount: number | null | undefined, currency: string = 'EGP', locale: 'en' | 'ar' = 'ar'): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    return formatCurrency(Number(amount), currency || 'EGP', locale);
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * Format time as Arabic 12-hour label, e.g. "9:30 ص".
 */
export function formatTimeAr(time: string): string {
  return formatTime(time).replace('AM', 'ص').replace('PM', 'م');
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text == null) return '';
  const str = typeof text === 'string' ? text : String(text);
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Check if a string is Arabic
 */
export function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Get text direction based on content
 */
export function getDirection(text: string): 'ltr' | 'rtl' {
  return isArabic(text) ? 'rtl' : 'ltr';
}

/**
 * Safe DOM access
 */
export function safeQuerySelector<T extends Element>(selector: string): T | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<T>(selector);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  const f = (firstName ?? '').trim().charAt(0) || '';
  const l = (lastName ?? '').trim().charAt(0) || '';
  return `${f}${l}`.toUpperCase();
}

/**
 * Status badge configuration
 */
export const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  confirmed: { bg: '#DCFCE7', text: '#166534', dot: '#16A34A', label: 'Confirmed' },
  pending: { bg: '#FEF3C7', text: '#92400E', dot: '#D97706', label: 'Pending' },
  'in-progress': { bg: '#E0F2FE', text: '#075985', dot: '#0EA5E9', label: 'In Progress' },
  completed: { bg: '#D1FAE5', text: '#065F46', dot: '#16A34A', label: 'Completed' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626', label: 'Cancelled' },
  'no-show': { bg: '#F1F5F9', text: '#475569', dot: '#64748B', label: 'No Show' },
  rescheduled: { bg: '#EDE9FE', text: '#5B21B6', dot: '#8B5CF6', label: 'Rescheduled' },
  waiting: { bg: '#FEF3C7', text: '#92400E', dot: '#D97706', label: 'Waiting' },
  delayed: { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626', label: 'Delayed' },
  urgent: { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626', label: 'Urgent' },
  vip: { bg: '#FFF7ED', text: '#9A3412', dot: '#FBBF24', label: 'VIP' },
};

/**
 * Check if running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get current locale from document
 */
export function getDocumentLocale(): 'en' | 'ar' {
  if (typeof document === 'undefined') return 'en';
  return document.documentElement.lang === 'ar' ? 'ar' : 'en';
}

/**
 * Storage utility with SSR safety
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key: string, value: unknown): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('localStorage write error:', e);
    }
  },
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage remove error:', e);
    }
  },
};
