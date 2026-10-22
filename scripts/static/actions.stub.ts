/**
 * Stub for `src/app/actions.ts` used by the **static** build (GitHub Pages).
 *
 * The static export has no server, so Server Actions cannot exist. This module
 * keeps the exact same public surface so the public pages compile untouched,
 * and reproduces the demo behaviour:
 * - catalog/slots return `ok: false` → the booking wizard falls back to the
 *   bundled demo data (same as the deployed demo without Supabase);
 * - `bookAppointment` simulates a successful booking and flags `demo: true`,
 *   which the success page already renders as a clear notice;
 * - staff-only helpers return "not available" (the staff routes are removed
 *   from the static build).
 *
 * `scripts/build-static-site.mjs` copies this file over `src/app/actions.ts`
 * inside the temporary build directory. It is never shipped to Vercel.
 */

import type {
  Appointment,
  DentalSession,
  Dentist,
  Notification,
  Patient,
  Schedule,
  Service,
} from '@/lib/supabase/types';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type StaffRole = 'doctor' | 'secretary' | 'admin';

export interface SessionUser {
  id: string;
  email: string;
  role: StaffRole | 'patient' | null;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phone?: string;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
}

export interface BookAppointmentInput {
  serviceId: string;
  dentistId: string;
  date: string;
  startTime: string;
  patient: { firstName: string; lastName: string; email: string; phone: string };
  treatmentType?: string;
  notes?: string;
}

const STATIC_DEMO_ERROR =
  'Static demo build: data comes from the bundled demo dataset (no server).';

const staffUnavailable = (): ActionResult<never> => ({ ok: false, error: STATIC_DEMO_ERROR });

// --- public ---------------------------------------------------------------

export async function checkSupabaseServer(): Promise<{ configured: boolean; reachable: boolean }> {
  return { configured: false, reachable: false };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return null;
}

export async function getPublicCatalog(): Promise<ActionResult<{ services: Service[]; dentists: Dentist[] }>> {
  return { ok: false, error: STATIC_DEMO_ERROR };
}

export async function getDoctorAvailability(_dentistId: string): Promise<ActionResult<Schedule[]>> {
  return { ok: false, error: STATIC_DEMO_ERROR };
}

export async function getAvailableSlots(
  _dentistId: string,
  _serviceId: string,
  _date: string
): Promise<ActionResult<AvailableSlot[]>> {
  return { ok: false, error: STATIC_DEMO_ERROR };
}

export async function bookAppointment(
  input: BookAppointmentInput
): Promise<ActionResult<{ appointmentId: string; demo?: boolean }>> {
  if (!input.serviceId || !input.dentistId || !input.date || !input.startTime) {
    return { ok: false, error: 'بيانات الحجز ناقصة.' };
  }
  if (!input.patient.email?.includes('@')) {
    return { ok: false, error: 'بريد إلكتروني غير صحيح.' };
  }
  if (!input.patient.firstName || !input.patient.phone) {
    return { ok: false, error: 'الاسم ورقم الهاتف مطلوبان.' };
  }
  return { ok: true, data: { appointmentId: `static-${Date.now().toString(36)}`, demo: true } };
}

// --- staff (not part of the static build) ---------------------------------

export async function fetchAppointments(..._args: unknown[]): Promise<ActionResult<Appointment[]>> {
  return staffUnavailable();
}

export async function fetchAppointment(..._args: unknown[]): Promise<ActionResult<Appointment>> {
  return staffUnavailable();
}

export async function fetchAppointmentHistory(..._args: unknown[]): Promise<ActionResult<never[]>> {
  return staffUnavailable();
}

export async function createStaffAppointment(..._args: unknown[]): Promise<ActionResult<Appointment>> {
  return staffUnavailable();
}

export async function updateAppointmentStatus(..._args: unknown[]): Promise<ActionResult<Appointment>> {
  return staffUnavailable();
}

export async function fetchPatients(..._args: unknown[]): Promise<ActionResult<Patient[]>> {
  return staffUnavailable();
}

export async function fetchDentists(..._args: unknown[]): Promise<ActionResult<Dentist[]>> {
  return staffUnavailable();
}

export async function getMyDentist(..._args: unknown[]): Promise<ActionResult<Dentist | null>> {
  return staffUnavailable();
}

export async function fetchSchedules(..._args: unknown[]): Promise<ActionResult<Schedule[]>> {
  return staffUnavailable();
}

export async function fetchSessions(..._args: unknown[]): Promise<ActionResult<DentalSession[]>> {
  return staffUnavailable();
}

export async function startLiveSession(..._args: unknown[]): Promise<ActionResult<DentalSession>> {
  return staffUnavailable();
}

export async function endLiveSession(..._args: unknown[]): Promise<ActionResult<DentalSession>> {
  return staffUnavailable();
}

export async function fetchNotifications(..._args: unknown[]): Promise<ActionResult<{ list: Notification[]; unread: number }>> {
  return staffUnavailable();
}

export async function markNotificationRead(..._args: unknown[]): Promise<ActionResult<null>> {
  return staffUnavailable();
}

export async function markAllNotificationsRead(..._args: unknown[]): Promise<ActionResult<null>> {
  return staffUnavailable();
}

export async function dismissNotification(..._args: unknown[]): Promise<ActionResult<null>> {
  return staffUnavailable();
}
